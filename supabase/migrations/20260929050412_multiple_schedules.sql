-- =============================================================================
-- Profesio · Etapa 5: varios horarios fijos por paciente
-- - Un paciente puede tener varios horarios semanales (ej. martes y jueves 18:00).
-- - "Agregar sesión" suma horarios fijos sin tocar los que ya tiene.
-- - Crear/editar un paciente recibe la lista de horarios y, si es irregular,
--   opcionalmente una sesión suelta; todo en una sola operación.
-- Compatible con la versión anterior: create_patient, update_patient y
-- set_patient_schedule siguen existiendo sin cambios (se pueden quitar más adelante).
--
-- Formato de p_schedules (jsonb): [{"weekday": 2, "start_time": "18:00"}, ...]
-- weekday: 0 = domingo … 6 = sábado.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Suma horarios fijos a un paciente, sin tocar los que ya tiene.
-- Cada horario empieza en su próxima ocurrencia y genera 12 meses de sesiones.
-- Si ya tiene ese mismo horario vigente, no se duplica.
-- Si alguna sesión choca con otra, falla todo (no queda ningún horario a medias).
-- Devuelve la cantidad de horarios nuevos.
-- -----------------------------------------------------------------------------
create or replace function public.add_patient_schedules(p_patient_id uuid, p_schedules jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  tz         text;
  local_now  timestamp;
  today      date;
  slot       record;
  first_date date;
  new_id     uuid;
  added      integer := 0;
begin
  if p_schedules is null or jsonb_typeof(p_schedules) <> 'array' then
    raise exception 'Horarios inválidos.';
  end if;
  if jsonb_array_length(p_schedules) = 0 then
    return 0;
  end if;

  select timezone into tz from public.profiles where id = auth.uid();
  if tz is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id and active) then
    raise exception 'El paciente no existe o está archivado.';
  end if;

  local_now := now() at time zone tz;
  today := local_now::date;

  for slot in
    select distinct (e->>'weekday')::integer as weekday, (e->>'start_time')::time as start_time
      from jsonb_array_elements(p_schedules) e
  loop
    if slot.weekday is null or slot.weekday not between 0 and 6 or slot.start_time is null then
      raise exception 'Día u horario inválido.';
    end if;

    continue when exists (
      select 1 from public.session_series ss
       where ss.patient_id = p_patient_id
         and ss.end_date is null
         and extract(dow from ss.start_date)::integer = slot.weekday
         and ss.start_time = slot.start_time
    );

    -- Próxima ocurrencia del día y horario (hoy, si el horario todavía no pasó).
    first_date := today + ((slot.weekday - extract(dow from today)::integer + 7) % 7);
    if first_date = today and slot.start_time <= local_now::time then
      first_date := first_date + 7;
    end if;

    insert into public.session_series (patient_id, frequency, start_date, start_time, timezone)
    values (p_patient_id, 'weekly', first_date, slot.start_time, tz)
    returning id into new_id;

    perform public.generate_series_sessions(new_id, (today + interval '12 months')::date);
    added := added + 1;
  end loop;

  return added;
end;
$$;


-- -----------------------------------------------------------------------------
-- Deja al paciente exactamente con los horarios indicados (al editarlo).
-- - Los vigentes que siguen en la lista se conservan con sus sesiones.
-- - Los que se quitaron se cortan: se borran sus sesiones futuras sin informe.
-- - Los nuevos se agregan.
-- Lista vacía = paciente irregular.
-- -----------------------------------------------------------------------------
create or replace function public.replace_patient_schedules(p_patient_id uuid, p_schedules jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  old record;
begin
  if p_schedules is null or jsonb_typeof(p_schedules) <> 'array' then
    raise exception 'Horarios inválidos.';
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id) then
    raise exception 'El paciente no existe.';
  end if;

  for old in
    select ss.id
      from public.session_series ss
     where ss.patient_id = p_patient_id
       and ss.end_date is null
       and not exists (
         select 1 from jsonb_array_elements(p_schedules) e
          where (e->>'weekday')::integer = extract(dow from ss.start_date)::integer
            and (e->>'start_time')::time = ss.start_time
       )
  loop
    perform public.cut_series_from(old.id, now());
  end loop;

  perform public.add_patient_schedules(p_patient_id, p_schedules);
