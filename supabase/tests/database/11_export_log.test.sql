-- =============================================================================
-- Exportación del libro de sesiones (PDF): cada una queda en audit_log (quién, qué paciente, cuándo),
-- solo de pacientes propios, con la verificación en dos pasos si está activada, y nadie escribe el registro a mano.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- A tiene un paciente con dos sesiones: una con anotación finalizada (y una corrección en borrador) y otra
-- con un borrador. B tiene la verificación en dos pasos activada.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('fac70000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Celular', 'totp', 'verified', now(), now());

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana');
insert into public.sessions (id, patient_id, starts_at) values
  ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '14 days'),
  ('5e550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '7 days');
insert into public.session_notes (id, session_id, content, status) values
  ('0e000000-0000-0000-0000-000000000001', '5e550000-0000-0000-0000-000000000001', 'Finalizada', 'final'),
  ('0e000000-0000-0000-0000-000000000003', '5e550000-0000-0000-0000-000000000002', 'Borrador', 'draft');
insert into public.session_notes (session_id, content, supersedes_id) values
  ('5e550000-0000-0000-0000-000000000001', 'Corrección en borrador', '0e000000-0000-0000-0000-000000000001');


-- -----------------------------------------------------------------------------
-- A exporta el libro de su paciente: queda registrado.
-- -----------------------------------------------------------------------------
select lives_ok(
  $$ select public.log_patient_export('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'A registra la exportación de su paciente'
);

select results_eq(
  $$ select psychologist_id, actor_id, table_name, record_id, action
       from public.audit_log where action = 'EXPORT' $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid, '11111111-1111-1111-1111-111111111111'::uuid,
             'patients'::text, 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'EXPORT'::text) $$,
  'quién, qué paciente y la acción EXPORT'
);
select ok(
  (select created_at from public.audit_log where action = 'EXPORT') = now(),
  'cuándo: la fecha del servidor'
);
select is(
  (select new_data from public.audit_log where action = 'EXPORT'),
  '{"export": "libro_pdf", "notes": 1}'::jsonb,
  'dice qué se exportó y cuántas anotaciones finalizadas (sin borradores ni contenido)'
);


-- -----------------------------------------------------------------------------
-- Nadie escribe el registro a mano, ni lo cambia.
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.audit_log (psychologist_id, actor_id, table_name, record_id, action)
     values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'patients',
             'aaaaaaaa-0000-0000-0000-000000000001', 'EXPORT') $$,
  '42501', null,
  'no se puede insertar en audit_log a mano'
);
delete from public.audit_log where action = 'EXPORT';
select is((select count(*)::int from public.audit_log where action = 'EXPORT'), 1, 'ni borrar una exportación registrada');
select throws_ok(
  $$ select public.log_patient_export('aaaaaaaa-0000-0000-0000-00000000ffff') $$,
  'P0002', 'El paciente no existe.',
  'un paciente inexistente no se registra'
);


-- -----------------------------------------------------------------------------
-- B no puede registrar (ni ver) exportaciones de pacientes de A.
-- -----------------------------------------------------------------------------
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal2"}';

select throws_ok(
  $$ select public.log_patient_export('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0002', 'El paciente no existe.',
  'B no registra exportaciones de un paciente de A'
);
select is((select count(*)::int from public.audit_log where action = 'EXPORT'), 0, 'B no ve las exportaciones de A');

-- Con la verificación en dos pasos activada, una sesión aal1 no exporta (como las políticas restrictivas).
insert into public.patients (id, first_name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Beto');
select lives_ok(
  $$ select public.log_patient_export('bbbbbbbb-0000-0000-0000-000000000001') $$,
  'B con aal2 exporta su paciente'
);
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}';
select throws_ok(
  $$ select public.log_patient_export('bbbbbbbb-0000-0000-0000-000000000001') $$,
  '42501', 'Falta la verificación en dos pasos.',
  'B con aal1 (solo la contraseña) no exporta'
);


-- -----------------------------------------------------------------------------
-- Sin sesión, la función no se puede llamar.
-- -----------------------------------------------------------------------------
reset role;
select is(
  has_function_privilege('anon', 'public.log_patient_export(uuid)', 'execute'),
  false,
  'anon no puede llamarla'
);

select * from finish();
rollback;
