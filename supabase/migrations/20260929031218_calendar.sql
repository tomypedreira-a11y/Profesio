-- =============================================================================
-- Profesio · Etapa 4: calendario y sesiones sueltas
-- - Agendar una sesión suelta (pacientes irregulares).
-- - Extender automáticamente los horarios fijos para que siempre haya
--   al menos 3 meses de sesiones generadas.
-- - Vista de sesiones con el nombre del paciente, para el calendario.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- generate_series_sessions: nuevo parámetro p_skip_conflicts.
-- Al crear un horario, un choque cancela todo (como antes).
-- Al extender un horario existente, las fechas que chocan con otra sesión
-- se saltean, para no bloquear la extensión del resto.
-- -----------------------------------------------------------------------------
drop function public.generate_series_sessions(uuid, date);

create function public.generate_series_sessions(
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

  step := case s.frequency when 'weekly' then 7 when 'biweekly' then 14 end;
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
-- Extiende los horarios fijos del psicólogo actual que tengan menos de
-- 3 meses de sesiones generadas, hasta 12 meses adelante.
-- La app la llama al abrir el calendario; si no hay nada que extender, no hace nada.
-- -----------------------------------------------------------------------------
create or replace function public.extend_series()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  s       record;
  today   date;
  created integer := 0;
begin
  for s in
    select ss.id, ss.timezone
      from public.session_series ss
      join public.patients p on p.id = ss.patient_id and p.active
     where ss.end_date is null
       and ss.generated_until < (now() at time zone ss.timezone)::date + interval '3 months'
  loop
    today := (now() at time zone s.timezone)::date;
    created := created + public.generate_series_sessions(s.id, (today + interval '12 months')::date, true);
  end loop;
  return created;
end;
$$;


-- -----------------------------------------------------------------------------
-- Agendar una sesión suelta: fecha y hora "de reloj" en la zona del psicólogo.
-- -----------------------------------------------------------------------------
create or replace function public.schedule_session(
  p_patient_id uuid,
  p_date       date,
  p_time       time
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
    insert into public.sessions (patient_id, starts_at)
    values (p_patient_id, (p_date + p_time) at time zone tz)
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'Ese horario se superpone con otra sesión.'
      using errcode = 'P0001', hint = 'schedule_conflict';
  end;

  return new_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- Sesiones con los datos del paciente, para el calendario y la lista.
-- -----------------------------------------------------------------------------
create view public.calendar_sessions
with (security_invoker = true) as
select
  s.id,
  s.patient_id,
  s.series_id,
  s.starts_at,
  s.ends_at,
  s.duration_minutes,
  s.status,
  s.rescheduled_from,
  p.first_name,
  p.last_name,
  p.phone
from public.sessions s
join public.patients p on p.id = s.patient_id;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.generate_series_sessions(uuid, date, boolean) from public, anon;
revoke execute on function public.extend_series() from public, anon;
revoke execute on function public.schedule_session(uuid, date, time) from public, anon;

grant execute on function public.generate_series_sessions(uuid, date, boolean) to authenticated;
grant execute on function public.extend_series() to authenticated;
grant execute on function public.schedule_session(uuid, date, time) to authenticated;

grant select on public.calendar_sessions to authenticated;