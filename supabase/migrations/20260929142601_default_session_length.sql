-- =============================================================================
-- Profesio · Duración habitual de las sesiones (en el perfil)
-- - profiles.default_session_minutes: 45, 50, 60, 75 o 90 minutos (por defecto 45).
-- - Al agendar sin hora de fin (sesión suelta u horario fijo), se usa esa duración
--   en lugar de los 45 minutos fijos. Reprogramar sin fin sigue conservando la duración.
-- =============================================================================


alter table public.profiles
  add column default_session_minutes smallint not null default 45
    check (default_session_minutes in (45, 50, 60, 75, 90));


-- -----------------------------------------------------------------------------
-- Duración habitual del psicólogo actual (45 si no hay perfil).
-- -----------------------------------------------------------------------------
create function public.default_session_minutes()
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select p.default_session_minutes from public.profiles p where p.id = auth.uid()),
    45
  );
$$;


-- -----------------------------------------------------------------------------
-- Agendar una sesión suelta: sin fin, dura lo habitual del perfil.
-- -----------------------------------------------------------------------------
create or replace function public.schedule_session(
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
            coalesce(public.session_duration(p_time, p_end_time), public.default_session_minutes()))
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'Ese horario se superpone con otra sesión.'
      using errcode = 'P0001', hint = 'schedule_conflict';
  end;

  return new_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- Sumar horarios fijos: un horario sin "end_time" dura lo habitual del perfil.
-- -----------------------------------------------------------------------------
create or replace function public.add_patient_schedules(p_patient_id uuid, p_schedules jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  tz           text;
  local_now    timestamp;
  today        date;
  default_mins integer := public.default_session_minutes();
  slot         record;
  first_date   date;
  new_id       uuid;
  added        integer := 0;
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
           coalesce(public.session_duration((e->>'start_time')::time, (e->>'end_time')::time), default_mins) as duration
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
-- Dejar al paciente con exactamente estos horarios (misma regla para el fin vacío).
-- -----------------------------------------------------------------------------
create or replace function public.replace_patient_schedules(p_patient_id uuid, p_schedules jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  default_mins integer := public.default_session_minutes();
  old          record;
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
            and coalesce(public.session_duration((e->>'start_time')::time, (e->>'end_time')::time), default_mins) = ss.duration_minutes
       )
  loop
    perform public.cut_series_from(old.id, now());
  end loop;

  perform public.add_patient_schedules(p_patient_id, p_schedules);
end;
$$;


-- -----------------------------------------------------------------------------
-- Permisos (las funciones reemplazadas conservan los suyos)
-- -----------------------------------------------------------------------------
revoke execute on function public.default_session_minutes() from public, anon;
grant execute on function public.default_session_minutes() to authenticated;
