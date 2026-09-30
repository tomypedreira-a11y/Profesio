-- =============================================================================
-- Profesio · Frecuencia de los horarios fijos
-- - Un horario fijo se repite todas las semanas, semana por medio o cada 3 semanas
--   (session_series.frequency: 'weekly', 'biweekly' o 'triweekly').
-- - Cada horario de p_schedules puede traer "frequency" (por defecto 'weekly') y
--   "start_date": cualquier día de la semana en que va la primera sesión. Sin fecha,
--   arranca en la semana actual (la próxima ocurrencia, como hasta ahora).
-- - Un horario es el mismo si coinciden día, inicio, duración, frecuencia y ciclo
--   (las mismas semanas). Cambiar la frecuencia o la semana lo reemplaza.
-- =============================================================================


alter table public.session_series
  drop constraint session_series_frequency_check,
  add constraint session_series_frequency_check
    check (frequency in ('weekly', 'biweekly', 'triweekly'));


-- -----------------------------------------------------------------------------
-- Semanas entre sesiones de cada frecuencia (null si la frecuencia no existe).
-- -----------------------------------------------------------------------------
create function public.frequency_weeks(p_frequency text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_frequency when 'weekly' then 1 when 'biweekly' then 2 when 'triweekly' then 3 end;
$$;


-- -----------------------------------------------------------------------------
-- Si dos fechas caen en el mismo ciclo: sus semanas (de lunes a domingo) están
-- separadas por un múltiplo de p_weeks. Con frecuencia semanal, siempre.
-- -----------------------------------------------------------------------------
create function public.same_series_cycle(p_a date, p_b date, p_weeks integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (((p_a - (extract(isodow from p_a)::integer - 1))
         - (p_b - (extract(isodow from p_b)::integer - 1))) / 7) % p_weeks = 0;
$$;


-- -----------------------------------------------------------------------------
-- Generar sesiones: el paso sale de la frecuencia (ahora también cada 3 semanas).
-- -----------------------------------------------------------------------------
create or replace function public.generate_series_sessions(
  p_series_id      uuid,
  p_until          date,
  p_skip_conflicts boolean default false
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  s        public.session_series%rowtype;
  step     integer;
  d        date;
  last_day date;
  created  integer := 0;
  n        integer;
begin
  select * into s from public.session_series where id = p_series_id;
  if not found then
    raise exception 'La serie no existe.';
  end if;

  step := 7 * public.frequency_weeks(s.frequency);
  last_day := least(p_until, coalesce(s.end_date, p_until));
  d := s.start_date;

  while d <= last_day loop
    begin
      insert into public.sessions
        (psychologist_id, patient_id, series_id, series_occurrence, starts_at, duration_minutes)
      values
        (s.psychologist_id, s.patient_id, s.id, d,
         (d + s.start_time) at time zone s.timezone, s.duration_minutes)
      on conflict (series_id, series_occurrence) do nothing;
      get diagnostics n = row_count;
      created := created + n;
    exception when exclusion_violation then
      if not p_skip_conflicts then
        raise exception 'El horario se superpone con otra sesión el %.', to_char(d, 'DD/MM/YYYY')
          using errcode = 'P0001', hint = 'schedule_conflict';
      end if;
    end;
    d := d + step;
  end loop;

  update public.session_series
     set generated_until = greatest(coalesce(generated_until, last_day), last_day)
   where id = s.id;

  return created;
end;
$$;


-- -----------------------------------------------------------------------------
-- Sumar horarios fijos, con frecuencia y semana de la primera sesión.
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
  weeks        integer;
  base         date;
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
           coalesce(public.session_duration((e->>'start_time')::time, (e->>'end_time')::time), default_mins) as duration,
           coalesce(e->>'frequency', 'weekly') as frequency,
           (e->>'start_date')::date as start_date
      from jsonb_array_elements(p_schedules) e
  loop
    if slot.weekday is null or slot.weekday not between 0 and 6 or slot.start_time is null then
      raise exception 'Día u horario inválido.';
    end if;

    weeks := public.frequency_weeks(slot.frequency);
    if weeks is null then
      raise exception 'Frecuencia inválida.';
    end if;

    continue when exists (
      select 1 from public.session_series ss
       where ss.patient_id = p_patient_id
         and ss.end_date is null
         and extract(dow from ss.start_date)::integer = slot.weekday
         and ss.start_time = slot.start_time
         and ss.duration_minutes = slot.duration
         and ss.frequency = slot.frequency
         and (slot.start_date is null or public.same_series_cycle(slot.start_date, ss.start_date, weeks))
    );

    -- El día elegido en la semana de start_date (o en la actual). Si ya pasó, se avanza
    -- de a un ciclo entero, para no correr las sesiones a otra semana.
    base := coalesce(slot.start_date, today);
    first_date := base - (extract(isodow from base)::integer - 1) + (slot.weekday + 6) % 7;
    while first_date < today or (first_date = today and slot.start_time <= local_now::time) loop
      first_date := first_date + 7 * weeks;
    end loop;

    insert into public.session_series (patient_id, frequency, start_date, start_time, duration_minutes, timezone)
    values (p_patient_id, slot.frequency, first_date, slot.start_time, slot.duration, tz)
    returning id into new_id;

    perform public.generate_series_sessions(new_id, (today + interval '12 months')::date);
    added := added + 1;
  end loop;

  return added;
end;
$$;


-- -----------------------------------------------------------------------------
-- Dejar al paciente con exactamente estos horarios. Un horario con otra
-- frecuencia u otro ciclo reemplaza al vigente.
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
            and coalesce(e->>'frequency', 'weekly') = ss.frequency
            and (e->>'start_date' is null
                 or public.same_series_cycle((e->>'start_date')::date, ss.start_date, public.frequency_weeks(ss.frequency)))
       )
  loop
    perform public.cut_series_from(old.id, now());
  end loop;

  perform public.add_patient_schedules(p_patient_id, p_schedules);
end;
$$;


-- -----------------------------------------------------------------------------
-- patient_list.schedules suma la frecuencia y la fecha de inicio de cada horario
-- (con esa fecha la interfaz calcula en qué semanas caen).
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
                'end_time',   to_char(ss.start_time + make_interval(mins => ss.duration_minutes), 'HH24:MI'),
                'frequency',  ss.frequency,
                'start_date', to_char(ss.start_date, 'YYYY-MM-DD'))
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
-- Permisos (las funciones reemplazadas y la vista conservan los suyos)
-- -----------------------------------------------------------------------------
revoke execute on function public.frequency_weeks(text) from public, anon;
revoke execute on function public.same_series_cycle(date, date, integer) from public, anon;

grant execute on function public.frequency_weeks(text) to authenticated;
grant execute on function public.same_series_cycle(date, date, integer) to authenticated;
