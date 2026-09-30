-- =============================================================================
-- Profesio · Los informes de sesión pasan a llamarse "anotaciones" en la interfaz
-- Solo cambian los mensajes de error que ve el usuario; la lógica queda igual.
-- (create or replace conserva los triggers y los permisos de cada función)
-- =============================================================================

create or replace function public.session_notes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prev public.session_notes%rowtype;
begin
  if tg_op = 'DELETE' then
    if old.status = 'final' then
      raise exception 'Una anotación finalizada no se puede borrar.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'final' then
      raise exception 'Una anotación finalizada no se puede modificar. Creá una versión nueva.';
    end if;
    if new.session_id <> old.session_id
       or new.supersedes_id is distinct from old.supersedes_id
       or new.version <> old.version then
      raise exception 'No se puede cambiar la sesión ni la versión de una anotación.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.supersedes_id is null then
      new.version := 1;
    else
      select * into prev from public.session_notes where id = new.supersedes_id;
      if not found then
        raise exception 'La anotación que se quiere corregir no existe.';
      end if;
      if prev.status <> 'final' then
        raise exception 'Solo se corrige con una versión nueva una anotación finalizada; un borrador se edita directamente.';
      end if;
      if prev.session_id <> new.session_id then
        raise exception 'La corrección tiene que ser de la misma sesión.';
      end if;
      new.version := prev.version + 1;
    end if;
  end if;

  if new.status = 'final' then
    new.finalized_at := coalesce(new.finalized_at, now());
  else
    new.finalized_at := null;
  end if;

  return new;
end;
$$;


create or replace function public.session_notes_cancelled_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.sessions s
    where s.id = new.session_id and s.status = 'cancelled'
  ) then
    raise exception 'La sesión está cancelada: no se le puede agregar una anotación.';
  end if;
  return new;
end;
$$;


create or replace function public.sessions_notes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.session_notes n where n.session_id = new.id) then
    raise exception 'La sesión tiene una anotación: no se puede cancelar.';
  end if;
  return new;
end;
$$;
