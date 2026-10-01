-- =============================================================================
-- Profesio · El rol anónimo no accede a nada del esquema public
-- Hasta ahora dependía de una opción del panel de Supabase ("exponer tablas nuevas"
-- desactivada); en un proyecto nuevo (ej. profesio-prod) o en el local, anon recibía
-- todos los permisos por defecto. RLS igual le ocultaba las filas, pero los permisos no
-- tienen que depender de la configuración del proyecto: se quitan acá.
-- La app no lee tablas sin sesión iniciada (login y registro usan solo Supabase Auth).
-- =============================================================================

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- Lo que se cree de ahora en más (las migraciones corren como postgres) tampoco se le da.
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- Las funciones de trigger de la migración inicial quedaron con el permiso por defecto de
-- Postgres (EXECUTE para PUBLIC, que anon hereda). Solo corren como trigger, pero la regla es
-- la misma para todas: nada para public ni anon. (Un trigger no necesita EXECUTE al dispararse.)
revoke execute on function public.handle_new_user()       from public;
revoke execute on function public.session_notes_guard()   from public;
revoke execute on function public.sessions_before_write() from public;
revoke execute on function public.set_updated_at()        from public;
revoke execute on function public.write_audit_log()       from public;
