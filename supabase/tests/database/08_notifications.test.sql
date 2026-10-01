-- =============================================================================
-- Notificaciones: RLS de push_subscriptions y notification_log, due_notifications solo para el cron
-- (service_role), y qué devuelve (sin datos clínicos; el nombre solo si el psicólogo lo eligió).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local');

-- Un minuto de referencia para el cron (dentro de 20 días, a las 10:00 de Buenos Aires).
create function pg_temp.cron_now() returns timestamptz language sql as $$
  select (current_date + 20 + time '10:00') at time zone 'America/Argentina/Buenos_Aires';
$$;


-- -----------------------------------------------------------------------------
-- Preferencias
-- -----------------------------------------------------------------------------
select is((select reminder_minutes from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 10,
  'el recordatorio arranca a 10 minutos');
select is((select notification_show_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), false,
  'el nombre del paciente no se muestra por defecto');
select throws_ok(
  $$ update public.profiles set reminder_minutes = 7 where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'solo 5, 10, 15, 30 o 60 minutos'
);

-- -----------------------------------------------------------------------------
-- push_subscriptions: cada uno ve, crea y borra solo las suyas
-- -----------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.test/a', 'k', 's');
insert into public.patients (id, first_name, last_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Juan', 'Pérez');
insert into public.sessions (id, patient_id, starts_at) values
  -- Empieza 10 minutos después del minuto del cron.
  ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', pg_temp.cron_now() + interval '10 minutes'),
  -- Más tarde ese día (para el resumen).
  ('5e550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', pg_temp.cron_now() + interval '5 hours');

select is((select count(*)::int from public.push_subscriptions), 1, 'A ve su suscripción');
select throws_ok(
  $$ update public.push_subscriptions set auth = 'x' $$,
  '42501', null, 'una suscripción no se modifica desde la app'
);

set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*)::int from public.push_subscriptions), 0, 'B no ve las suscripciones de A');
select throws_ok(
  $$ insert into public.push_subscriptions (psychologist_id, endpoint, p256dh, auth)
     values ('11111111-1111-1111-1111-111111111111', 'https://push.test/intruso', 'k', 's') $$,
  '42501', null, 'B no crea suscripciones a nombre de A'
);
delete from public.push_subscriptions where endpoint = 'https://push.test/a';
select throws_ok(
  $$ select public.due_notifications(now()) $$,
  '42501', null, 'un psicólogo no puede ejecutar due_notifications'
);

-- -----------------------------------------------------------------------------
-- notification_log: solo lectura de lo propio; nadie escribe desde la app
-- -----------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.notification_log (psychologist_id, kind, for_date)
     values ('22222222-2222-2222-2222-222222222222', 'daily_summary', current_date) $$,
  '42501', null, 'la app no escribe en notification_log'
);

set local role anon;
select throws_ok($$ select public.due_notifications(now()) $$, '42501', null, 'el rol anónimo tampoco');

-- -----------------------------------------------------------------------------
-- due_notifications: la ejecuta el cron (service_role). El resto se prueba como postgres.
-- -----------------------------------------------------------------------------
set local role service_role;
select lives_ok($$ select public.due_notifications(now()) $$, 'el cron (service_role) ejecuta due_notifications');
reset role;

select is((select count(*)::int from public.push_subscriptions where psychologist_id = '11111111-1111-1111-1111-111111111111'), 1,
  'el intento de B no borró la suscripción de A');

select is(
  (select row(kind, start_time, modality, patient_label, minutes_before)::text
     from public.due_notifications(pg_temp.cron_now())
    where psychologist_id = '11111111-1111-1111-1111-111111111111' and kind = 'session_reminder'),
  '(session_reminder,10:10,in_person,,10)',
  'recordatorio: hora local, modalidad, sin nombre y a 10 minutos'
);

