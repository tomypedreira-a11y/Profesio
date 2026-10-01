-- =============================================================================
-- Profesio · Notificaciones push: recordatorio de sesión y resumen del día
-- - push_subscriptions: los dispositivos en que el psicólogo activó las notificaciones.
-- - Preferencias en profiles (valen para todos sus dispositivos).
-- - notification_log: lo ya enviado, para no repetir (el cron puede correr dos veces el mismo minuto).
-- - due_notifications: lo que hay que enviar en un minuto. La llama solo el cron (service_role).
-- Las notificaciones se ven en la pantalla bloqueada: nunca llevan contenido de anotaciones ni datos
-- clínicos; el nombre del paciente (nombre e inicial del apellido) solo si el psicólogo lo elige.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Preferencias
-- -----------------------------------------------------------------------------
alter table public.profiles
  -- Minutos antes de cada sesión; null = recordatorios apagados.
  add column reminder_minutes integer default 10
    check (reminder_minutes is null or reminder_minutes in (5, 10, 15, 30, 60)),
  add column daily_summary_enabled boolean not null default false,
  add column daily_summary_time time not null default '08:00',
  -- Mostrar nombre e inicial del apellido del paciente en el recordatorio.
  add column notification_show_name boolean not null default false;


-- -----------------------------------------------------------------------------
-- Dispositivos suscriptos (Web Push). endpoint es único: identifica al navegador.
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null default auth.uid()
                  references public.profiles (id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz
);

create index push_subscriptions_psychologist_idx on public.push_subscriptions (psychologist_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: ver las propias" on public.push_subscriptions for select
  to authenticated using (psychologist_id = (select auth.uid()));
create policy "push_subscriptions: crear las propias" on public.push_subscriptions for insert
  to authenticated with check (psychologist_id = (select auth.uid()));
create policy "push_subscriptions: borrar las propias" on public.push_subscriptions for delete
  to authenticated using (psychologist_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- Envíos hechos. Lo escribe solo el cron (antes de enviar): un envío ya registrado no se repite.
-- -----------------------------------------------------------------------------
create table public.notification_log (
  id              uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('session_reminder', 'daily_summary')),
  session_id      uuid,                      -- recordatorio: la sesión
  for_date        date,                      -- resumen: el día (en la zona del psicólogo)
  sent_at         timestamptz not null default now(),

  check ((kind = 'session_reminder') = (session_id is not null)),
  check ((kind = 'daily_summary') = (for_date is not null)),
  -- La sesión, del mismo psicólogo; si se borra la sesión, se va su registro.
  foreign key (session_id, psychologist_id)
    references public.sessions (id, psychologist_id) on delete cascade
);

create unique index notification_log_session_once
  on public.notification_log (session_id, kind) where session_id is not null;
create unique index notification_log_summary_once
  on public.notification_log (psychologist_id, kind, for_date) where kind = 'daily_summary';

alter table public.notification_log enable row level security;

-- El psicólogo puede ver lo que se le envió; nadie escribe desde la app.
create policy "notification_log: ver el propio" on public.notification_log for select
  to authenticated using (psychologist_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- Lo que corresponde enviar en el minuto de p_now.
-- - Recordatorios: sesiones agendadas que empiezan dentro de reminder_minutes (con 2 minutos de tolerancia:
--   si el cron se saltea una corrida, la siguiente lo envía; minutes_before dice cuánto falta de verdad).
-- - Resúmenes: a la hora elegida (hasta 10 minutos después, por la misma razón), si hay sesiones ese día.
-- Solo para psicólogos con al menos un dispositivo suscripto, y lo que no esté en notification_log.
-- Devuelve únicamente hora, modalidad y (si se eligió) nombre e inicial: nada de anotaciones ni datos clínicos.
-- security definer: la llama el cron, que no tiene sesión de ningún psicólogo (ejecutable solo por service_role).
-- -----------------------------------------------------------------------------
create function public.due_notifications(p_now timestamptz)
returns table (
  kind            text,
  psychologist_id uuid,
  session_id      uuid,
  for_date        date,
  start_time      text,     -- hora de inicio (de la sesión o de la primera del día), en la zona del psicólogo
  modality        text,     -- recordatorio: 'in_person' o 'virtual'
  patient_label   text,     -- recordatorio: "Juan P.", solo con notification_show_name
  minutes_before  integer,  -- recordatorio: minutos que faltan
  session_count   integer   -- resumen: sesiones del día
)
language sql
stable
security definer
set search_path = ''
as $$
  with now_minute as (select date_trunc('minute', p_now) as m)

  select 'session_reminder',
         s.psychologist_id,
         s.id,
         null::date,
         to_char(s.starts_at at time zone pr.timezone, 'FMHH24:MI'),
         coalesce(s.modality, p.modality),
         case when pr.notification_show_name
              then p.first_name || coalesce(' ' || nullif(left(p.last_name, 1), '') || '.', '') end,
         round(extract(epoch from s.starts_at - n.m) / 60)::integer,
         null::integer
    from now_minute n
    cross join public.sessions s
    join public.profiles pr on pr.id = s.psychologist_id
    join public.patients p  on p.id = s.patient_id
   where pr.reminder_minutes is not null
     and s.status = 'scheduled'
     and s.starts_at >= n.m + make_interval(mins => pr.reminder_minutes - 2)
     and s.starts_at <  n.m + make_interval(mins => pr.reminder_minutes + 1)
     and s.starts_at > p_now
     and exists (select 1 from public.push_subscriptions ps where ps.psychologist_id = s.psychologist_id)
     and not exists (
       select 1 from public.notification_log l where l.session_id = s.id and l.kind = 'session_reminder'
     )

  union all

  select 'daily_summary',
         pr.id,
         null::uuid,
         local.day,
         to_char(day_sessions.first_start at time zone pr.timezone, 'FMHH24:MI'),
         null::text,
         null::text,
         null::integer,
         day_sessions.total
    from public.profiles pr
    cross join lateral (
      select (p_now at time zone pr.timezone)::date as day,
             (date_trunc('minute', p_now) at time zone pr.timezone)::time as time
    ) local
    cross join lateral (
      select count(*)::integer as total, min(s.starts_at) as first_start
        from public.sessions s
       where s.psychologist_id = pr.id
         and s.status = 'scheduled'
         and (s.starts_at at time zone pr.timezone)::date = local.day
    ) day_sessions
   where pr.daily_summary_enabled
     and local.time >= pr.daily_summary_time
     and local.time <  pr.daily_summary_time + interval '10 minutes'
     and day_sessions.total > 0
     and exists (select 1 from public.push_subscriptions ps where ps.psychologist_id = pr.id)
     and not exists (
       select 1 from public.notification_log l
        where l.psychologist_id = pr.id and l.kind = 'daily_summary' and l.for_date = local.day
     );
$$;


-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
-- Explícito en los dos sentidos: lo que la app no hace, se le quita (por si el proyecto da permisos por defecto).
revoke all on public.push_subscriptions from authenticated;
revoke all on public.notification_log   from authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
grant select                 on public.notification_log   to authenticated;

-- El cron (service_role, solo desde src/lib/supabase/admin.ts): leer suscripciones, marcar su uso, borrar
-- las vencidas y registrar envíos.
grant select, update, delete on public.push_subscriptions to service_role;
grant select, insert         on public.notification_log   to service_role;

revoke execute on function public.due_notifications(timestamptz) from public, anon, authenticated;
grant execute on function public.due_notifications(timestamptz) to service_role;
