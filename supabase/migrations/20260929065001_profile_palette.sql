-- =============================================================================
-- Profesio · Estética: paleta de colores del psicólogo
-- Se combina con profiles.theme (claro / oscuro / del sistema).
-- Las paletas disponibles se definen en la app (src/lib/palettes.ts); acá solo
-- se valida el formato, así agregar una paleta no requiere otra migración.
-- La tabla ya tiene sus permisos (select, update to authenticated) y RLS.
-- =============================================================================

alter table public.profiles
  add column palette text not null default 'neutral'
    check (palette ~ '^[a-z][a-z0-9-]{0,30}$');
