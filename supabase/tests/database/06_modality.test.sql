-- =============================================================================
-- Modalidad (presencial / virtual): la sesión usa la del paciente salvo que se
-- cambie; "esta y las siguientes" cambia la del paciente de ahí en adelante, y las
-- sesiones realizadas conservan la que tuvieron.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@test.local');

-- Modalidad que muestra el calendario para una sesión.
create function pg_temp.modality_of(p_session uuid)
returns text language sql as $$
  select modality from public.calendar_sessions where id = p_session;
$$;

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Bruno');

-- Ana: s0 realizada; s1, s2 y s3 futuras. Bruno: s5 realizada.
insert into public.sessions (id, patient_id, starts_at) values
  ('5e550000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '7 days'),
  ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '7 days'),
  ('5e550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '14 days'),
  ('5e550000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', now() + interval '21 days'),
  ('5e550000-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '8 days');

select is((select modality from public.patients where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'in_person',
  'un paciente nuevo es presencial');
select is(pg_temp.modality_of('5e550000-0000-0000-0000-000000000001'), 'in_person',
  'sus sesiones usan la modalidad del paciente');
select throws_ok(
  $$ insert into public.patients (first_name, modality) values ('Carla', 'telefónica') $$,
  '23514', null,
  'solo presencial o virtual'
);

-- Solo esta sesión.
select public.set_session_modality('5e550000-0000-0000-0000-000000000001', 'virtual', 'one');
select is(pg_temp.modality_of('5e550000-0000-0000-0000-000000000001'), 'virtual', '"solo esta" cambia esa sesión');
select is(pg_temp.modality_of('5e550000-0000-0000-0000-000000000002'), 'in_person', 'y no las demás');

-- Esta y las siguientes (desde s2).
select public.set_session_modality('5e550000-0000-0000-0000-000000000002', 'virtual', 'following');
select is((select modality from public.patients where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'virtual',
  '"esta y las siguientes" cambia la modalidad del paciente');
select is(pg_temp.modality_of('5e550000-0000-0000-0000-000000000003'), 'virtual', 'y la de las siguientes');
select is(pg_temp.modality_of('5e550000-0000-0000-0000-000000000000'), 'in_person',
  'la realizada conserva la que tuvo');

-- s3 se cambia sola a presencial; después, "esta y las siguientes" desde s2 la vuelve a virtual.
select public.set_session_modality('5e550000-0000-0000-0000-000000000003', 'in_person', 'one');
select public.set_session_modality('5e550000-0000-0000-0000-000000000002', 'virtual', 'following');
select is(pg_temp.modality_of('5e550000-0000-0000-0000-000000000003'), 'virtual',
  '"esta y las siguientes" también pisa las cambiadas una por una');
select is((select modality from public.sessions where id = '5e550000-0000-0000-0000-000000000003'), null,
  'y esas vuelven a seguir la del paciente');

select throws_ok(
  $$ select public.set_session_modality('5e550000-0000-0000-0000-000000000000', 'virtual', 'following') $$,
  'P0001', 'Una sesión que ya pasó solo se puede cambiar a ella sola.',
  'desde una sesión realizada no se cambian las siguientes'
);
select throws_ok(
  $$ select public.set_session_modality('5e550000-0000-0000-0000-000000000001', 'telefónica', 'one') $$,
  'P0001', 'Elegí presencial o virtual.',
  'solo presencial o virtual en la sesión'
);

-- Cambiar la modalidad desde la ficha: las realizadas conservan la anterior.
select public.update_patient_with_schedules(
  p_patient_id => 'aaaaaaaa-0000-0000-0000-000000000002', p_first_name => 'Bruno', p_last_name => '',
  p_modality => 'virtual'
);
select is(pg_temp.modality_of('5e550000-0000-0000-0000-000000000005'), 'in_person',
  'al editar al paciente, su sesión realizada conserva la modalidad');
select public.create_patient_with_schedules(p_first_name => 'Diana', p_last_name => '', p_modality => 'virtual');
select is((select modality from public.patients where first_name = 'Diana'), 'virtual',
  'el alta de paciente guarda la modalidad elegida');

select * from finish();
rollback;
