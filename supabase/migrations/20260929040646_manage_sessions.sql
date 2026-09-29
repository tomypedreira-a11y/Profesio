-- =============================================================================
-- Profesio · Etapa 5: reprogramar y cancelar sesiones
-- - Reprogramar "solo esta" o "esta y las siguientes" (cambia el horario fijo).
-- - Cancelar "solo esta" o "esta y las siguientes" (termina el horario fijo).
-- - Deshacer una cancelación.
-- Las sesiones con informe nunca se borran.
-- =============================================================================


-- La vista del calendario suma si la sesión pertenece a un horario fijo vigente.
create or replace view public.calendar_sessions
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
  p.phone,
  (ss.id is not null and ss.end_date is null) as series_active
from public.sessions s
join public.patients p on p.id = s.patient_id
left join public.session_series ss on ss.id = s.series_id;


-- -----------------------------------------------------------------------------
-- Auxiliar: corta un horario fijo a partir de una sesión (incluida).
-- Borra esa sesión y las siguientes de la serie que no tengan informe,
-- y cierra la serie. Si no le quedan sesiones, la borra.
-- -----------------------------------------------------------------------------
create or replace function public.cut_series_from(p_series_id uuid, p_from timestamptz)
returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.session_series%rowtype;
  last_kept date;
begin
  select * into s from public.session_series where id = p_series_id;
  if not found then
    raise exception 'El horario fijo no existe.';
  end if;

  delete from public.sessions ss
   where ss.series_id = s.id
     and ss.starts_at >= p_from
     and not exists (select 1 from public.session_notes n where n.session_id = ss.id);

  if not exists (select 1 from public.sessions where series_id = s.id) then
    delete from public.session_series where id = s.id;
    return;
  end if;

  -- La serie termina en la última fecha anterior al corte (o en su inicio).
  select max(series_occurrence) into last_kept
    from public.sessions
   where series_id = s.id and starts_at < p_from;

  update public.session_series
     set end_date = greatest(s.start_date, coalesce(last_kept, s.start_date))
   where id = s.id;
end;
$$;


-- -----------------------------------------------------------------------------
-- Reprogramar una sesión (solo esta). Mantiene su vínculo con la serie.
-- -----------------------------------------------------------------------------
create or replace function public.reschedule_session(p_session_id uuid, p_date date, p_time time)
returns void
language plpgsql
set search_path = ''
as $$
declare
  tz text;
begin
  select timezone into tz from public.profiles where id = auth.uid();

  begin
    update public.sessions
       set starts_at = (p_date + p_time) at time zone tz
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
-- Reprogramar esta y las siguientes: el horario fijo del paciente pasa a ser
-- el día de la semana y horario de la nueva fecha, empezando en esa fecha.
-- -----------------------------------------------------------------------------
create or replace function public.reschedule_series_from(p_session_id uuid, p_date date, p_time time)
returns void
language plpgsql
set search_path = ''
as $$
declare
  tz      text;
  sess    public.sessions%rowtype;
  ser     public.session_series%rowtype;
  today   date;
  new_id  uuid;
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

  insert into public.session_series (patient_id, frequency, start_date, start_time, timezone)
  values (sess.patient_id, ser.frequency, p_date, p_time, tz)
  returning id into new_id;

  -- Si algo choca, falla todo y no se modifica nada.
  perform public.generate_series_sessions(new_id, (today + interval '12 months')::date);
end;
$$;


-- -----------------------------------------------------------------------------
-- Cancelar esta y las siguientes: esta queda cancelada (como registro),
-- las siguientes sin informe se quitan y el paciente pasa a irregular.
-- -----------------------------------------------------------------------------
create or replace function public.cancel_series_from(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  sess public.sessions%rowtype;
begin
  select * into sess from public.sessions where id = p_session_id;
  if not found or sess.series_id is null then
    raise exception 'La sesión no pertenece a un horario fijo.';
  end if;

  update public.sessions set status = 'cancelled' where id = sess.id;
  perform public.cut_series_from(sess.series_id, sess.starts_at + interval '1 second');
end;
$$;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.cut_series_from(uuid, timestamptz) from public, anon;
revoke execute on function public.reschedule_session(uuid, date, time) from public, anon;
revoke execute on function public.reschedule_series_from(uuid, date, time) from public, anon;
revoke execute on function public.cancel_series_from(uuid) from public, anon;

grant execute on function public.cut_series_from(uuid, timestamptz) to authenticated;
grant execute on function public.reschedule_session(uuid, date, time) to authenticated;
grant execute on function public.reschedule_series_from(uuid, date, time) to authenticated;
grant execute on function public.cancel_series_from(uuid) to authenticated;