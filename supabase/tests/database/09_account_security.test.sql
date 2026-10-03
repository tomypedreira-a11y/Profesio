-- =============================================================================
-- Seguridad de la cuenta: preferencia de cierre por inactividad y políticas de MFA
-- (con un factor verificado, una sesión aal1 no ve ni modifica nada; con aal2, lo suyo; sin factores, igual que siempre).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- A tiene la verificación en dos pasos activada; B no.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at) values
  ('fac70000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Celular', 'totp', 'verified', now(), now()),
  -- Un factor sin verificar (enrolamiento abandonado) no activa nada.
  ('fac70000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'A medias', 'totp', 'unverified', now(), now());


-- -----------------------------------------------------------------------------
-- Preferencia de inactividad
-- -----------------------------------------------------------------------------
select is((select idle_timeout_minutes from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 240,
  'el cierre por inactividad arranca a las 4 horas');
select throws_ok(
  $$ update public.profiles set idle_timeout_minutes = 0 where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'no hay opción "nunca"'
);
select throws_ok(
  $$ update public.profiles set idle_timeout_minutes = 45 where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'solo 15, 30, 60, 120 o 240 minutos'
);


-- -----------------------------------------------------------------------------
-- A con aal2 (pasó el código): carga sus datos y los ve.
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal2"}';

select is(public.mfa_enabled(), true, 'A tiene la verificación en dos pasos activada');

insert into public.patients (id, first_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana');
select public.add_patient_schedules('aaaaaaaa-0000-0000-0000-000000000001',
  '[{"weekday": 1, "start_time": "10:00"}]'::jsonb);
insert into public.vacations (start_date, end_date) values (current_date + 400, current_date + 405);
insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.test/a', 'k', 's');

select is((select count(*)::int from public.profiles), 1, 'con aal2, A ve su perfil');
select is((select count(*)::int from public.patients), 1, 'con aal2, A ve sus pacientes');
select ok((select count(*) from public.sessions) > 0, 'con aal2, A ve sus sesiones');
select ok((select count(*) from public.audit_log) > 0, 'con aal2, A ve su registro de modificaciones');


-- -----------------------------------------------------------------------------
-- A con aal1 (solo la contraseña): no ve ni modifica nada.
-- -----------------------------------------------------------------------------
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}';

select is((select count(*)::int from public.profiles), 0, 'con aal1, A no ve su perfil');
select is((select count(*)::int from public.patients), 0, 'con aal1, A no ve sus pacientes');
select is((select count(*)::int from public.sessions), 0, 'con aal1, A no ve sus sesiones');
select is((select count(*)::int from public.session_series), 0, 'con aal1, A no ve sus horarios fijos');
select is((select count(*)::int from public.calendar_sessions), 0, 'con aal1, A no ve el calendario');
select is((select count(*)::int from public.vacations), 0, 'con aal1, A no ve sus vacaciones');
select is((select count(*)::int from public.push_subscriptions), 0, 'con aal1, A no ve sus dispositivos');
select is((select count(*)::int from public.audit_log), 0, 'con aal1, A no ve su registro de modificaciones');
select throws_ok(
  $$ insert into public.patients (first_name) values ('Intruso') $$,
  '42501', null, 'con aal1, A no crea pacientes'
);

-- Un JWT sin aal cuenta como aal1.
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is((select count(*)::int from public.patients), 0, 'sin aal en el JWT, A no ve sus pacientes');


-- -----------------------------------------------------------------------------
-- B, sin factores verificados: con aal1 todo sigue igual.
-- -----------------------------------------------------------------------------
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}';
insert into public.patients (first_name) values ('Bruno');
select is((select count(*)::int from public.patients), 1, 'sin factores, B ve y crea sus pacientes con aal1');


-- -----------------------------------------------------------------------------
-- El cron (service_role) no pasa por estas políticas.
-- -----------------------------------------------------------------------------
reset role;
set local role service_role;
select is((select count(*)::int from public.push_subscriptions), 1, 'service_role ve los dispositivos aunque A tenga MFA');

select * from finish();
rollback;
