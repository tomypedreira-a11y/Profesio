-- =============================================================================
-- Profesio · Cobro de sesiones canceladas
-- - Una sesión cancelada también se puede cobrar (ej. cancelación con poca anticipación).
-- - session_payments trae todas las sesiones, con su estado (status): cada pantalla filtra.
--   Lo adeudado y lo pendiente siguen siendo solo sesiones realizadas (no canceladas).
-- - Una sesión cobrada sigue sin poder cancelarse (primero se deshace el cobro), pero una
--   cancelada y cobrada sí puede volver a agendarse: el cobro la acompaña.
-- - Al cambiar el valor del paciente o del perfil, las canceladas ya pasadas también conservan
--   el valor que regía (por si se cobran después).
-- =============================================================================


-- La columna nueva va al final: create or replace view no permite cambiar el orden.
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
  s.status
from public.sessions s
join public.patients p  on p.id = s.patient_id
join public.profiles pr on pr.id = s.psychologist_id;


create or replace function public.sessions_payment_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.paid_at is not null then
      raise exception 'La sesión del % está cobrada: desmarcá el cobro antes de modificarla.', old.starts_at::date;
    end if;
    return old;
  end if;

  if old.paid_at is not null and new.paid_at is not null then
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      raise exception 'La sesión está cobrada: desmarcá el cobro antes de cancelarla.';
    end if;
    if new.starts_at <> old.starts_at and old.starts_at <= now() then
      raise exception 'La sesión ya se realizó y está cobrada: desmarcá el cobro antes de reprogramarla.';
    end if;
  end if;

  return new;
end;
$$;


create or replace function public.freeze_fees_on_patient_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  previous numeric(12, 2);
begin
  previous := coalesce(
    old.session_fee,
    (select pr.default_session_fee from public.profiles pr where pr.id = old.psychologist_id)
  );
  if previous is null then
    return new;
  end if;

  update public.sessions
     set fee = previous
   where patient_id = old.id
     and fee is null
     and starts_at <= now();

  return new;
end;
$$;


create or replace function public.freeze_fees_on_profile_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.sessions s
     set fee = old.default_session_fee
    from public.patients p
   where p.id = s.patient_id
     and p.session_fee is null
     and s.psychologist_id = old.id
     and s.fee is null
     and s.starts_at <= now();

  return new;
end;
$$;
