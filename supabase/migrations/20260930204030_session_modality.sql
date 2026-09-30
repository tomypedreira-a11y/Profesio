-- =============================================================================
-- Profesio · Modalidad de las sesiones: presencial o virtual
-- - Cada paciente tiene una modalidad (obligatoria; presencial por defecto).
-- - Cada sesión usa la del paciente (sessions.modality null) salvo que se cambie para
--   esa sesión. "Esta y las siguientes" cambia la del paciente de ahí en adelante.
-- - Como con el valor por sesión: al cambiar la del paciente, las sesiones ya
--   realizadas conservan la que tuvieron.
-- =============================================================================


alter table public.patients
  add column modality text not null default 'in_person'
    check (modality in ('in_person', 'virtual'));

-- null = la del paciente.
alter table public.sessions
  add column modality text
    check (modality in ('in_person', 'virtual'));


-- -----------------------------------------------------------------------------
-- Al cambiar la modalidad del paciente, las sesiones pasadas conservan la anterior.
-- -----------------------------------------------------------------------------
create function public.freeze_modality_on_patient_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.sessions
     set modality = old.modality
   where patient_id = old.id
     and modality is null
     and starts_at <= now();
  return new;
end;
$$;

create trigger patients_freeze_modality
  after update of modality on public.patients
  for each row
  when (old.modality is distinct from new.modality)
  execute function public.freeze_modality_on_patient_change();


-- -----------------------------------------------------------------------------
-- Cambiar la modalidad de una sesión: solo esta, o esta y las siguientes del paciente
-- (pasa a ser la modalidad del paciente; las anteriores conservan la que tenían).
-- -----------------------------------------------------------------------------
create function public.set_session_modality(p_session_id uuid, p_modality text, p_scope text default 'one')
returns void
language plpgsql
set search_path = ''
as $$
declare
  sess     public.sessions%rowtype;
  previous text;
begin
  if p_modality is null or p_modality not in ('in_person', 'virtual') then
    raise exception 'Elegí presencial o virtual.';
  end if;

  select * into sess from public.sessions where id = p_session_id;
  if not found then
    raise exception 'La sesión no existe.';
  end if;

  if p_scope = 'one' then
    update public.sessions set modality = p_modality where id = sess.id;
    return;
  end if;

  if p_scope <> 'following' then
    raise exception 'Alcance inválido.';
  end if;
  if sess.starts_at <= now() then
    raise exception 'Una sesión que ya pasó solo se puede cambiar a ella sola.';
  end if;

  -- Las anteriores (también las futuras antes de esta) conservan la que tenían.
  select modality into previous from public.patients where id = sess.patient_id;
  update public.sessions
     set modality = previous
   where patient_id = sess.patient_id
     and modality is null
     and starts_at < sess.starts_at;

  update public.patients set modality = p_modality where id = sess.patient_id;

  -- Esta y las siguientes siguen la del paciente (también las que se generen después).
  update public.sessions
     set modality = null
   where patient_id = sess.patient_id
     and modality is not null
     and starts_at >= sess.starts_at;
end;
$$;


-- -----------------------------------------------------------------------------
-- Vistas: la modalidad de cada sesión (propia o la del paciente) y la del paciente.
-- Las columnas nuevas van al final: create or replace view no permite cambiar el orden.
-- -----------------------------------------------------------------------------
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
  coalesce(s.modality, p.modality) as modality
from public.sessions s
join public.patients p on p.id = s.patient_id
left join public.session_series ss on ss.id = s.series_id;

create or replace view public.patient_list
with (security_invoker = true) as
select
  p.id,
  p.first_name,
  p.last_name,
  p.phone,
  p.dni,
  p.email,
  p.birth_date,
  p.session_fee,
  p.active,
  p.created_at,
  sch.weekday,
  sch.start_time,
  (select max(s.starts_at) from public.sessions s
    where s.patient_id = p.id and s.status = 'scheduled' and s.starts_at <= now()) as last_session_at,
  (select min(s.starts_at) from public.sessions s
    where s.patient_id = p.id and s.status = 'scheduled' and s.starts_at > now())  as next_session_at,
  (select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'weekday',    extract(dow from ss.start_date)::integer,
                'start_time', to_char(ss.start_time, 'HH24:MI'),
                'end_time',   to_char(ss.start_time + make_interval(mins => ss.duration_minutes), 'HH24:MI'),
                'frequency',  ss.frequency,
                'start_date', to_char(ss.start_date, 'YYYY-MM-DD'))
              order by (extract(dow from ss.start_date)::integer + 6) % 7, ss.start_time),
            '[]'::jsonb)
     from public.session_series ss
    where ss.patient_id = p.id and ss.end_date is null) as schedules,
  p.modality
