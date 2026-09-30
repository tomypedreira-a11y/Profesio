-- =============================================================================
-- Profesio · Cobro por adelantado
-- - Una sesión futura (no cancelada) también se puede cobrar: el valor se fija al cobrarla.
-- - session_payments trae todas las sesiones no canceladas (pasadas y futuras);
--   cada pantalla filtra: realizadas = starts_at <= now().
-- - Una sesión cobrada por adelantado se puede reprogramar mientras no se haya realizado
--   (el cobro la acompaña). Cancelarla o borrarla sigue pidiendo deshacer el cobro antes.
-- - Al deshacer el cobro de una sesión futura, su valor vuelve a seguir al del paciente o el perfil.
-- =============================================================================


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
  s.payment_method
from public.sessions s
join public.patients p  on p.id = s.patient_id
join public.profiles pr on pr.id = s.psychologist_id
where s.status = 'scheduled';


create or replace function public.mark_session_unpaid(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.sessions
     set paid_at = null,
         payment_method = null,
         -- Una sesión futura vuelve a tomar el valor vigente; una realizada conserva el que regía.
         fee = case when starts_at > now() then null else fee end
   where id = p_session_id and paid_at is not null;

  if not found then
    raise exception 'La sesión no existe o no está cobrada.';
  end if;
end;
$$;


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
    if new.status <> old.status then
      raise exception 'La sesión está cobrada: desmarcá el cobro antes de cancelarla.';
    end if;
    if new.starts_at <> old.starts_at and old.starts_at <= now() then
      raise exception 'La sesión ya se realizó y está cobrada: desmarcá el cobro antes de reprogramarla.';
    end if;
  end if;

  if new.paid_at is not null and old.paid_at is null and new.status <> 'scheduled' then
    raise exception 'Una sesión cancelada no se cobra.';
  end if;

  return new;
end;
$$;
