-- =============================================================================
-- Profesio · Vista inicial del calendario (en el perfil): día, semana o mes.
-- Los valores son los nombres de vista de FullCalendar.
-- =============================================================================


alter table public.profiles
  add column calendar_view text not null default 'timeGridWeek'
    check (calendar_view in ('timeGridDay', 'timeGridWeek', 'dayGridMonth'));
