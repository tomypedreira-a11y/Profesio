-- =============================================================================
-- Profesio · Sesiones sin cargo
-- - Una sesión realizada (ya terminó y no está cancelada) se puede dejar sin cargo: el psicólogo
--   decide no cobrarla. Sigue siendo una sesión realizada (cuenta como tal, lleva anotación),
--   pero no suma a lo pendiente ni a lo que adeuda el paciente.
-- - Reemplaza a "cancelar" para las sesiones que ya terminaron: cancelar una sesión realizada
--   para no cobrarla la registraba como no realizada.
-- - waived_at = cuándo se dejó sin cargo (null = no). Se deshace con unwaive_session.
-- - Una sesión sin cargo no se cobra, no se cancela ni se reprograma: primero vuelve a pendiente.
-- - Una sesión cobrada no se deja sin cargo: primero se deshace el cobro.
-- =============================================================================


alter table public.sessions
  add column waived_at timestamptz,
  add constraint sessions_waived_unpaid check (waived_at is null or paid_at is null),
  add constraint sessions_waived_scheduled check (waived_at is null or status = 'scheduled');


-- -----------------------------------------------------------------------------
-- Reglas (con mensajes para el usuario; los check de arriba quedan de respaldo).
-- -----------------------------------------------------------------------------
create function public.sessions_waived_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.waived_at is null then
    return new;
  end if;

  -- Se deja sin cargo ahora.
  if old.waived_at is null then
    if new.status <> 'scheduled' then
      raise exception 'Una sesión cancelada no se deja sin cargo.';
    end if;
    if new.ends_at > now() then
      raise exception 'Solo se dejan sin cargo las sesiones que ya terminaron.';
    end if;
    if new.paid_at is not null then
      raise exception 'La sesión está cobrada: desmarcá el cobro antes de dejarla sin cargo.';
    end if;
    return new;
  end if;

  -- Ya estaba sin cargo.
  if new.paid_at is not null and old.paid_at is null then
    raise exception 'La sesión está sin cargo: volvela a pendiente antes de cobrarla.';
  end if;
  if new.status <> old.status then
    raise exception 'La sesión está sin cargo: volvela a pendiente antes de cancelarla.';
  end if;
  if new.starts_at <> old.starts_at then
    raise exception 'La sesión está sin cargo: volvela a pendiente antes de reprogramarla.';
  end if;

  return new;
end;
$$;

create trigger sessions_waived_guard
  before update on public.sessions
  for each row execute function public.sessions_waived_guard();


-- -----------------------------------------------------------------------------
-- Dejar una sesión sin cargo y deshacerlo.
-- -----------------------------------------------------------------------------
create function public.waive_session(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.sessions
     set waived_at = now()
   where id = p_session_id and waived_at is null;

  if not found then
    raise exception 'La sesión no existe o ya está sin cargo.';
  end if;
end;
$$;

create function public.unwaive_session(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.sessions
     set waived_at = null
   where id = p_session_id and waived_at is not null;

  if not found then
    raise exception 'La sesión no existe o no está sin cargo.';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- Vistas: waived_at va al final (create or replace view no permite cambiar el orden).
-- -----------------------------------------------------------------------------
create or replace view public.session_payments
with (security_invoker = true) as
select
  s.id,
  s.patient_id,
  p.first_name,
  p.last_name,
  s.starts_at,
  coalesce(s.fee, p.session_fee, pr.default_session_fee) as fee,
  s.paid_at,
  s.payment_method,
  s.status,
  s.waived_at
from public.sessions s
join public.patients p  on p.id = s.patient_id
join public.profiles pr on pr.id = s.psychologist_id;

create or replace view public.calendar_sessions
with (security_invoker = true) as
select
  s.id,
  s.patient_id,
  s.series_id,
  s.starts_at,
  s.ends_at,
  s.duration_minutes,
  s.status,
  s.rescheduled_from,
  p.first_name,
  p.last_name,
  p.phone,
  (ss.id is not null and ss.end_date is null) as series_active,
  coalesce(s.modality, p.modality) as modality,
  s.paid_at,
  s.waived_at
from public.sessions s
join public.patients p on p.id = s.patient_id
left join public.session_series ss on ss.id = s.series_id;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.sessions_waived_guard() from public, anon;
revoke execute on function public.waive_session(uuid) from public, anon;
revoke execute on function public.unwaive_session(uuid) from public, anon;

grant execute on function public.sessions_waived_guard() to authenticated;
grant execute on function public.waive_session(uuid) to authenticated;
grant execute on function public.unwaive_session(uuid) to authenticated;

grant select on public.session_payments to authenticated;
grant select on public.calendar_sessions to authenticated;
