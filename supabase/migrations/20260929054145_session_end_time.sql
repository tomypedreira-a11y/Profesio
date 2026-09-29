-- =============================================================================
-- Profesio · Etapa 5: duración de la sesión configurable (inicio y fin)
-- - Agendar, reprogramar y los horarios fijos reciben la hora de fin.
-- - Las funciones que ya usaba la app (schedule_session, reschedule_session,
--   reschedule_series_from) reciben el fin como parámetro opcional: sin él,
--   se comportan como antes (45 minutos al agendar; misma duración al reprogramar).
-- - En p_schedules, cada horario puede traer "end_time" (sin él, 45 minutos).
--   patient_list.schedules devuelve también "end_time".
-- Una sesión no cruza la medianoche: el fin tiene que ser posterior al inicio.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Duración en minutos entre dos horas "de reloj". null si no hay fin.
-- -----------------------------------------------------------------------------
create or replace function public.session_duration(p_start time, p_end time)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_end is null then
    return null;
  end if;
  if p_start is null or p_end <= p_start then
    raise exception 'El fin de la sesión tiene que ser posterior al inicio.';
  end if;
  return (extract(epoch from (p_end - p_start)) / 60)::integer;
end;
$$;


-- -----------------------------------------------------------------------------
-- Agendar una sesión suelta, con inicio y fin.
-- -----------------------------------------------------------------------------
drop function public.schedule_session(uuid, date, time);

create function public.schedule_session(
  p_patient_id uuid,
  p_date       date,
  p_time       time,
  p_end_time   time default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  tz     text;
  new_id uuid;
begin
  select timezone into tz from public.profiles where id = auth.uid();
  if tz is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id and active) then
    raise exception 'El paciente no existe o está archivado.';
  end if;

  begin
    insert into public.sessions (patient_id, starts_at, duration_minutes)
    values (p_patient_id, (p_date + p_time) at time zone tz,
            coalesce(public.session_duration(p_time, p_end_time), 45))
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'Ese horario se superpone con otra sesión.'
      using errcode = 'P0001', hint = 'schedule_conflict';
  end;

  return new_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- Reprogramar una sesión (solo esta). Sin fin, conserva la duración.
-- -----------------------------------------------------------------------------
drop function public.reschedule_session(uuid, date, time);

create function public.reschedule_session(
  p_session_id uuid,
  p_date       date,
  p_time       time,
  p_end_time   time default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  tz       text;
  duration integer := public.session_duration(p_time, p_end_time);
begin
  select timezone into tz from public.profiles where id = auth.uid();

  begin
    update public.sessions
       set starts_at        = (p_date + p_time) at time zone tz,
           duration_minutes = coalesce(duration, duration_minutes)
     where id = p_session_id and status = 'scheduled';
  exception when exclusion_violation then
    raise exception 'Ese horario se superpone con otra sesión.'
      using errcode = 'P0001', hint = 'schedule_conflict';
  end;

  if not found then
    raise exception 'La sesión no existe o está cancelada.';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- Reprogramar esta y las siguientes. Sin fin, conserva la duración del horario fijo.
-- -----------------------------------------------------------------------------
drop function public.reschedule_series_from(uuid, date, time);

create function public.reschedule_series_from(
  p_session_id uuid,
  p_date       date,
  p_time       time,
  p_end_time   time default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  tz       text;
  sess     public.sessions%rowtype;
  ser      public.session_series%rowtype;
  today    date;
  new_id   uuid;
  duration integer := public.session_duration(p_time, p_end_time);
begin
  select timezone into tz from public.profiles where id = auth.uid();
  today := (now() at time zone tz)::date;

  select * into sess from public.sessions where id = p_session_id;
  if not found or sess.series_id is null then
    raise exception 'La sesión no pertenece a un horario fijo.';
  end if;

  select * into ser from public.session_series where id = sess.series_id;
  if ser.end_date is not null then
    raise exception 'El horario fijo de esta sesión ya no está vigente.';
  end if;

  if p_date < today then
    raise exception 'La nueva fecha no puede ser anterior a hoy.';
  end if;

  perform public.cut_series_from(ser.id, sess.starts_at);

  insert into public.session_series (patient_id, frequency, start_date, start_time, duration_minutes, timezone)
  values (sess.patient_id, ser.frequency, p_date, p_time, coalesce(duration, ser.duration_minutes), tz)
  returning id into new_id;

  -- Si algo choca, falla todo y no se modifica nada.
  perform public.generate_series_sessions(new_id, (today + interval '12 months')::date);
end;
$$;


-- -----------------------------------------------------------------------------
-- Sumar horarios fijos: ahora con fin. Un horario es el mismo si coinciden
-- día, inicio y duración.
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
    select distinct
           (e->>'weekday')::integer as weekday,
           (e->>'start_time')::time as start_time,
           coalesce(public.session_duration((e->>'start_time')::time, (e->>'end_time')::time), 45) as duration
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
         and ss.duration_minutes = slot.duration
    );

    -- Próxima ocurrencia del día y horario (hoy, si el horario todavía no pasó).
    first_date := today + ((slot.weekday - extract(dow from today)::integer + 7) % 7);
    if first_date = today and slot.start_time <= local_now::time then
      first_date := first_date + 7;
    end if;

    insert into public.session_series (patient_id, frequency, start_date, start_time, duration_minutes, timezone)
    values (p_patient_id, 'weekly', first_date, slot.start_time, slot.duration, tz)
    returning id into new_id;

    perform public.generate_series_sessions(new_id, (today + interval '12 months')::date);
    added := added + 1;
  end loop;

  return added;
end;
$$;


-- -----------------------------------------------------------------------------
-- Dejar al paciente con exactamente estos horarios. Cambiar el fin de un
-- horario lo reemplaza (se corta el anterior y se crea uno nuevo).
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
            and coalesce(public.session_duration((e->>'start_time')::time, (e->>'end_time')::time), 45) = ss.duration_minutes
       )
  loop
    perform public.cut_series_from(old.id, now());
  end loop;

  perform public.add_patient_schedules(p_patient_id, p_schedules);
