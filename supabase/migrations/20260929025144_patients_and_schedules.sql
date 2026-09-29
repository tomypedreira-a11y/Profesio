-- =============================================================================
-- Profesio · Etapa 3: pacientes y horarios fijos
-- - Ajusta los datos del paciente (fecha de nacimiento, valor por sesión, etc.).
-- - Funciones para crear/editar un paciente junto con su horario fijo semanal,
--   generando las sesiones de forma atómica (todo o nada).
-- - Vista con la última y la próxima sesión de cada paciente, para el listado.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Datos del paciente
-- -----------------------------------------------------------------------------
alter table public.patients
  drop column is_minor,
  drop column alt_phone,
  alter column phone drop not null,
  drop constraint if exists patients_phone_check,
  add column birth_date  date,
  add column session_fee numeric(12, 2) check (session_fee is null or session_fee >= 0);

-- El teléfono se guarda en formato internacional (E.164), ej: +5491123456789.
alter table public.patients
  add constraint patients_phone_format check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$');

-- Vacío = sin dato (evita guardar strings vacíos).
alter table public.patients
  add constraint patients_dni_not_blank   check (dni is null or length(trim(dni)) > 0),
  add constraint patients_email_not_blank check (email is null or length(trim(email)) > 0);

-- Un mismo psicólogo no puede cargar dos pacientes con el mismo DNI.
create unique index patients_unique_dni
  on public.patients (psychologist_id, dni) where dni is not null;


