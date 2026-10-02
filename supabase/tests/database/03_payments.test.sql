-- =============================================================================
-- Cobros: una sesión cobrada no se cancela ni se borra, y las realizadas
-- conservan el valor que regía.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@test.local');
update public.profiles set default_session_fee = 1000;

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Bruno');

-- s1 futura, s2 y s3 realizadas (Ana); s4 futura (Ana); s5 realizada (Bruno); s6 futura (Bruno).
insert into public.sessions (id, patient_id, starts_at) values
  ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '7 days'),
  ('5e550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '7 days'),
  ('5e550000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '14 days'),
  ('5e550000-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '14 days'),
  ('5e550000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '21 days'),
  ('5e550000-0000-0000-0000-000000000006', 'aaaaaaaa-0000-0000-0000-000000000002', now() + interval '21 days');

select throws_ok(
  $$ select public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000002'::uuid], 'cheque') $$,
  'P0001', 'Medio de pago inválido.',
  'solo se cobra con un medio válido'
);
select is(
  public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000002'::uuid], 'cash'),
  1,
  'se cobra una sesión realizada'
);
select is(
  (select fee from public.sessions where id = '5e550000-0000-0000-0000-000000000002'),
  1000.00,
  'al cobrarla se fija su valor'
);

-- El calendario marca las realizadas sin cobrar: la vista trae paid_at.
select isnt(
  (select paid_at from public.calendar_sessions where id = '5e550000-0000-0000-0000-000000000002'),
  null,
  'el calendario ve la sesión cobrada'
);
select is(
  (select paid_at from public.calendar_sessions where id = '5e550000-0000-0000-0000-000000000003'),
  null,
  'el calendario ve la realizada sin cobrar'
);

-- Una sesión cobrada no se cancela, no se borra y, si ya se realizó, no se reprograma.
select throws_ok(
  $$ update public.sessions set status = 'cancelled' where id = '5e550000-0000-0000-0000-000000000002' $$,
  'P0001', 'La sesión está cobrada: desmarcá el cobro antes de cancelarla.',
  'una sesión cobrada no se cancela'
);
select throws_like(
  $$ delete from public.sessions where id = '5e550000-0000-0000-0000-000000000002' $$,
  '%está cobrada%',
  'una sesión cobrada no se borra'
);
select throws_like(
  $$ update public.sessions set starts_at = starts_at + interval '1 day' where id = '5e550000-0000-0000-0000-000000000002' $$,
  '%ya se realizó y está cobrada%',
  'una sesión realizada y cobrada no se reprograma'
);

-- Cobro por adelantado: una futura cobrada sí se reprograma.
select public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000001'::uuid], 'transfer');
select lives_ok(
  $$ update public.sessions set starts_at = starts_at + interval '1 day' where id = '5e550000-0000-0000-0000-000000000001' $$,
  'una sesión futura cobrada por adelantado se reprograma'
);

-- Deshecho el cobro, ya se puede cancelar.
select public.mark_session_unpaid('5e550000-0000-0000-0000-000000000002');
select lives_ok(
  $$ update public.sessions set status = 'cancelled' where id = '5e550000-0000-0000-0000-000000000002' $$,
  'sin el cobro, la sesión se cancela'
);

-- Una cancelada se puede cobrar (cancelación tardía) y volver a agendar con su cobro.
update public.sessions set status = 'cancelled' where id = '5e550000-0000-0000-0000-000000000006';
select is(
  public.mark_sessions_paid(array['5e550000-0000-0000-0000-000000000006'::uuid], 'cash'),
  1,
  'se cobra una sesión cancelada'
);
select lives_ok(
  $$ update public.sessions set status = 'scheduled' where id = '5e550000-0000-0000-0000-000000000006' $$,
  'una cancelada cobrada vuelve a agendarse'
);

-- Cambios de valor: las realizadas conservan el que regía; las futuras toman el nuevo.
update public.patients set session_fee = 2000 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select fee from public.sessions where id = '5e550000-0000-0000-0000-000000000003'),
  1000.00,
  'al cambiar el valor del paciente, una realizada conserva el anterior'
);
select is(
  (select fee from public.session_payments where id = '5e550000-0000-0000-0000-000000000004'),
  2000.00,
  'una futura toma el valor nuevo del paciente'
);

update public.profiles set default_session_fee = 1500;
select is(
  (select fee from public.session_payments where id = '5e550000-0000-0000-0000-000000000005'),
  1000.00,
  'al cambiar el valor del perfil, una realizada de un paciente sin valor propio conserva el anterior'
);
select is(
  (select fee from public.session_payments where id = '5e550000-0000-0000-0000-000000000004'),
  2000.00,
  'el valor del perfil no cambia a un paciente con valor propio'
);

select * from finish();
rollback;
