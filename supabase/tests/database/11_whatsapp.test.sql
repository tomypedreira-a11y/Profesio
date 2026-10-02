-- =============================================================================
-- Mensaje de recordatorio por WhatsApp (profiles.whatsapp_reminder_template): null = el de la app;
-- si tiene texto, entre 1 y 500 caracteres (sin contar espacios de los extremos).
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"first_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"first_name": "Beto"}');

select is((select whatsapp_reminder_template from public.profiles where id = '11111111-1111-1111-1111-111111111111'), null,
  'una cuenta nueva usa el mensaje de la app');

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}';

update public.profiles set whatsapp_reminder_template = 'Hola {nombre}, nos vemos el {fecha} a las {hora}.'
  where id = '11111111-1111-1111-1111-111111111111';
select is((select whatsapp_reminder_template from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Hola {nombre}, nos vemos el {fecha} a las {hora}.', 'el psicólogo guarda su mensaje');

select throws_ok(
  $$ update public.profiles set whatsapp_reminder_template = '   ' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'un mensaje vacío no se guarda (se vuelve al de la app con null)'
);
select throws_ok(
  $$ update public.profiles set whatsapp_reminder_template = repeat('a', 501) where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514', null, 'ni uno de más de 500 caracteres'
);

update public.profiles set whatsapp_reminder_template = null where id = '11111111-1111-1111-1111-111111111111';
select is((select whatsapp_reminder_template from public.profiles where id = '11111111-1111-1111-1111-111111111111'), null,
  'se puede volver al mensaje de la app');

-- El de otro psicólogo no se toca (RLS).
update public.profiles set whatsapp_reminder_template = 'ajeno' where id = '22222222-2222-2222-2222-222222222222';
reset role;
select is((select whatsapp_reminder_template from public.profiles where id = '22222222-2222-2222-2222-222222222222'), null,
  'no se modifica el mensaje de otro psicólogo');

select * from finish();
rollback;