-- -----------------------------------------------------------------------------
-- Genera las sesiones de una serie hasta p_until (incluido).
-- Idempotente: si una fecha ya tiene su sesión, no la duplica.
-- Si una sesión choca con otra existente, falla con un mensaje claro.
-- -----------------------------------------------------------------------------
create or replace function public.generate_series_sessions(p_series_id uuid, p_until date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  s        public.session_series%rowtype;
  step     integer;
  d        date;
  last_day date;
  created  integer := 0;
  n        integer;
begin
  select * into s from public.session_series where id = p_series_id;
  if not found then
    raise exception 'La serie no existe.';
  end if;

  step := case s.frequency when 'weekly' then 7 when 'biweekly' then 14 end;
  last_day := least(p_until, coalesce(s.end_date, p_until));
  d := s.start_date;

  while d <= last_day loop
    begin
      insert into public.sessions
        (psychologist_id, patient_id, series_id, series_occurrence, starts_at, duration_minutes)
      values
        (s.psychologist_id, s.patient_id, s.id, d,
         (d + s.start_time) at time zone s.timezone, s.duration_minutes)
      on conflict (series_id, series_occurrence) do nothing;
      get diagnostics n = row_count;
      created := created + n;
    exception when exclusion_violation then
      raise exception 'El horario se superpone con otra sesión el %.', to_char(d, 'DD/MM/YYYY')
        using errcode = 'P0001', hint = 'schedule_conflict';
    end;
    d := d + step;
  end loop;

  update public.session_series
     set generated_until = greatest(coalesce(generated_until, last_day), last_day)
   where id = s.id;

  return created;
end;
$$;


-- -----------------------------------------------------------------------------
-- Horario fijo de un paciente.
-- p_weekday: 0 = domingo … 6 = sábado. null = paciente irregular (sin horario fijo).
-- - Cierra el horario fijo anterior (si había) y borra sus sesiones futuras
--   que no tengan notas.
-- - Si se indica un día, crea un horario semanal que empieza en la próxima
--   ocurrencia de ese día y horario, y genera las sesiones de los próximos 12 meses.
-- -----------------------------------------------------------------------------
create or replace function public.set_patient_schedule(
  p_patient_id uuid,
  p_weekday    integer,
  p_start_time time
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  tz         text;
  local_now  timestamp;
  today      date;
  first_date date;
  old        public.session_series%rowtype;
  new_id     uuid;
begin
  if p_weekday is not null and (p_weekday < 0 or p_weekday > 6 or p_start_time is null) then
    raise exception 'Día u horario inválido.';
  end if;

  -- La zona horaria del psicólogo (RLS: solo ve su propio perfil).
  select timezone into tz from public.profiles where id = auth.uid();
  if tz is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if not exists (select 1 from public.patients where id = p_patient_id) then
    raise exception 'El paciente no existe.';
  end if;

  local_now := now() at time zone tz;
  today := local_now::date;

  -- Si el horario no cambia, no hay nada que hacer.
  select * into old from public.session_series
   where patient_id = p_patient_id and end_date is null
   order by created_at desc limit 1;

  if found
     and p_weekday is not null
     and extract(dow from old.start_date)::integer = p_weekday
     and old.start_time = p_start_time then
    return;
  end if;

  -- Cerrar los horarios fijos activos y borrar sus sesiones futuras sin notas.
  for old in
    select * from public.session_series
     where patient_id = p_patient_id and end_date is null
  loop
    delete from public.sessions ss
     where ss.series_id = old.id
       and ss.starts_at > now()
       and not exists (select 1 from public.session_notes n where n.session_id = ss.id);

    if exists (select 1 from public.sessions where series_id = old.id) then
      update public.session_series
         set end_date = greatest(old.start_date, today)
       where id = old.id;
    else
      delete from public.session_series where id = old.id;
    end if;
  end loop;

  if p_weekday is null then
    return;
  end if;

  -- Próxima ocurrencia del día y horario elegidos (hoy, si el horario todavía no pasó).
  first_date := today + ((p_weekday - extract(dow from today)::integer + 7) % 7);
  if first_date = today and p_start_time <= local_now::time then
    first_date := first_date + 7;
  end if;

  insert into public.session_series (patient_id, frequency, start_date, start_time, timezone)
  values (p_patient_id, 'weekly', first_date, p_start_time, tz)
  returning id into new_id;

  perform public.generate_series_sessions(new_id, (today + interval '12 months')::date);
end;
$$;


-- -----------------------------------------------------------------------------
-- Crear un paciente con su horario (en una sola operación).
-- -----------------------------------------------------------------------------
create or replace function public.create_patient(
  p_first_name  text,
  p_last_name   text,
  p_phone       text    default null,
  p_dni         text    default null,
  p_email       text    default null,
  p_birth_date  date    default null,
  p_session_fee numeric default null,
  p_weekday     integer default null,
  p_start_time  time    default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.patients (first_name, last_name, phone, dni, email, birth_date, session_fee)
  values (p_first_name, p_last_name, p_phone, p_dni, p_email, p_birth_date, p_session_fee)
  returning id into new_id;

  if p_weekday is not null then
    perform public.set_patient_schedule(new_id, p_weekday, p_start_time);
  end if;

  return new_id;
end;
$$;


-- -----------------------------------------------------------------------------
-- Editar un paciente y su horario (en una sola operación).
-- -----------------------------------------------------------------------------
create or replace function public.update_patient(
  p_patient_id  uuid,
  p_first_name  text,
  p_last_name   text,
  p_phone       text    default null,
  p_dni         text    default null,
  p_email       text    default null,
  p_birth_date  date    default null,
  p_session_fee numeric default null,
  p_weekday     integer default null,
  p_start_time  time    default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.patients
     set first_name  = p_first_name,
         last_name   = p_last_name,
         phone       = p_phone,
         dni         = p_dni,
         email       = p_email,
         birth_date  = p_birth_date,
         session_fee = p_session_fee
   where id = p_patient_id;

  if not found then
    raise exception 'El paciente no existe.';
  end if;

  perform public.set_patient_schedule(p_patient_id, p_weekday, p_start_time);
end;
$$;


-- -----------------------------------------------------------------------------
-- Archivar / reactivar. Al archivar se quita el horario fijo y sus sesiones futuras.
-- -----------------------------------------------------------------------------
create or replace function public.set_patient_archived(p_patient_id uuid, p_archived boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_archived then
    perform public.set_patient_schedule(p_patient_id, null, null);
  end if;

  update public.patients set active = not p_archived where id = p_patient_id;
  if not found then
    raise exception 'El paciente no existe.';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- Vista para el listado: cada paciente con su horario fijo,
-- su última sesión y su próxima sesión (sin contar canceladas).
-- -----------------------------------------------------------------------------
create view public.patient_list
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
    where s.patient_id = p.id and s.status = 'scheduled' and s.starts_at > now())  as next_session_at
from public.patients p
left join lateral (
  select extract(dow from ss.start_date)::integer as weekday, ss.start_time
    from public.session_series ss
   where ss.patient_id = p.id and ss.end_date is null
   order by ss.created_at desc
   limit 1
) sch on true;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke execute on function public.generate_series_sessions(uuid, date) from public, anon;
revoke execute on function public.set_patient_schedule(uuid, integer, time) from public, anon;
revoke execute on function public.create_patient(text, text, text, text, text, date, numeric, integer, time) from public, anon;
revoke execute on function public.update_patient(uuid, text, text, text, text, text, date, numeric, integer, time) from public, anon;
revoke execute on function public.set_patient_archived(uuid, boolean) from public, anon;

grant execute on function public.generate_series_sessions(uuid, date) to authenticated;
grant execute on function public.set_patient_schedule(uuid, integer, time) to authenticated;
grant execute on function public.create_patient(text, text, text, text, text, date, numeric, integer, time) to authenticated;
grant execute on function public.update_patient(uuid, text, text, text, text, text, date, numeric, integer, time) to authenticated;
grant execute on function public.set_patient_archived(uuid, boolean) to authenticated;

grant select on public.patient_list to authenticated;