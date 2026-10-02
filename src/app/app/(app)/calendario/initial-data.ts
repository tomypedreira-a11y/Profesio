// Carga inicial del calendario desde el servidor: las sesiones del rango que se ve al abrirlo, la próxima sesión
// y (en la pantalla principal) "No agendados" de esta semana. Son las mismas consultas que hacía el navegador al
// montarse (components/calendar/queries.ts); las semanas siguientes las sigue pidiendo el navegador.
import { addDays, format, startOfMonth, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { fromWall, todayIn } from "@/lib/zoned";
import type { CalendarViewPreference } from "@/lib/calendar-views";
import { nextSession, sessionsInRange, weekBookings, type InitialCalendarData } from "@/components/calendar/queries";

export async function loadInitialCalendar(
  timeZone: string,
  view: CalendarViewPreference,
  { withWeek }: { withWeek: boolean },
): Promise<InitialCalendarData> {
  const supabase = await createClient();
  // Días de reloj en la zona del perfil. La semana empieza el lunes, como en el calendario (locale es).
  const today = todayIn(timeZone);
  const week = startOfWeek(today, { weekStartsOn: 1 });
  // Día y semana caen dentro de esta semana; el mes muestra 6 semanas desde el lunes de la primera.
  const [first, days] =
    view === "dayGridMonth" ? [startOfWeek(startOfMonth(today), { weekStartsOn: 1 }), 42] : [week, 7];
  const iso = (wall: Date) => fromWall(wall, timeZone).toISOString();
  const start = iso(first);
  const end = iso(addDays(first, days));
  const loadedAt = Date.now();

  const [sessions, next, bookings] = await Promise.all([
    sessionsInRange(supabase, start, end),
    nextSession(supabase, new Date(loadedAt).toISOString()),
    withWeek ? weekBookings(supabase, iso(week), iso(addDays(week, 7))) : undefined,
  ]);

  return {
    loadedAt,
    start,
    end,
    sessions,
    next,
    week: bookings && { start: format(week, "yyyy-MM-dd"), ...bookings },
  };
}
