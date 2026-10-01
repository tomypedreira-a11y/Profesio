-- =============================================================================
-- Agenda: duración, superposiciones, horarios fijos y reprogramación.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@test.local');

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Bruno'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Carla'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Diego'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Elena');

-- Sesiones sueltas -------------------------------------------------------------

select lives_ok(
  $$ select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000001', current_date + 10, '10:00') $$,
  'se agenda una sesión suelta'
);
select is(
  (select duration_minutes from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  45,
  'sin fin, dura lo habitual del perfil (45 por defecto)'
);
select throws_ok(
  $$ select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000001', current_date + 10, '10:30') $$,
  'P0001', 'Ese horario se superpone con otra sesión.',
  'no se superponen dos sesiones del mismo paciente'
);
select throws_ok(
  $$ select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000002', current_date + 10, '10:15') $$,
  'P0001', 'Ese horario se superpone con otra sesión.',
  'no se superponen sesiones de pacientes distintos'
);

update public.profiles set default_session_minutes = 60;
select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000002', current_date + 10, '12:00');
select is(
  (select duration_minutes from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  60,
  'al cambiar la duración del perfil, las nuevas sesiones la usan'
);

select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000003', current_date + 10, '14:00', '14:50');
select is(
  (select duration_minutes from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  50,
  'con fin, la duración sale del inicio y el fin'
);

update public.sessions set status = 'cancelled' where patient_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select lives_ok(
  $$ select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000002', current_date + 10, '10:00') $$,
  'una sesión cancelada no ocupa el horario'
);

-- Horarios fijos ---------------------------------------------------------------

select public.add_patient_schedules(
  'aaaaaaaa-0000-0000-0000-000000000004',
  jsonb_build_array(jsonb_build_object('weekday', extract(dow from current_date + 3)::int, 'start_time', '18:00'))
);
select ok(
  (select count(*) from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000004') between 52 and 54,
  'un horario semanal genera las sesiones de 12 meses'
);

select public.add_patient_schedules(
  'aaaaaaaa-0000-0000-0000-000000000005',
  jsonb_build_array(jsonb_build_object(
    'weekday', extract(dow from current_date + 4)::int, 'start_time', '18:00',
    'frequency', 'biweekly', 'start_date', to_char(current_date + 4, 'YYYY-MM-DD')))
);
select ok(
  (select count(*) from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000005') between 26 and 27,
  'uno quincenal genera la mitad'
);
select is(
  (select count(*)::int from (
     select starts_at - lag(starts_at) over (order by starts_at) as gap
       from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000005'
   ) g where gap is not null and gap not between interval '13 days 23 hours' and interval '14 days 1 hour'),
  0,
  'las sesiones quincenales están separadas por dos semanas'
);

select throws_like(
  $$ select public.add_patient_schedules(
       'aaaaaaaa-0000-0000-0000-000000000001',
       jsonb_build_array(jsonb_build_object('weekday', extract(dow from current_date + 3)::int, 'start_time', '18:30'))) $$,
  '%se superpone con otra sesión%',
  'un horario fijo que choca con otro no se crea'
);

-- Reprogramar ------------------------------------------------------------------

select throws_ok(
  $$ select public.reschedule_session(
       (select id from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
       current_date + 10, '12:30') $$,
  'P0001', 'Ese horario se superpone con otra sesión.',
  'no se reprograma sobre otra sesión'
);

select public.reschedule_session(
  (select id from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  current_date + 11, '09:00'
);
select is(
  (select duration_minutes from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000003'),
  50,
  'reprogramar sin fin conserva la duración'
);

select * from finish();
rollback;
