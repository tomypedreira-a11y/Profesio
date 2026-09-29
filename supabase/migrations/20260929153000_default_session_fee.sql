-- =============================================================================
-- Profesio · Valor por sesión por defecto (en el perfil)
-- - profiles.default_session_fee: valor habitual de la sesión (opcional).
-- - Un paciente sin valor propio (patients.session_fee is null) usa este valor.
--   No se copia al paciente: si el psicólogo actualiza su valor, se aplica a todos
--   los pacientes que no tienen uno propio.
-- =============================================================================


alter table public.profiles
  add column default_session_fee numeric(12, 2)
    check (default_session_fee is null or default_session_fee >= 0);
