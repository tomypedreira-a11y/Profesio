-- =============================================================================
-- Profesio · Informes y sesiones canceladas
-- - A una sesión cancelada no se le agrega un informe (no se realizó).
-- - Una sesión con informe no se cancela: el informe es historia clínica y no se borra,
--   así que la sesión se considera realizada.
-- =============================================================================

create function public.session_notes_cancelled_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.sessions s
    where s.id = new.session_id and s.status = 'cancelled'
  ) then
    raise exception 'La sesión está cancelada: no se le puede agregar un informe.';
  end if;
  return new;
end;
$$;

create trigger session_notes_cancelled_guard
  before insert on public.session_notes
  for each row execute function public.session_notes_cancelled_guard();


create function public.sessions_notes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.session_notes n where n.session_id = new.id) then
    raise exception 'La sesión tiene un informe: no se puede cancelar.';
  end if;
  return new;
end;
$$;

create trigger sessions_notes_guard
  before update of status on public.sessions
  for each row
  when (new.status = 'cancelled' and old.status <> 'cancelled')
  execute function public.sessions_notes_guard();


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.session_notes_cancelled_guard() from public, anon;
revoke execute on function public.sessions_notes_guard() from public, anon;

grant execute on function public.session_notes_cancelled_guard() to authenticated;
grant execute on function public.sessions_notes_guard() to authenticated;
