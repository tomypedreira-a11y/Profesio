-- =============================================================================
-- Profesio · Registro de las exportaciones del libro de sesiones (PDF)
-- Cada descarga de la copia de la historia clínica (Ley 26.529) queda en audit_log, como las modificaciones:
-- quién (actor_id), de qué paciente (table_name 'patients' + record_id) y cuándo (created_at), con
-- action = 'EXPORT'. new_data dice qué se exportó y cuántas anotaciones llevaba; nunca el contenido.
-- =============================================================================

alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in ('INSERT', 'UPDATE', 'DELETE', 'EXPORT'));

-- security definer: los usuarios no pueden escribir en audit_log (ni falsear filas); esta función solo agrega
-- la exportación de un paciente propio, con la fecha del servidor. Como no pasa por RLS, repite a mano las
-- condiciones de las políticas: lo propio y, con la verificación en dos pasos activada, una sesión aal2.
create function public.log_patient_export(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  notes integer;
begin
  if coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' and public.mfa_enabled() then
    raise exception 'Falta la verificación en dos pasos.' using errcode = '42501';
  end if;

  if uid is null or not exists (
    select 1 from public.patients where id = p_patient_id and psychologist_id = uid
  ) then
    raise exception 'El paciente no existe.' using errcode = 'P0002';
  end if;

  -- Sesiones con anotación finalizada: las que entran en el PDF (los borradores no).
  select count(distinct n.session_id) into notes
    from public.session_notes n
    join public.sessions s on s.id = n.session_id
   where s.patient_id = p_patient_id and n.psychologist_id = uid and n.status = 'final';

  insert into public.audit_log (psychologist_id, actor_id, table_name, record_id, action, new_data)
  values (uid, uid, 'patients', p_patient_id, 'EXPORT',
          jsonb_build_object('export', 'libro_pdf', 'notes', notes));
end;
$$;

revoke execute on function public.log_patient_export(uuid) from public, anon;
grant execute on function public.log_patient_export(uuid) to authenticated;
