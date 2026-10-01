-- =============================================================================
-- Vacaciones: no hay sesiones de horarios fijos en esas fechas (se quitan, no se
-- generan y no se pueden agendar); las sueltas sí. Al quitarlas, vuelven.
-- Período de prueba: de hoy + 30 a hoy + 43 (dos semanas: dos sesiones semanales).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@test.local');
update public.profiles set default_session_fee = 1000;

-- Sesiones agendadas del horario fijo de un paciente entre dos días (en la zona horaria del perfil). Corre con el rol
-- de quien la llama, así que cuenta solo las que ve el psicólogo actual.
create function pg_temp.sessions_on(p_patient uuid, p_from date, p_to date default null)
returns integer language sql as $$
  select count(*)::int from public.sessions
   where patient_id = p_patient and series_id is not null and status = 'scheduled'
     and (starts_at at time zone 'America/Argentina/Buenos_Aires')::date between p_from and coalesce(p_to, p_from);
$$;

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana'),    -- horario fijo
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Bruno'),  -- irregular
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Carla'),  -- horario fijo creado durante las vacaciones
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Diego');  -- horario fijo con una sesión cobrada por adelantado

-- Todos los horarios fijos caen el mismo día de la semana que hoy + 35.
select public.add_patient_schedules(
  'aaaaaaaa-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object('weekday', extract(dow from current_date + 35)::int, 'start_time', '10:00'))
);

select is(pg_temp.sessions_on('aaaaaaaa-0000-0000-0000-000000000001', current_date + 30, current_date + 43), 2,
  'antes de las vacaciones hay dos sesiones del horario fijo en esas fechas');

-- Cargar vacaciones ------------------------------------------------------------

select is(public.add_vacation(current_date + 30, current_date + 43), 2, 'al cargarlas se quitan esas dos sesiones');
select is(pg_temp.sessions_on('aaaaaaaa-0000-0000-0000-000000000001', current_date + 30, current_date + 43), 0,
  'durante las vacaciones no quedan sesiones del horario fijo');
select is(pg_temp.sessions_on('aaaaaaaa-0000-0000-0000-000000000001', current_date + 49), 1,
  'las sesiones posteriores no se tocan');

select throws_ok(
  $$ select public.add_vacation(current_date + 40, current_date + 50) $$,
  'P0001', 'Esas fechas se superponen con otras vacaciones que ya cargaste.',
  'no se cargan vacaciones superpuestas'
);
select throws_ok(
  $$ select public.add_vacation(current_date - 10, current_date - 5) $$,
  'P0001', 'Las vacaciones no pueden terminar antes de hoy.',
  'no se cargan vacaciones que ya terminaron'
);
select throws_like(
  $$ select public.add_vacation(current_date + 100, current_date + 90) $$,
  'Revisá las fechas%',
  'la vuelta no puede ser antes del inicio'
);

-- Durante las vacaciones -------------------------------------------------------

select lives_ok(
  $$ select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000002', current_date + 31, '15:00') $$,
  'se agenda una sesión suelta (urgencia) de un paciente irregular'
);
select lives_ok(
  $$ select public.schedule_session('aaaaaaaa-0000-0000-0000-000000000001', current_date + 32, '16:00') $$,
  'se agenda una sesión suelta (urgencia) de un paciente con horario fijo'
);
select throws_like(
  $$ select public.reschedule_session(
       (select id from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000001'
           and (starts_at at time zone 'America/Argentina/Buenos_Aires')::date = current_date + 49),
       current_date + 33, '10:00') $$,
  '%estás de vacaciones%',
  'no se reprograma una sesión del horario fijo a un día de vacaciones'
);

select public.add_patient_schedules(
  'aaaaaaaa-0000-0000-0000-000000000003',
  jsonb_build_array(jsonb_build_object('weekday', extract(dow from current_date + 35)::int, 'start_time', '12:00'))
);
select is(pg_temp.sessions_on('aaaaaaaa-0000-0000-0000-000000000003', current_date + 30, current_date + 43), 0,
  'un horario fijo nuevo no genera sesiones en las vacaciones');
select is(pg_temp.sessions_on('aaaaaaaa-0000-0000-0000-000000000003', current_date + 49), 1,
  'y sí después');

-- Sesiones que impiden cargar vacaciones, y canceladas -------------------------

select public.add_patient_schedules(
  'aaaaaaaa-0000-0000-0000-000000000004',
  jsonb_build_array(jsonb_build_object('weekday', extract(dow from current_date + 35)::int, 'start_time', '14:00'))
);
select public.mark_sessions_paid(
  array(select id from public.sessions where patient_id = 'aaaaaaaa-0000-0000-0000-000000000004'
           and (starts_at at time zone 'America/Argentina/Buenos_Aires')::date = current_date + 56),
  'transfer'
);
select throws_like(
  $$ select public.add_vacation(current_date + 50, current_date + 60) $$,
  '%está cobrada o tiene una anotación%',
  'una sesión del horario fijo cobrada por adelantado impide cargar las vacaciones'
);
select is((select count(*)::int from public.vacations where start_date = current_date + 50), 0,
  'y no queda cargado nada');

-- Una cancelada del horario fijo se conserva, pero no se reactiva en vacaciones.
update public.sessions set status = 'cancelled'
 where patient_id = 'aaaaaaaa-0000-0000-0000-000000000001'
   and (starts_at at time zone 'America/Argentina/Buenos_Aires')::date = current_date + 70;
select public.add_vacation(current_date + 66, current_date + 72);
select is(
  (select count(*)::int from public.sessions
    where patient_id = 'aaaaaaaa-0000-0000-0000-000000000001' and status = 'cancelled'
      and (starts_at at time zone 'America/Argentina/Buenos_Aires')::date = current_date + 70),
  1,
  'la cancelada del horario fijo se conserva'
);
select throws_like(
  $$ update public.sessions set status = 'scheduled'
      where patient_id = 'aaaaaaaa-0000-0000-0000-000000000001' and status = 'cancelled' $$,
  '%estás de vacaciones%',
  'y no se puede deshacer su cancelación durante las vacaciones'
);

-- Quitar vacaciones ------------------------------------------------------------

select public.remove_vacation((select id from public.vacations where start_date = current_date + 30));
select is(pg_temp.sessions_on('aaaaaaaa-0000-0000-0000-000000000001', current_date + 30, current_date + 43), 2,
  'al quitarlas vuelven las sesiones del horario fijo');
select is(pg_temp.sessions_on('aaaaaaaa-0000-0000-0000-000000000003', current_date + 30, current_date + 43), 2,
  'también las del horario creado durante las vacaciones');

select * from finish();
rollback;
