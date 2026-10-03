-- =============================================================================
-- Sesiones sin cargo: solo las realizadas sin cobrar; una sin cargo no se cobra,
-- cancela ni reprograma hasta volver a pendiente.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');
update public.profiles set default_session_fee = 1000;

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana');

-- s1 realizada, s2 futura, s3 en curso, s4 realizada y cancelada, s5 realizada y cobrada.
insert into public.sessions (id, patient_id, starts_at) values
  ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '7 days'),
  ('5e550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '7 days'),
  ('5e550000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '10 minutes'),
  ('5e550000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '14 days'),
  ('5e550000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '21 days');
update public.sessions set status = 'cancelled' where id = '5e550000-0000-0000-0000-000000000004';
select public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000005'::uuid], 'cash');

-- Solo una realizada (terminada, no cancelada) y sin cobrar.
select throws_ok(
  $$ select public.waive_session('5e550000-0000-0000-0000-000000000002') $$,
  'P0001', 'Solo se dejan sin cargo las sesiones que ya terminaron.',
  'una sesión futura no se deja sin cargo'
);
select throws_ok(
  $$ select public.waive_session('5e550000-0000-0000-0000-000000000003') $$,
  'P0001', 'Solo se dejan sin cargo las sesiones que ya terminaron.',
  'una sesión en curso no se deja sin cargo'
);
select throws_ok(
  $$ select public.waive_session('5e550000-0000-0000-0000-000000000004') $$,
  'P0001', 'Una sesión cancelada no se deja sin cargo.',
  'una sesión cancelada no se deja sin cargo'
);
select throws_ok(
  $$ select public.waive_session('5e550000-0000-0000-0000-000000000005') $$,
  'P0001', 'La sesión está cobrada: desmarcá el cobro antes de dejarla sin cargo.',
  'una sesión cobrada no se deja sin cargo'
);

select lives_ok(
  $$ select public.waive_session('5e550000-0000-0000-0000-000000000001') $$,
  'una sesión realizada sin cobrar se deja sin cargo'
);
select isnt(
  (select waived_at from public.session_payments where id = '5e550000-0000-0000-0000-000000000001'),
  null,
  'Ingresos ve la sesión sin cargo'
);
select isnt(
  (select waived_at from public.calendar_sessions where id = '5e550000-0000-0000-0000-000000000001'),
  null,
  'el calendario ve la sesión sin cargo'
);
select is(
  (select status from public.sessions where id = '5e550000-0000-0000-0000-000000000001'),
  'scheduled',
  'una sesión sin cargo sigue siendo realizada (no cancelada)'
);
select throws_ok(
  $$ select public.waive_session('5e550000-0000-0000-0000-000000000001') $$,
  'P0001', 'La sesión no existe o ya está sin cargo.',
  'no se deja sin cargo dos veces'
);

-- Mientras está sin cargo: no se cobra, cancela ni reprograma.
select throws_ok(
  $$ select public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000001'::uuid], 'cash') $$,
  'P0001', 'La sesión está sin cargo: volvela a pendiente antes de cobrarla.',
  'una sesión sin cargo no se cobra'
);
select throws_ok(
  $$ update public.sessions set status = 'cancelled' where id = '5e550000-0000-0000-0000-000000000001' $$,
  'P0001', 'La sesión está sin cargo: volvela a pendiente antes de cancelarla.',
  'una sesión sin cargo no se cancela'
);
select throws_ok(
  $$ update public.sessions set starts_at = starts_at + interval '1 day' where id = '5e550000-0000-0000-0000-000000000001' $$,
  'P0001', 'La sesión está sin cargo: volvela a pendiente antes de reprogramarla.',
  'una sesión sin cargo no se reprograma'
);

-- Otro psicólogo no la ve (RLS): ni la deja sin cargo ni la vuelve a pendiente.
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select throws_ok(
  $$ select public.unwaive_session('5e550000-0000-0000-0000-000000000001') $$,
  'P0001', 'La sesión no existe o no está sin cargo.',
  'otro psicólogo no vuelve a pendiente una sesión ajena'
);
select throws_ok(
  $$ select public.waive_session('5e550000-0000-0000-0000-000000000005') $$,
  'P0001', 'La sesión no existe o ya está sin cargo.',
  'otro psicólogo no deja sin cargo una sesión ajena'
);
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Vuelta a pendiente, ya se puede cobrar.
select lives_ok(
  $$ select public.unwaive_session('5e550000-0000-0000-0000-000000000001') $$,
  'una sesión sin cargo vuelve a pendiente'
);
select is(
  public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000001'::uuid], 'cash'),
  1,
  'vuelta a pendiente, se cobra'
);

select * from finish();
rollback;
