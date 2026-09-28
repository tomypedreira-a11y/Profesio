-- =============================================================================
-- Profesio · Migración inicial
-- Tablas, restricciones, reglas de seguridad (RLS), permisos y triggers del MVP.
-- =============================================================================

-- Extensión necesaria para la restricción de "sin sesiones superpuestas".
create extension if not exists btree_gist with schema extensions;


-- -----------------------------------------------------------------------------
-- Funciones auxiliares
-- -----------------------------------------------------------------------------

-- Actualiza la columna updated_at en cada modificación.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- profiles: datos del psicólogo (1 a 1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  first_name     text not null default '',
  last_name      text not null default '',
  license_number text,                                          -- matrícula (opcional)
  theme          text not null default 'system'
                 check (theme in ('light', 'dark', 'system')),
  timezone       text not null default 'America/Argentina/Buenos_Aires',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente cuando alguien se registra.
-- Nombre y apellido llegan en los metadatos del registro (options.data en signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- patients
-- -----------------------------------------------------------------------------
create table public.patients (
  id              uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  first_name      text not null check (length(trim(first_name)) > 0),
  last_name       text not null check (length(trim(last_name)) > 0),
  phone           text not null check (length(trim(phone)) > 0),
  dni             text,
  email           text,
  alt_phone       text,                       -- teléfono alternativo (ej. menores)
  is_minor        boolean not null default false,
  active          boolean not null default true,  -- se archiva, no se borra
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Permite que las otras tablas verifiquen que el paciente es del mismo psicólogo.
  unique (id, psychologist_id)
);

create index patients_psychologist_idx on public.patients (psychologist_id, last_name, first_name);

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- session_series: regla de una sesión recurrente
-- El día de la semana es el de start_date. La hora es "de reloj" en `timezone`,
-- así un cambio de horario de verano no corre las sesiones.
-- -----------------------------------------------------------------------------
create table public.session_series (
  id               uuid primary key default gen_random_uuid(),
  psychologist_id  uuid not null default auth.uid()
                   references public.profiles (id) on delete cascade,
  patient_id       uuid not null,
  frequency        text not null check (frequency in ('weekly', 'biweekly')),
  start_date       date not null,
  start_time       time not null,
  end_date         date,                           -- null = indefinida
  duration_minutes integer not null default 45 check (duration_minutes > 0),
  timezone         text not null default 'America/Argentina/Buenos_Aires',
  generated_until  date,                           -- hasta dónde ya hay sesiones creadas
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  unique (id, psychologist_id),
  foreign key (patient_id, psychologist_id)
    references public.patients (id, psychologist_id)
);

create index session_series_patient_idx on public.session_series (patient_id);

create trigger session_series_set_updated_at
  before update on public.session_series
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- sessions: cada sesión concreta (suelta o generada por una serie)
-- -----------------------------------------------------------------------------
create table public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  psychologist_id    uuid not null default auth.uid()
                     references public.profiles (id) on delete cascade,
  patient_id         uuid not null,
  series_id          uuid,                        -- null = sesión suelta
  series_occurrence  date,                        -- fecha original dentro de la serie
  starts_at          timestamptz not null,
  duration_minutes   integer not null default 45 check (duration_minutes > 0),
  ends_at            timestamptz not null,        -- lo calcula un trigger
  status             text not null default 'scheduled'
                     check (status in ('scheduled', 'cancelled')),
  rescheduled_from   timestamptz,                 -- horario anterior si se reprogramó
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  unique (id, psychologist_id),
  foreign key (patient_id, psychologist_id)
    references public.patients (id, psychologist_id),
  foreign key (series_id, psychologist_id)
    references public.session_series (id, psychologist_id),

  -- Una sesión de serie siempre sabe a qué fecha de la serie corresponde.
  check ((series_id is null) = (series_occurrence is null)),
  -- Evita duplicados al generar/extender una serie (generación idempotente).
  unique (series_id, series_occurrence),
  -- Un psicólogo no puede tener dos sesiones no canceladas superpuestas.
  constraint sessions_no_overlap exclude using gist (
    psychologist_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'scheduled')
);

create index sessions_calendar_idx on public.sessions (psychologist_id, starts_at);
create index sessions_patient_idx  on public.sessions (patient_id, starts_at);

-- Calcula ends_at y registra datos de cancelación / reprogramación.
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

    if new.starts_at <> old.starts_at and new.rescheduled_from is not distinct from old.rescheduled_from then
      new.rescheduled_from := old.starts_at;
    end if;
  end if;

  return new;
end;
$$;

create trigger sessions_before_write
  before insert or update on public.sessions
  for each row execute function public.sessions_before_write();

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- session_notes: anotaciones por sesión, con versiones
-- - Un borrador ('draft') se edita libremente.
-- - Una nota final ('final') no se modifica ni se borra (Ley 26.529).
-- - Para corregir una nota final se inserta una versión nueva con supersedes_id.
-- -----------------------------------------------------------------------------
create table public.session_notes (
  id              uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  session_id      uuid not null,
  content         text not null default '',
  status          text not null default 'draft' check (status in ('draft', 'final')),
  version         integer not null default 1 check (version >= 1),
  supersedes_id   uuid unique references public.session_notes (id),
  finalized_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (session_id, psychologist_id)
    references public.sessions (id, psychologist_id)
);

-- Una sola "primera versión" por sesión; las siguientes cuelgan de supersedes_id.
create unique index session_notes_one_root_per_session
  on public.session_notes (session_id) where supersedes_id is null;

create index session_notes_session_idx on public.session_notes (session_id);

create or replace function public.session_notes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prev public.session_notes%rowtype;
begin
  if tg_op = 'DELETE' then
    if old.status = 'final' then
      raise exception 'Una nota finalizada no se puede borrar.';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'final' then
      raise exception 'Una nota finalizada no se puede modificar. Creá una versión nueva.';
    end if;
    if new.session_id <> old.session_id
       or new.supersedes_id is distinct from old.supersedes_id
       or new.version <> old.version then
      raise exception 'No se puede cambiar la sesión ni la versión de una nota.';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.supersedes_id is null then
      new.version := 1;
    else
      select * into prev from public.session_notes where id = new.supersedes_id;
      if not found then
        raise exception 'La nota que se quiere corregir no existe.';
      end if;
      if prev.status <> 'final' then
        raise exception 'Solo se corrige con una versión nueva una nota finalizada; un borrador se edita directamente.';
      end if;
      if prev.session_id <> new.session_id then
        raise exception 'La corrección tiene que ser de la misma sesión.';
      end if;
      new.version := prev.version + 1;
    end if;
  end if;

  if new.status = 'final' then
    new.finalized_at := coalesce(new.finalized_at, now());
  else
    new.finalized_at := null;
  end if;

  return new;
end;
$$;

create trigger session_notes_guard
  before insert or update or delete on public.session_notes
  for each row execute function public.session_notes_guard();

create trigger session_notes_set_updated_at
  before update on public.session_notes
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- Libro de sesiones: última versión de cada nota, con los datos de la sesión.
-- security_invoker hace que la vista respete el RLS de quien consulta.
-- -----------------------------------------------------------------------------
create view public.session_book
with (security_invoker = true) as
select
  n.id            as note_id,
  n.session_id,
  s.patient_id,
  n.psychologist_id,
  s.starts_at,
  s.status        as session_status,
  n.content,
  n.status        as note_status,
  n.version,
  n.finalized_at,
  n.updated_at
from public.session_notes n
join public.sessions s on s.id = n.session_id
where not exists (
  select 1 from public.session_notes newer where newer.supersedes_id = n.id
);


-- -----------------------------------------------------------------------------
-- audit_log: registro de modificaciones (no de lecturas, por ahora)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id              bigint generated always as identity primary key,
  psychologist_id uuid not null,
  actor_id        uuid,
  table_name      text not null,
  record_id       uuid not null,
  action          text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data        jsonb,
  new_data        jsonb,
  created_at      timestamptz not null default now()
);