end;
$$;


-- -----------------------------------------------------------------------------
-- Crear / editar paciente: la sesión suelta también recibe el fin.
-- (Estas funciones solo las usa esta etapa, así que se reemplazan.)
-- -----------------------------------------------------------------------------
drop function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time);
drop function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time);

create function public.create_patient_with_schedules(
  p_first_name       text,
  p_last_name        text,
  p_phone            text    default null,
  p_dni              text    default null,
  p_email            text    default null,
  p_birth_date       date    default null,
  p_session_fee      numeric default null,
  p_schedules        jsonb   default '[]',
  p_session_date     date    default null,
  p_session_time     time    default null,
  p_session_end_time time    default null
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
    perform public.schedule_session(new_id, p_session_date, p_session_time, p_session_end_time);
  end if;

  return new_id;
end;
$$;

create function public.update_patient_with_schedules(
  p_patient_id       uuid,
  p_first_name       text,
  p_last_name        text,
  p_phone            text    default null,
  p_dni              text    default null,
  p_email            text    default null,
  p_birth_date       date    default null,
  p_session_fee      numeric default null,
  p_schedules        jsonb   default '[]',
  p_session_date     date    default null,
  p_session_time     time    default null,
  p_session_end_time time    default null
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
    perform public.schedule_session(p_patient_id, p_session_date, p_session_time, p_session_end_time);
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- patient_list.schedules suma el fin de cada horario.
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
                'start_time', to_char(ss.start_time, 'HH24:MI'),
                'end_time',   to_char(ss.start_time + make_interval(mins => ss.duration_minutes), 'HH24:MI'))
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
revoke execute on function public.session_duration(time, time) from public, anon;
revoke execute on function public.schedule_session(uuid, date, time, time) from public, anon;
revoke execute on function public.reschedule_session(uuid, date, time, time) from public, anon;
revoke execute on function public.reschedule_series_from(uuid, date, time, time) from public, anon;
revoke execute on function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time, time) from public, anon;
revoke execute on function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time, time) from public, anon;

grant execute on function public.session_duration(time, time) to authenticated;
grant execute on function public.schedule_session(uuid, date, time, time) to authenticated;
grant execute on function public.reschedule_session(uuid, date, time, time) to authenticated;
grant execute on function public.reschedule_series_from(uuid, date, time, time) to authenticated;
grant execute on function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time, time) to authenticated;
grant execute on function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time, time) to authenticated;

grant select on public.patient_list to authenticated;