end;
$$;


-- -----------------------------------------------------------------------------
-- Crear un paciente con sus horarios fijos y/o una primera sesión suelta.
-- -----------------------------------------------------------------------------
create or replace function public.create_patient_with_schedules(
  p_first_name   text,
  p_last_name    text,
  p_phone        text    default null,
  p_dni          text    default null,
  p_email        text    default null,
  p_birth_date   date    default null,
  p_session_fee  numeric default null,
  p_schedules    jsonb   default '[]',
  p_session_date date    default null,
  p_session_time time    default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if (p_session_date is null) <> (p_session_time is null) then
    raise exception 'Elegí la fecha y el horario de la sesión.';
  end if;

  insert into public.patients (first_name, last_name, phone, dni, email, birth_date, session_fee)
  values (p_first_name, p_last_name, p_phone, p_dni, p_email, p_birth_date, p_session_fee)
  returning id into new_id;

  perform public.add_patient_schedules(new_id, coalesce(p_schedules, '[]'));

  if p_session_date is not null then
    perform public.schedule_session(new_id, p_session_date, p_session_time);
  end if;

  return new_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- Editar un paciente, sus horarios fijos y, opcionalmente, agendar una sesión suelta.
-- -----------------------------------------------------------------------------
create or replace function public.update_patient_with_schedules(
  p_patient_id   uuid,
  p_first_name   text,
  p_last_name    text,
  p_phone        text    default null,
  p_dni          text    default null,
  p_email        text    default null,
  p_birth_date   date    default null,
  p_session_fee  numeric default null,
  p_schedules    jsonb   default '[]',
  p_session_date date    default null,
  p_session_time time    default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if (p_session_date is null) <> (p_session_time is null) then
    raise exception 'Elegí la fecha y el horario de la sesión.';
  end if;

  update public.patients
     set first_name  = p_first_name,
         last_name   = p_last_name,
         phone       = p_phone,
         dni         = p_dni,
         email       = p_email,
         birth_date  = p_birth_date,
         session_fee = p_session_fee
   where id = p_patient_id;

  if not found then
    raise exception 'El paciente no existe.';
  end if;

  perform public.replace_patient_schedules(p_patient_id, coalesce(p_schedules, '[]'));

  if p_session_date is not null then
    perform public.schedule_session(p_patient_id, p_session_date, p_session_time);
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- patient_list suma todos los horarios fijos vigentes, ordenados de lunes a domingo.
-- weekday / start_time se mantienen (el más reciente) por compatibilidad.
-- -----------------------------------------------------------------------------
create or replace view public.patient_list
with (security_invoker = true) as
select
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.dni,
  p.email,
  p.birth_date,
  p.session_fee,
  p.active,
  p.created_at,
  sch.weekday,
  sch.start_time,
  (select max(s.starts_at) from public.sessions s
    where s.patient_id = p.id and s.status = 'scheduled' and s.starts_at <= now()) as last_session_at,
  (select min(s.starts_at) from public.sessions s
    where s.patient_id = p.id and s.status = 'scheduled' and s.starts_at > now())  as next_session_at,
  (select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'weekday',    extract(dow from ss.start_date)::integer,
                'start_time', to_char(ss.start_time, 'HH24:MI'))
              order by (extract(dow from ss.start_date)::integer + 6) % 7, ss.start_time),
            '[]'::jsonb)
     from public.session_series ss
    where ss.patient_id = p.id and ss.end_date is null) as schedules
from public.patients p
left join lateral (
  select extract(dow from ss.start_date)::integer as weekday, ss.start_time
    from public.session_series ss
   where ss.patient_id = p.id and ss.end_date is null
   order by ss.created_at desc
   limit 1
) sch on true;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.add_patient_schedules(uuid, jsonb) from public, anon;
revoke execute on function public.replace_patient_schedules(uuid, jsonb) from public, anon;
revoke execute on function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time) from public, anon;
revoke execute on function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time) from public, anon;

grant execute on function public.add_patient_schedules(uuid, jsonb) to authenticated;
grant execute on function public.replace_patient_schedules(uuid, jsonb) to authenticated;
grant execute on function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time) to authenticated;
grant execute on function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time) to authenticated;

grant select on public.patient_list to authenticated;
