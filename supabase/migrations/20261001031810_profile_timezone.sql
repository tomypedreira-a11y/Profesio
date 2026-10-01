-- =============================================================================
-- Profesio · Zona horaria del psicólogo
-- - Al registrarse se toma la del navegador (llega en los metadatos, como el nombre).
-- - Se cambia desde Configuración con set_timezone: las sesiones futuras y los horarios
--   fijos conservan su hora de reloj (una sesión de las 18:00 sigue a las 18:00, en la
--   zona nueva). Las sesiones que ya pasaron no se tocan.
-- =============================================================================


-- Si un nombre de zona horaria existe (ej. 'America/Santiago').
create function public.is_valid_timezone(p_timezone text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone);
$$;


-- -----------------------------------------------------------------------------
-- Alta del perfil: con la zona del navegador si es válida (si no, la de siempre).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text := new.raw_user_meta_data ->> 'timezone';
begin
  insert into public.profiles (id, first_name, last_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    case when public.is_valid_timezone(tz) then tz else 'America/Argentina/Buenos_Aires' end
  );
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- Al mover sesiones por un cambio de zona no son reprogramaciones: sessions_before_write
-- no registra el horario anterior si la transacción lo indica (profesio.timezone_change).
-- -----------------------------------------------------------------------------
create or replace function public.sessions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.ends_at := new.starts_at + make_interval(mins => new.duration_minutes);

  if tg_op = 'UPDATE' then
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      new.cancelled_at := now();
    elsif new.status = 'scheduled' then
      new.cancelled_at := null;
    end if;

    if new.starts_at <> old.starts_at
       and new.rescheduled_from is not distinct from old.rescheduled_from
       and coalesce(current_setting('profesio.timezone_change', true), '') <> 'on' then
      new.rescheduled_from := old.starts_at;
    end if;
  end if;

  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- Cambiar la zona horaria. Devuelve cuántas sesiones futuras se movieron.
-- Se mueven de a una, en un orden que evita choques pasajeros con la restricción de
-- superposición (no es diferible): si una sesión se corre más tarde, primero las más
-- tardías; si más temprano, primero las más tempranas. En un mismo día todas se corren
-- lo mismo (la hora de reloj se conserva), así que nunca pisan a otra que todavía no se movió.
-- -----------------------------------------------------------------------------
create function public.set_timezone(p_timezone text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  old_tz text;
  s      record;
  moved  integer := 0;
begin
  if not public.is_valid_timezone(p_timezone) then
    raise exception 'Zona horaria inválida.';
  end if;

  select timezone into old_tz from public.profiles where id = auth.uid();
  if old_tz is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;
  if old_tz = p_timezone then
    return 0;
  end if;

  -- Primero el perfil: los controles que leen la zona (ej. vacaciones) ya usan la nueva.
  update public.profiles set timezone = p_timezone where id = auth.uid();
  update public.session_series set timezone = p_timezone where psychologist_id = auth.uid();

  perform set_config('profesio.timezone_change', 'on', true);

  for s in
    select id, new_start
      from (
        select ss.id, ss.starts_at,
               (ss.starts_at at time zone old_tz) at time zone p_timezone as new_start
          from public.sessions ss
         where ss.psychologist_id = auth.uid()
           and ss.starts_at > now()
      ) x
     where new_start <> starts_at
     order by (new_start > starts_at) desc,                                       -- primero las que van más tarde,
              case when new_start > starts_at then starts_at end desc,           -- de la última a la primera;
              case when new_start < starts_at then starts_at end asc             -- después las que van más temprano.
  loop
    begin
      update public.sessions set starts_at = s.new_start where id = s.id;
    exception when exclusion_violation then
      -- Solo puede chocar con una que no se mueve (ej. una en curso). No se cambia nada.
      raise exception 'No se pudo cambiar la zona horaria: la sesión del % se superpondría con otra.',
        to_char(s.new_start at time zone p_timezone, 'DD/MM "a las" HH24:MI')
        using errcode = 'P0001', hint = 'schedule_conflict';
    end;
    moved := moved + 1;
  end loop;

  perform set_config('profesio.timezone_change', '', true);
  return moved;
end;
$$;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.is_valid_timezone(text) from public, anon;
revoke execute on function public.set_timezone(text) from public, anon;

grant execute on function public.is_valid_timezone(text) to authenticated;
grant execute on function public.set_timezone(text) to authenticated;
