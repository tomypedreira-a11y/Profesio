-- =============================================================================
-- Profesio · Cobro de sesiones
-- - Cada sesión realizada (pasada y no cancelada) se cobra entera: paid_at + medio de pago.
-- - Valor de la sesión: sessions.fee si está fijado; si no, el del paciente o, sin ese,
--   el del perfil. Se fija (se copia a sessions.fee):
--     · al cobrarla;
--     · cuando cambia el valor del paciente o del perfil: las sesiones ya realizadas
--       conservan el valor que regía cuando ocurrieron.
-- - Una sesión cobrada no se cancela, reprograma ni borra (primero se desmarca el cobro).
-- =============================================================================


alter table public.sessions
  add column fee            numeric(12, 2) check (fee is null or fee >= 0),
  add column paid_at        timestamptz,
  add column payment_method text check (payment_method in ('cash', 'transfer', 'other')),
  add constraint sessions_payment_complete check ((paid_at is null) = (payment_method is null));

create index sessions_unpaid_idx on public.sessions (psychologist_id, starts_at)
  where paid_at is null and status = 'scheduled';


-- -----------------------------------------------------------------------------
-- Sesiones realizadas con su valor y estado de cobro (base de la pantalla Ingresos).
-- -----------------------------------------------------------------------------
create view public.session_payments
with (security_invoker = true) as
select
  s.id,
  s.patient_id,
  p.first_name,
  p.last_name,
  s.starts_at,
  coalesce(s.fee, p.session_fee, pr.default_session_fee) as fee,
  s.paid_at,
  s.payment_method
from public.sessions s
join public.patients p  on p.id = s.patient_id
join public.profiles pr on pr.id = s.psychologist_id
where s.status = 'scheduled'
  and s.starts_at <= now();


-- -----------------------------------------------------------------------------
-- Cobrar sesiones (una o varias, ej. "cobrar todo" de un paciente). Fija su valor.
-- -----------------------------------------------------------------------------
create function public.mark_sessions_paid(p_session_ids uuid[], p_method text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  updated integer;
begin
  if p_method is null or p_method not in ('cash', 'transfer', 'other') then
    raise exception 'Medio de pago inválido.';
  end if;

  if exists (
    select 1 from public.session_payments v
     where v.id = any(p_session_ids) and v.paid_at is null and v.fee is null
  ) then
    raise exception 'Hay sesiones sin valor: cargá el valor por sesión del paciente o el de tu perfil.';
  end if;

  update public.sessions s
     set paid_at        = now(),
         payment_method = p_method,
         fee            = v.fee
    from public.session_payments v
   where v.id = s.id
     and s.id = any(p_session_ids)
     and s.paid_at is null;

  get diagnostics updated = row_count;
  return updated;
end;
$$;


-- -----------------------------------------------------------------------------
-- Deshacer el cobro de una sesión (el valor queda fijado).
-- -----------------------------------------------------------------------------
create function public.mark_session_unpaid(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.sessions
     set paid_at = null, payment_method = null
   where id = p_session_id and paid_at is not null;

  if not found then
    raise exception 'La sesión no existe o no está cobrada.';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- Una sesión cobrada no se cancela, reprograma ni borra; solo se cobran sesiones que ya empezaron.
-- -----------------------------------------------------------------------------
create function public.sessions_payment_guard()
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

  if old.paid_at is not null and new.paid_at is not null
     and (new.status <> old.status or new.starts_at <> old.starts_at) then
    raise exception 'La sesión está cobrada: desmarcá el cobro antes de cancelarla o reprogramarla.';
  end if;

  if new.paid_at is not null and old.paid_at is null
     and (new.starts_at > now() or new.status <> 'scheduled') then
    raise exception 'Solo se pueden cobrar sesiones realizadas.';
  end if;

  return new;
end;
$$;

create trigger sessions_payment_guard
  before update or delete on public.sessions
  for each row execute function public.sessions_payment_guard();


-- -----------------------------------------------------------------------------
-- Al cambiar un valor, las sesiones ya realizadas sin valor fijado conservan el anterior.
-- -----------------------------------------------------------------------------
create function public.freeze_fees_on_patient_change()
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
     and status = 'scheduled'
     and starts_at <= now();

  return new;
end;
$$;

create trigger patients_freeze_fees
  after update of session_fee on public.patients
  for each row
  when (old.session_fee is distinct from new.session_fee)
  execute function public.freeze_fees_on_patient_change();

create function public.freeze_fees_on_profile_change()
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
     and s.status = 'scheduled'
     and s.starts_at <= now();

  return new;
end;
$$;

create trigger profiles_freeze_fees
  after update of default_session_fee on public.profiles
  for each row
  when (old.default_session_fee is not null and old.default_session_fee is distinct from new.default_session_fee)
  execute function public.freeze_fees_on_profile_change();


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.mark_sessions_paid(uuid[], text) from public, anon;
revoke execute on function public.mark_session_unpaid(uuid) from public, anon;
revoke execute on function public.sessions_payment_guard() from public, anon;
revoke execute on function public.freeze_fees_on_patient_change() from public, anon;
revoke execute on function public.freeze_fees_on_profile_change() from public, anon;

grant execute on function public.mark_sessions_paid(uuid[], text) to authenticated;
grant execute on function public.mark_session_unpaid(uuid) to authenticated;
grant execute on function public.sessions_payment_guard() to authenticated;
grant execute on function public.freeze_fees_on_patient_change() to authenticated;
grant execute on function public.freeze_fees_on_profile_change() to authenticated;

grant select on public.session_payments to authenticated;
