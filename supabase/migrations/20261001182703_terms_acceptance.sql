-- =============================================================================
-- Profesio · Aceptación de los Términos y la Política de privacidad
-- - profiles.terms_accepted_at / terms_version: cuándo y qué versión aceptó al registrarse.
-- - handle_new_user los completa con los metadatos del registro (`terms_version`, que manda el formulario
--   cuando se marca la casilla). La fecha es la del servidor, no la que mande el navegador.
-- - No se modifican desde la app: son el registro de la aceptación. Cuando haya una versión nueva de los
--   términos, una función específica (y este guard) registrará la nueva aceptación.
-- Las cuentas creadas antes de esta migración quedan con null.
-- =============================================================================

alter table public.profiles
  add column terms_accepted_at timestamptz,
  add column terms_version     text
    check (terms_version is null or terms_version ~ '^\d{4}-\d{2}-\d{2}$'),
  -- Las dos juntas: no hay aceptación sin versión ni versión sin fecha.
  add constraint profiles_terms_together check ((terms_accepted_at is null) = (terms_version is null));


-- -----------------------------------------------------------------------------
-- Alta del perfil (antes: 20261001031810_profile_timezone.sql) + aceptación de los términos.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz      text := new.raw_user_meta_data ->> 'timezone';
  version text := new.raw_user_meta_data ->> 'terms_version';
  valid_version boolean := coalesce(version ~ '^\d{4}-\d{2}-\d{2}$', false);
begin
  insert into public.profiles (id, first_name, last_name, timezone, terms_accepted_at, terms_version)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    case when public.is_valid_timezone(tz) then tz else 'America/Argentina/Buenos_Aires' end,
    case when valid_version then now() end,
    case when valid_version then version end
  );
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- La aceptación no se cambia con un update del perfil (ni la propia ni la de nadie).
-- -----------------------------------------------------------------------------
create function public.profiles_terms_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.terms_accepted_at is distinct from old.terms_accepted_at
     or new.terms_version is distinct from old.terms_version then
    raise exception 'La aceptación de los términos no se puede modificar.';
  end if;
  return new;
end;
$$;

create trigger profiles_terms_guard
  before update on public.profiles
  for each row execute function public.profiles_terms_guard();

revoke execute on function public.profiles_terms_guard() from public, anon;
grant execute on function public.profiles_terms_guard() to authenticated;
