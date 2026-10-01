-- =============================================================================
-- Anotaciones (historia clínica, Ley 26.529): una finalizada no se modifica ni se
-- borra; se corrige con una versión nueva. Las sesiones con anotación no se borran
-- ni se cancelan.
-- =============================================================================
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@test.local');

set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.patients (id, first_name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana');
insert into public.sessions (id, patient_id, starts_at, status) values
  ('5e550000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '7 days', 'scheduled'),
  ('5e550000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '14 days', 'cancelled');

-- Borrador: se edita libremente.
insert into public.session_notes (id, session_id, content)
values ('0e000000-0000-0000-0000-000000000001', '5e550000-0000-0000-0000-000000000001', 'Primer borrador');

select lives_ok(
  $$ update public.session_notes set content = 'Borrador corregido' where id = '0e000000-0000-0000-0000-000000000001' $$,
  'un borrador se edita'
);

update public.session_notes set status = 'final' where id = '0e000000-0000-0000-0000-000000000001';
select isnt(
  (select finalized_at from public.session_notes where id = '0e000000-0000-0000-0000-000000000001'),
  null,
  'al finalizarla se registra cuándo'
);

-- Finalizada: ni se modifica ni se borra.
select throws_ok(
  $$ update public.session_notes set content = 'Otro texto' where id = '0e000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Una anotación finalizada no se puede modificar. Creá una versión nueva.',
  'una anotación finalizada no se modifica'
);
select throws_ok(
  $$ update public.session_notes set status = 'draft' where id = '0e000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Una anotación finalizada no se puede modificar. Creá una versión nueva.',
  'una anotación finalizada no vuelve a borrador'
);
select throws_ok(
  $$ delete from public.session_notes where id = '0e000000-0000-0000-0000-000000000001' $$,
  'P0001', 'Una anotación finalizada no se puede borrar.',
  'una anotación finalizada no se borra'
);

-- Corrección: una versión nueva que reemplaza a la finalizada.
insert into public.session_notes (id, session_id, content, supersedes_id)
values ('0e000000-0000-0000-0000-000000000002', '5e550000-0000-0000-0000-000000000001', 'Corrección',
        '0e000000-0000-0000-0000-000000000001');
select is(
  (select version from public.session_notes where id = '0e000000-0000-0000-0000-000000000002'),
  2,
  'la corrección es la versión 2'
);
select is(
  (select content from public.session_notes where id = '0e000000-0000-0000-0000-000000000001'),
  'Borrador corregido',
  'la versión original queda intacta'
);
select throws_like(
  $$ insert into public.session_notes (session_id, content, supersedes_id)
     values ('5e550000-0000-0000-0000-000000000001', 'x', '0e000000-0000-0000-0000-000000000002') $$,
  'Solo se corrige con una versión nueva una anotación finalizada%',
  'un borrador no se corrige con otra versión: se edita'
);
select throws_ok(
  $$ insert into public.session_notes (session_id, content) values ('5e550000-0000-0000-0000-000000000001', 'x') $$,
  '23505', null,
  'una sesión tiene una sola primera versión'
);

-- La sesión con anotación no se cancela ni se borra.
select throws_ok(
  $$ update public.sessions set status = 'cancelled' where id = '5e550000-0000-0000-0000-000000000001' $$,
  'P0001', 'La sesión tiene una anotación: no se puede cancelar.',
  'una sesión con anotación no se cancela'
);
select throws_ok(
  $$ delete from public.sessions where id = '5e550000-0000-0000-0000-000000000001' $$,
  '23503', null,
  'una sesión con anotación no se borra'
);

-- Una sesión cancelada no se realizó: no lleva anotación.
select throws_ok(
  $$ insert into public.session_notes (session_id, content) values ('5e550000-0000-0000-0000-000000000002', 'x') $$,
  'P0001', 'La sesión está cancelada: no se le puede agregar una anotación.',
  'una sesión cancelada no lleva anotación'
);

select * from finish();
rollback;
