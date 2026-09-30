-- =============================================================================
-- Profesio · Tamaño de letra (en el perfil): normal, grande o muy grande.
-- Agranda toda la interfaz en proporción (texto y espacios), como el zoom del navegador.
-- =============================================================================


alter table public.profiles
  add column font_size text not null default 'normal'
    check (font_size in ('normal', 'large', 'xlarge'));
