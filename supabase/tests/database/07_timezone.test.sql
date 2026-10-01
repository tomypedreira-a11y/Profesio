-- =============================================================================
-- Zona horaria del psicólogo: se toma la del navegador al registrarse, y al cambiarla
-- las sesiones futuras y los horarios fijos conservan su hora de reloj.
-- Bogotá (UTC-5, sin horario de verano) está dos horas antes que Buenos Aires (UTC-3):
-- las 10:00 de Bogotá son dos horas más tarde que las 10:00 de Buenos Aires.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Registro: la zona llega en los metadatos, como el nombre.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"timezone": "America/Santiago"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{"timezone": "Marte/Base_Alfa"}');

select is((select timezone from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'America/Argentina/Buenos_Aires', 'sin zona en el registro, queda Buenos Aires');
select is((select timezone from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'America/Santiago', 'con la zona del navegador, queda esa');
select is((select timezone from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'America/Argentina/Buenos_Aires', 'una zona que no existe se ignora');

-- Hora de reloj de una sesión en una zona.
create function pg_temp.clock(p_session uuid, p_tz text)
returns text language sql as $$
  select to_char(starts_at at time zone p_tz, 'HH24:MI') from public.sessions where id = p_session;
$$;

-- B tiene una sesión: no se toca cuando A cambia su zona.
set local role authenticated;
set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
insert into public.patients (id, first_name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Beto');
insert into public.sessions (id, patient_id, starts_at)
values ('5e55bbbb-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', now() + interval '5 days');

-- A, en Buenos Aires: dos sesiones sueltas con dos horas entre sí (al correrse dos horas, la
-- primera caería donde está la segunda si se moviera antes), una realizada y un horario fijo.
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
insert into public.patients (id, first_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Bruno'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Carla');
insert into public.sessions (id, patient_id, starts_at) values
  ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   (current_date + 10 + time '10:00') at time zone 'America/Argentina/Buenos_Aires'),
  ('5e550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   (current_date + 10 + time '12:00') at time zone 'America/Argentina/Buenos_Aires'),
  ('5e550000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001',
   (current_date - 10 + time '10:00') at time zone 'America/Argentina/Buenos_Aires');
select public.add_patient_schedules(
  'aaaaaaaa-0000-0000-0000-000000000002',
  jsonb_build_array(jsonb_build_object('weekday', extract(dow from current_date + 3)::int, 'start_time', '18:00'))
);

select throws_ok($$ select public.set_timezone('Marte/Base_Alfa') $$, 'P0001', 'Zona horaria inválida.',
  'no se elige una zona que no existe');
select is(public.set_timezone('America/Argentina/Buenos_Aires'), 0, 'elegir la misma zona no mueve nada');

select ok(public.set_timezone('America/Bogota') > 0, 'al cambiar de zona se mueven las sesiones futuras');
select is((select timezone from public.profiles where id = auth.uid()), 'America/Bogota', 'el perfil queda en la zona nueva');

select is(pg_temp.clock('5e550000-0000-0000-0000-000000000001', 'America/Bogota'), '10:00',
  'una sesión de las 10:00 sigue a las 10:00, en la hora de Bogotá');
select is(pg_temp.clock('5e550000-0000-0000-0000-000000000002', 'America/Bogota'), '12:00',
  'y la de las 12:00 también (no chocan mientras se mueven)');
select is(
  (select count(*)::int from public.sessions
    where patient_id = 'aaaaaaaa-0000-0000-0000-000000000002'
      and to_char(starts_at at time zone 'America/Bogota', 'HH24:MI') <> '18:00'),
  0,
  'todas las sesiones del horario fijo siguen a las 18:00'
);
select is(pg_temp.clock('5e550000-0000-0000-0000-000000000003', 'America/Argentina/Buenos_Aires'), '10:00',
  'una sesión realizada no se mueve');
select is(
  (select count(*)::int from public.sessions where rescheduled_from is not null),
  0,
  'el cambio de zona no las marca como reprogramadas'
);

-- Lo que se agenda después usa la zona nueva.
select public.add_patient_schedules(
  'aaaaaaaa-0000-0000-0000-000000000003',
  jsonb_build_array(jsonb_build_object('weekday', extract(dow from current_date + 4)::int, 'start_time', '19:00'))
);
select is(
  (select count(*)::int from public.sessions
    where patient_id = 'aaaaaaaa-0000-0000-0000-000000000003'
      and to_char(starts_at at time zone 'America/Bogota', 'HH24:MI') <> '19:00'),
  0,
  'un horario fijo nuevo se agenda en la hora de Bogotá'
);
select is(
  pg_temp.clock(public.schedule_session('aaaaaaaa-0000-0000-0000-000000000001', current_date + 12, '09:00'), 'America/Bogota'),
  '09:00',
  'una sesión suelta nueva también'
);

-- Volver a la zona anterior deja todo como estaba.
select public.set_timezone('America/Argentina/Buenos_Aires');
select is(pg_temp.clock('5e550000-0000-0000-0000-000000000001', 'America/Argentina/Buenos_Aires'), '10:00',
  'al volver a Buenos Aires, la sesión vuelve a las 10:00 de Buenos Aires');

-- La sesión de B no se movió.
reset role;
select is(
  (select starts_at > now() + interval '4 days 23 hours' and starts_at < now() + interval '5 days 1 hour'
     from public.sessions where id = '5e55bbbb-0000-0000-0000-000000000001'),
  true,
  'el cambio de zona de A no toca las sesiones de B'
);

select * from finish();
rollback;