from public.patients p
left join lateral (
  select extract(dow from ss.start_date)::integer as weekday, ss.start_time
    from public.session_series ss
   where ss.patient_id = p.id and ss.end_date is null
   order by ss.created_at desc
   limit 1
) sch on true;


-- -----------------------------------------------------------------------------
-- Alta y edición de pacientes: con modalidad. Al editar, sin modalidad conserva la actual.
-- -----------------------------------------------------------------------------
drop function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time, time);
drop function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time, time);

create function public.create_patient_with_schedules(
  p_first_name       text,
  p_last_name        text,
  p_phone            text    default null,
  p_dni              text    default null,
  p_email            text    default null,
  p_birth_date       date    default null,
  p_session_fee      numeric default null,
  p_schedules        jsonb   default '[]',
  p_session_date     date    default null,
  p_session_time     time    default null,
  p_session_end_time time    default null,
  p_modality         text    default 'in_person'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if (p_session_date is null) <> (p_session_time is null) then
    raise exception 'Elegí la fecha y el horario de la sesión.';
  end if;

  insert into public.patients (first_name, last_name, phone, dni, email, birth_date, session_fee, modality)
  values (p_first_name, p_last_name, p_phone, p_dni, p_email, p_birth_date, p_session_fee,
          coalesce(p_modality, 'in_person'))
  returning id into new_id;

  perform public.add_patient_schedules(new_id, coalesce(p_schedules, '[]'));

  if p_session_date is not null then
    perform public.schedule_session(new_id, p_session_date, p_session_time, p_session_end_time);
  end if;

  return new_id;
end;
$$;

create function public.update_patient_with_schedules(
  p_patient_id       uuid,
  p_first_name       text,
  p_last_name        text,
  p_phone            text    default null,
  p_dni              text    default null,
  p_email            text    default null,
  p_birth_date       date    default null,
  p_session_fee      numeric default null,
  p_schedules        jsonb   default '[]',
  p_session_date     date    default null,
  p_session_time     time    default null,
  p_session_end_time time    default null,
  p_modality         text    default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if (p_session_date is null) <> (p_session_time is null) then
    raise exception 'Elegí la fecha y el horario de la sesión.';
  end if;

  update public.patients
     set first_name  = p_first_name,
         last_name   = p_last_name,
         phone       = p_phone,
         dni         = p_dni,
         email       = p_email,
         birth_date  = p_birth_date,
         session_fee = p_session_fee,
         modality    = coalesce(p_modality, modality)
   where id = p_patient_id;

  if not found then
    raise exception 'El paciente no existe.';
  end if;

  perform public.replace_patient_schedules(p_patient_id, coalesce(p_schedules, '[]'));

  if p_session_date is not null then
    perform public.schedule_session(p_patient_id, p_session_date, p_session_time, p_session_end_time);
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- Permisos (las vistas reemplazadas conservan los suyos)
-- -----------------------------------------------------------------------------
revoke execute on function public.freeze_modality_on_patient_change() from public, anon;
revoke execute on function public.set_session_modality(uuid, text, text) from public, anon;
revoke execute on function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time, time, text) from public, anon;
revoke execute on function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time, time, text) from public, anon;

grant execute on function public.freeze_modality_on_patient_change() to authenticated;
grant execute on function public.set_session_modality(uuid, text, text) to authenticated;
grant execute on function public.create_patient_with_schedules(text, text, text, text, text, date, numeric, jsonb, date, time, time, text) to authenticated;
grant execute on function public.update_patient_with_schedules(uuid, text, text, text, text, text, date, numeric, jsonb, date, time, time, text) to authenticated;
