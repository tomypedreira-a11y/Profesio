-- =============================================================================
-- Profesio · Vacaciones
-- - El psicólogo carga períodos de vacaciones (fechas "de reloj", en su zona horaria).
--   Puede tener varios, sin superponerse.
-- - Durante las vacaciones no hay sesiones de horarios fijos: al cargar un período se
--   borran las futuras que caen adentro, la generación las saltea y un trigger impide
--   agendarlas, reprogramarlas o reactivarlas en esas fechas.
-- - Las sesiones sueltas sí se pueden agendar (urgencias), de cualquier paciente.
-- - Las canceladas de horario fijo no se borran (así, al quitar las vacaciones, no
--   vuelven como agendadas): el calendario las oculta en esos días.
-- - Al quitar un período, los horarios fijos vuelven a generar esas fechas.
-- =============================================================================


create table public.vacations (
  id              uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  start_date      date not null,
  end_date        date not null,
  created_at      timestamptz not null default now(),

  check (end_date >= start_date),
  -- Los períodos de un psicólogo no se superponen.
  constraint vacations_no_overlap exclude using gist (
    psychologist_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
);

create trigger vacations_audit after insert or update or delete on public.vacations
  for each row execute function public.write_audit_log();

alter table public.vacations enable row level security;

create policy "vacations: solo las propias" on public.vacations for all
  to authenticated
  using (psychologist_id = (select auth.uid()))
  with check (psychologist_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- Si un momento cae en las vacaciones del psicólogo (según el día en su zona horaria).
-- -----------------------------------------------------------------------------
create function public.in_vacation(p_psychologist_id uuid, p_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
      from public.vacations v
      join public.profiles p on p.id = v.psychologist_id
     where v.psychologist_id = p_psychologist_id
       and (p_at at time zone p.timezone)::date between v.start_date and v.end_date
  );
$$;


-- -----------------------------------------------------------------------------
-- Ninguna sesión de horario fijo agendada en vacaciones (al crearla, reprogramarla
-- o deshacer su cancelación). Las sueltas no se controlan: son las urgencias.
-- -----------------------------------------------------------------------------
create function public.sessions_vacation_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tz text;
begin
  if public.in_vacation(new.psychologist_id, new.starts_at) then
    select timezone into tz from public.profiles where id = new.psychologist_id;
    raise exception 'El % estás de vacaciones: no hay sesiones de horario fijo. Si es una urgencia, agendá una sesión suelta.',
      to_char(new.starts_at at time zone tz, 'DD/MM')
      using errcode = 'P0001', hint = 'vacation';
  end if;
  return new;
end;
$$;

create trigger sessions_vacation_guard
  before insert or update of starts_at, status on public.sessions
  for each row
  when (new.series_id is not null and new.status = 'scheduled')
  execute function public.sessions_vacation_guard();


-- -----------------------------------------------------------------------------
-- Generar sesiones: saltea las fechas de vacaciones (sin cortar el ciclo de la
-- frecuencia) y, con p_from, las que empiezan antes de ese momento.
-- -----------------------------------------------------------------------------
drop function public.generate_series_sessions(uuid, date, boolean);

create function public.generate_series_sessions(
  p_series_id      uuid,
  p_until          date,
  p_skip_conflicts boolean default false,
  p_from           timestamptz default null
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  s        public.session_series%rowtype;
  step     integer;
  d        date;
  at_ts    timestamptz;
  last_day date;
  created  integer := 0;
  n        integer;
begin
  select * into s from public.session_series where id = p_series_id;
  if not found then
    raise exception 'La serie no existe.';
  end if;

  step := 7 * public.frequency_weeks(s.frequency);
  last_day := least(p_until, coalesce(s.end_date, p_until));
  d := s.start_date;

  while d <= last_day loop
    at_ts := (d + s.start_time) at time zone s.timezone;
    if (p_from is null or at_ts >= p_from) and not public.in_vacation(s.psychologist_id, at_ts) then
      begin
        insert into public.sessions
          (psychologist_id, patient_id, series_id, series_occurrence, starts_at, duration_minutes)
        values
          (s.psychologist_id, s.patient_id, s.id, d, at_ts, s.duration_minutes)
        on conflict (series_id, series_occurrence) do nothing;
        get diagnostics n = row_count;
        created := created + n;
      exception when exclusion_violation then
        if not p_skip_conflicts then
          raise exception 'El horario se superpone con otra sesión el %.', to_char(d, 'DD/MM/YYYY')
            using errcode = 'P0001', hint = 'schedule_conflict';
        end if;
      end;
    end if;
    d := d + step;
  end loop;

  update public.session_series
     set generated_until = greatest(coalesce(generated_until, last_day), last_day)
   where id = s.id;

  return created;
end;
$$;


-- -----------------------------------------------------------------------------
-- Cargar vacaciones: borra las sesiones futuras de horarios fijos que caen adentro.
-- Si alguna está cobrada o tiene anotación, no se carga nada (hay que resolverla antes).
-- Devuelve cuántas sesiones se quitaron.
-- -----------------------------------------------------------------------------
create function public.add_vacation(p_start date, p_end date)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  tz      text;
  blocked timestamptz;
  removed integer;
begin
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'Revisá las fechas: la vuelta no puede ser antes del inicio.';
  end if;

  select timezone into tz from public.profiles where id = auth.uid();
  if tz is null then
    raise exception 'No se encontró el perfil del usuario.';
  end if;

  if p_end < (now() at time zone tz)::date then
    raise exception 'Las vacaciones no pueden terminar antes de hoy.';
  end if;

  begin
    insert into public.vacations (start_date, end_date) values (p_start, p_end);
  exception when exclusion_violation then
    raise exception 'Esas fechas se superponen con otras vacaciones que ya cargaste.'
      using errcode = 'P0001';
  end;

  select s.starts_at into blocked
    from public.sessions s
   where s.psychologist_id = auth.uid()
     and s.series_id is not null
     and s.status = 'scheduled'
     and s.starts_at > now()
     and (s.starts_at at time zone tz)::date between p_start and p_end
     and (s.paid_at is not null or exists (select 1 from public.session_notes n where n.session_id = s.id))
   order by s.starts_at
   limit 1;

  if found then
    raise exception 'La sesión del % está cobrada o tiene una anotación: desmarcá el cobro o reprogramala antes de cargar las vacaciones.',
      to_char(blocked at time zone tz, 'DD/MM "a las" HH24:MI')
      using errcode = 'P0001';
  end if;

  delete from public.sessions s
   where s.psychologist_id = auth.uid()
     and s.series_id is not null
     and s.status = 'scheduled'
     and s.starts_at > now()
     and (s.starts_at at time zone tz)::date between p_start and p_end;
  get diagnostics removed = row_count;

  return removed;
end;
$$;


-- -----------------------------------------------------------------------------
-- Quitar vacaciones: los horarios fijos (de pacientes activos) vuelven a generar las
-- sesiones de esas fechas que todavía no pasaron. Si alguna choca con una sesión
-- agendada mientras tanto, esa fecha se saltea. Devuelve cuántas sesiones se generaron.
-- -----------------------------------------------------------------------------
create function public.remove_vacation(p_vacation_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v       public.vacations%rowtype;
  tz      text;
  s       record;
  created integer := 0;
begin
  delete from public.vacations where id = p_vacation_id returning * into v;
  if not found then
    raise exception 'Esas vacaciones no existen.';
  end if;

  select timezone into tz from public.profiles where id = auth.uid();

  for s in
    select ss.id, ss.generated_until
      from public.session_series ss
      join public.patients p on p.id = ss.patient_id and p.active
     where ss.start_date <= v.end_date
       and (ss.end_date is null or ss.end_date >= v.start_date)
       and ss.generated_until is not null
  loop
    created := created + public.generate_series_sessions(
      s.id,
      least(v.end_date, s.generated_until),
      true,
      greatest(now(), v.start_date::timestamp at time zone tz)
    );
  end loop;

  return created;
end;
$$;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
grant select, insert, delete on public.vacations to authenticated;

revoke execute on function public.in_vacation(uuid, timestamptz) from public, anon;
revoke execute on function public.sessions_vacation_guard() from public, anon;
revoke execute on function public.generate_series_sessions(uuid, date, boolean, timestamptz) from public, anon;
revoke execute on function public.add_vacation(date, date) from public, anon;
revoke execute on function public.remove_vacation(uuid) from public, anon;

grant execute on function public.in_vacation(uuid, timestamptz) to authenticated;
grant execute on function public.sessions_vacation_guard() to authenticated;
grant execute on function public.generate_series_sessions(uuid, date, boolean, timestamptz) to authenticated;
grant execute on function public.add_vacation(date, date) to authenticated;
grant execute on function public.remove_vacation(uuid) to authenticated;
