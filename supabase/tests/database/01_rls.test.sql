-- =============================================================================
-- Aislamiento entre psicólogos (RLS): cada uno ve y modifica solo lo suyo.
-- Cada archivo corre en una transacción que se descarta al final (rollback).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- Dos psicólogos de prueba (el trigger crea sus perfiles).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');

-- Psicólogo A: un paciente, una sesión y unas vacaciones.
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana');
insert into public.sessions (id, patient_id, starts_at)
values ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
        (current_date + 7 + time '10:00') at time zone 'America/Argentina/Buenos_Aires');
insert into public.vacations (id, start_date, end_date)
values ('7ac00000-0000-0000-0000-000000000001', current_date + 60, current_date + 65);

select is((select count(*)::int from public.patients), 1, 'A ve su paciente');

-- Psicólogo B: no ve ni toca nada de A.
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is((select count(*)::int from public.patients), 0, 'B no ve los pacientes de A');
select is((select count(*)::int from public.sessions), 0, 'B no ve las sesiones de A');
select is((select count(*)::int from public.calendar_sessions), 0, 'B no ve las sesiones de A en el calendario');
select is((select count(*)::int from public.vacations), 0, 'B no ve las vacaciones de A');
select is((select count(*)::int from public.audit_log), 0, 'B no ve el registro de modificaciones de A');

update public.patients set first_name = 'Cambiado' where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select throws_ok(
  $$ select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000001', current_date + 8, '10:00') $$,
  'P0001', 'El paciente no existe o está archivado.',
  'B no puede agendar una sesión a un paciente de A'
);
select throws_ok(
  $$ insert into public.sessions (patient_id, starts_at) values ('aaaaaaaa-0000-0000-0000-000000000001', now() + interval '9 days') $$,
  '23503', null,
  'B no puede vincular una sesión suya a un paciente de A (FK compuesta)'
);
select throws_ok(
  $$ insert into public.patients (psychologist_id, first_name) values ('11111111-1111-1111-1111-111111111111', 'Intruso') $$,
  '42501', null,
  'B no puede crear filas a nombre de A'
);
select throws_ok(
  $$ select public.set_session_modality('5e550000-0000-0000-0000-000000000001', 'virtual') $$,
  'P0001', 'La sesión no existe.',
  'B no puede cambiar la modalidad de una sesión de A'
);
select throws_ok(
  $$ select public.remove_vacation('7ac00000-0000-0000-0000-000000000001') $$,
  'P0001', 'Esas vacaciones no existen.',
  'B no puede quitar las vacaciones de A'
);
select is(
  public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000001'::uuid], 'cash'),
  0,
  'B no puede cobrar una sesión de A (no la encuentra)'
);

-- De vuelta en A: lo que intentó B no tuvo efecto.
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  (select first_name from public.patients where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Ana',
  'el paciente de A no cambió'
);

-- Sin sesión iniciada no se accede a nada: RLS no le muestra filas ni le deja escribir.
-- (Que además no tenga permisos sobre las tablas depende de la configuración del proyecto.)
set local role anon;
select is((select count(*)::int from public.patients), 0, 'el rol anónimo no ve pacientes');
select throws_ok(
  $$ insert into public.patients (psychologist_id, first_name) values ('11111111-1111-1111-1111-111111111111', 'Anónimo') $$,
  '42501', null,
  'el rol anónimo no crea pacientes'
);

select * from finish();
rollback;
