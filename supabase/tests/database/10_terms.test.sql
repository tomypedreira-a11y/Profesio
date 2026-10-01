-- =============================================================================
-- Aceptación de los Términos y la Política de privacidad: la completa el alta (handle_new_user) con los
-- metadatos del registro y no se modifica después.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@test.local', '{"first_name": "Ana", "terms_version": "2026-10-01"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.local', '{"first_name": "Beto"}'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local', '{"first_name": "Caro", "terms_version": "cualquier cosa"}');

select is((select terms_version from public.profiles where id = '11111111-1111-1111-1111-111111111111'), '2026-10-01',
  'el alta guarda la versión aceptada');
select ok((select terms_accepted_at between now() - interval '1 minute' and now() + interval '1 minute'
             from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'y la fecha de aceptación (la del servidor)');
select is((select terms_accepted_at from public.profiles where id = '22222222-2222-2222-2222-222222222222'), null,
  'sin versión en el registro, no hay aceptación');
select is((select terms_version from public.profiles where id = '33333333-3333-3333-3333-333333333333'), null,
  'una versión con formato inválido no se guarda');
select is((select terms_accepted_at from public.profiles where id = '33333333-3333-3333-3333-333333333333'), null,
  'ni su fecha');

-- Como el propio psicólogo: el resto del perfil se edita, la aceptación no.
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "aal": "aal1"}';

update public.profiles set first_name = 'Ana María' where id = '11111111-1111-1111-1111-111111111111';
select is((select first_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ana María',
  'el resto del perfil se sigue editando');
select throws_ok(
  $$ update public.profiles set terms_version = '2030-01-01' where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001', 'La aceptación de los términos no se puede modificar.',
  'no se cambia la versión aceptada'
);
select throws_ok(
  $$ update public.profiles set terms_accepted_at = now() - interval '1 year' where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001', 'La aceptación de los términos no se puede modificar.',
  'no se cambia la fecha de aceptación'
);

set local request.jwt.claims to '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "aal": "aal1"}';
select throws_ok(
  $$ update public.profiles set terms_accepted_at = now(), terms_version = '2026-10-01' where id = '22222222-2222-2222-2222-222222222222' $$,
  'P0001', 'La aceptación de los términos no se puede modificar.',
  'tampoco se puede registrar una aceptación a mano'
);

select * from finish();
rollback;
