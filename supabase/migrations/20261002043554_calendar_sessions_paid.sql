-- =============================================================================
-- Calendario: si la sesión está cobrada, para marcar las realizadas sin cobrar.
-- paid_at va al final: create or replace view no permite cambiar el orden de las columnas.
-- =============================================================================
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
  (ss.id is not null and ss.end_date is null) as series_active,
  coalesce(s.modality, p.modality) as modality,
  s.paid_at
from public.sessions s
join public.patients p on p.id = s.patient_id
left join public.session_series ss on ss.id = s.series_id;