create index audit_log_psychologist_idx on public.audit_log (psychologist_id, created_at desc);

-- security definer: escribe en audit_log aunque el usuario no tenga permiso de insertar.
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (psychologist_id, actor_id, table_name, record_id, action, old_data, new_data)
  values (
    coalesce(new.psychologist_id, old.psychologist_id),
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger patients_audit       after insert or update or delete on public.patients
  for each row execute function public.write_audit_log();
create trigger session_series_audit after insert or update or delete on public.session_series
  for each row execute function public.write_audit_log();
create trigger sessions_audit       after insert or update or delete on public.sessions
  for each row execute function public.write_audit_log();
create trigger session_notes_audit  after insert or update or delete on public.session_notes
  for each row execute function public.write_audit_log();


-- -----------------------------------------------------------------------------
-- Row Level Security: cada psicólogo ve y modifica solo lo suyo
-- -----------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.patients       enable row level security;
alter table public.session_series enable row level security;
alter table public.sessions       enable row level security;
alter table public.session_notes  enable row level security;
alter table public.audit_log      enable row level security;

create policy "profiles: ver el propio"      on public.profiles for select
  to authenticated using (id = (select auth.uid()));
create policy "profiles: editar el propio"   on public.profiles for update
  to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "patients: solo los propios"   on public.patients for all
  to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));

create policy "series: solo las propias"     on public.session_series for all
  to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));

create policy "sessions: solo las propias"   on public.sessions for all
  to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));

create policy "notes: solo las propias"      on public.session_notes for all
  to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));

create policy "audit: ver el propio"         on public.audit_log for select
  to authenticated using (psychologist_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- Permisos de la API (las tablas nuevas no se exponen solas)
-- Solo usuarios logueados; el rol anónimo no accede a nada.
-- -----------------------------------------------------------------------------
grant select, update                 on public.profiles       to authenticated;
grant select, insert, update, delete on public.patients       to authenticated;
grant select, insert, update, delete on public.session_series to authenticated;
grant select, insert, update, delete on public.sessions       to authenticated;
grant select, insert, update, delete on public.session_notes  to authenticated;
grant select                         on public.session_book   to authenticated;
grant select                         on public.audit_log      to authenticated;