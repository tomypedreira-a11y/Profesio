// Vista con la que abre el calendario; coinciden con profiles.calendar_view (nombres de FullCalendar).
export const CALENDAR_VIEWS = [
  { value: "timeGridDay", label: "Día" },
  { value: "timeGridWeek", label: "Semana" },
  { value: "dayGridMonth", label: "Mes" },
] as const;

export type CalendarViewPreference = (typeof CALENDAR_VIEWS)[number]["value"];

export const DEFAULT_CALENDAR_VIEW: CalendarViewPreference = "timeGridWeek";

export function isCalendarView(value: unknown): value is CalendarViewPreference {
  return CALENDAR_VIEWS.some((v) => v.value === value);
}
