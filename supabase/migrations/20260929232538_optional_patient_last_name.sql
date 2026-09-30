-- =============================================================================
-- Profesio · Apellido del paciente opcional
-- Alcanza con el nombre para dar de alta un paciente. Sin apellido se guarda '' (no null),
-- así las vistas y las funciones que ya lo usan siguen igual.
-- =============================================================================

alter table public.patients
  drop constraint if exists patients_last_name_check,
  alter column last_name set default '';
