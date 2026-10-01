-- =============================================================================
-- Profesio · Seguridad de la cuenta
-- - idle_timeout_minutes: cierre de sesión por inactividad (lo aplica el proxy; sin opción "nunca":
--   con datos clínicos siempre hay límite).
-- - Verificación en dos pasos (MFA): si el psicólogo tiene un factor verificado, la base solo responde
--   a sesiones aal2 (que pasaron el código). Así, una sesión que solo pasó la contraseña no lee ni
--   escribe nada aunque se saltee la interfaz. Sin factores, todo sigue igual.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Preferencia: minutos sin actividad hasta cerrar la sesión.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column idle_timeout_minutes integer not null default 30
    check (idle_timeout_minutes in (15, 30, 60, 120, 240));


-- -----------------------------------------------------------------------------
-- ¿El usuario actual tiene la verificación en dos pasos activada (algún factor verificado)?
-- security definer: authenticated no puede leer auth.mfa_factors (guarda el secreto de cada factor).
-- Solo devuelve un sí/no sobre el propio usuario.
-- -----------------------------------------------------------------------------
create function public.mfa_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.mfa_factors
     where user_id = (select auth.uid()) and status = 'verified'
  );
$$;

revoke execute on function public.mfa_enabled() from public, anon;
grant execute on function public.mfa_enabled() to authenticated;


-- -----------------------------------------------------------------------------
-- Políticas restrictivas (se suman con AND a las de "lo propio" de cada tabla): con un factor verificado
-- se exige aal2; sin factores, alcanza aal1. Un JWT sin aal cuenta como aal1 (el nivel más bajo).
-- Los (select ...) se evalúan una vez por consulta, no por fila.
-- No afectan a service_role (cron) ni a las funciones security definer: no pasan por RLS.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'patients', 'session_series', 'sessions', 'session_notes',
    'vacations', 'push_subscriptions', 'notification_log', 'audit_log'
  ] loop
    execute format(
      $policy$
      create policy "%1$s: exige la verificación en dos pasos si está activada" on public.%1$I
        as restrictive for all to authenticated
        using (coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2' or not (select public.mfa_enabled()))
        with check (coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2' or not (select public.mfa_enabled()))
      $policy$,
      t
    );
  end loop;
end
$$;