-- Con tolerancia: si el cron se salteó un minuto, la siguiente corrida lo envía (y dice cuánto falta).
select is(
  (select minutes_before from public.due_notifications(pg_temp.cron_now() + interval '1 minute')
    where session_id = '5e550000-0000-0000-0000-000000000001'),
  9,
  'si se perdió una corrida, la siguiente lo envía con los minutos que faltan'
);
select is(
  (select count(*)::int from public.due_notifications(pg_temp.cron_now() - interval '1 minute')
    where session_id = '5e550000-0000-0000-0000-000000000001'),
  0,
  'un minuto antes todavía no corresponde'
);

-- Con el nombre elegido: nombre e inicial del apellido.
update public.profiles set notification_show_name = true where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select patient_label from public.due_notifications(pg_temp.cron_now())
    where session_id = '5e550000-0000-0000-0000-000000000001'),
  'Juan P.',
  'con el nombre elegido: nombre e inicial del apellido'
);

-- Ya enviado: no se repite.
insert into public.notification_log (psychologist_id, kind, session_id)
values ('11111111-1111-1111-1111-111111111111', 'session_reminder', '5e550000-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from public.due_notifications(pg_temp.cron_now()) where kind = 'session_reminder'),
  0,
  'un recordatorio ya registrado no se vuelve a enviar'
);
select throws_ok(
  $$ insert into public.notification_log (psychologist_id, kind, session_id)
     values ('11111111-1111-1111-1111-111111111111', 'session_reminder', '5e550000-0000-0000-0000-000000000001') $$,
  '23505', null, 'ni aunque dos corridas del cron lo intenten a la vez'
);

-- Apagados o sin dispositivos: nada.
update public.profiles set reminder_minutes = null where id = '11111111-1111-1111-1111-111111111111';
delete from public.notification_log;
select is((select count(*)::int from public.due_notifications(pg_temp.cron_now()) where kind = 'session_reminder'), 0,
  'con los recordatorios apagados, no hay recordatorio');
update public.profiles set reminder_minutes = 10 where id = '11111111-1111-1111-1111-111111111111';

-- Resumen del día, a la hora elegida (10:00 local).
update public.profiles set daily_summary_enabled = true, daily_summary_time = '10:00'
 where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select row(session_count, start_time)::text from public.due_notifications(pg_temp.cron_now())
    where kind = 'daily_summary' and psychologist_id = '11111111-1111-1111-1111-111111111111'),
  '(2,10:10)',
  'resumen: cantidad de sesiones del día y hora de la primera'
);
select is(
  (select count(*)::int from public.due_notifications(pg_temp.cron_now() - interval '1 minute') where kind = 'daily_summary'),
  0,
  'antes de la hora elegida no hay resumen'
);
select is(
  (select count(*)::int from public.due_notifications(pg_temp.cron_now() + interval '5 minutes') where kind = 'daily_summary'),
  1,
  'si se perdió la corrida de las 10:00, sale un rato después'
);
insert into public.notification_log (psychologist_id, kind, for_date)
values ('11111111-1111-1111-1111-111111111111', 'daily_summary',
        (pg_temp.cron_now() at time zone 'America/Argentina/Buenos_Aires')::date);
select is((select count(*)::int from public.due_notifications(pg_temp.cron_now() + interval '5 minutes') where kind = 'daily_summary'), 0,
  'el resumen sale una vez por día');

-- Sin dispositivos suscriptos no se envía nada.
delete from public.notification_log;
delete from public.push_subscriptions;
select is((select count(*)::int from public.due_notifications(pg_temp.cron_now())), 0,
  'sin dispositivos suscriptos no hay nada para enviar');

-- Nunca devuelve datos clínicos: solo estas columnas.
select is(
  (select pg_get_function_result('public.due_notifications(timestamptz)'::regprocedure)),
  'TABLE(kind text, psychologist_id uuid, session_id uuid, for_date date, start_time text, modality text, patient_label text, minutes_before integer, session_count integer)',
  'due_notifications devuelve solo hora, modalidad, nombre opcional y cantidades'
);

select * from finish();
rollback;
