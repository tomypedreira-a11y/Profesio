-- =============================================================================
-- Modalidad habitual del psicólogo: la que trae preseleccionada el alta de un paciente.
-- Presencial si no la cambia (también para las cuentas existentes). Al paciente se le
-- guarda la elegida en el formulario: cambiar esta preferencia no toca a los pacientes.
-- =============================================================================
alter table public.profiles
  add column default_modality text not null default 'in_person'
    check (default_modality in ('in_person', 'virtual'));
