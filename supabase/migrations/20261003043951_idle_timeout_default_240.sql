-- =============================================================================
-- Cierre por inactividad: 4 horas por defecto (antes 30 minutos), para las cuentas nuevas.
-- Las existentes conservan lo que tienen (cada uno puede haberlo elegido): no se tocan sus filas.
-- =============================================================================
alter table public.profiles alter column idle_timeout_minutes set default 240;
