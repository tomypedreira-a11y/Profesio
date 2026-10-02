import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getCalendarView, getPatientOptions, getTimeZone } from "../pacientes/queries";
import { loadInitialCalendar } from "./initial-data";

export const metadata: Metadata = { title: "Calendario" };

// Vista principal de la app: el calendario (APP_HOME, lib/routes.ts).
export default async function CalendarPage() {
  const supabase = await createClient();
  // Todo a la vez. extend_series mantiene generados al menos 3 meses de sesiones de los horarios fijos: solo
  // agrega sesiones a más de 3 meses, que no se ven al abrir, así que no hace falta esperarla antes del resto.
  // Las sesiones iniciales esperan solo al perfil (zona y vista), que en una carga completa ya pidió el layout.
  const [, patients, initialData, timeZone, initialView] = await Promise.all([
    supabase.rpc("extend_series"),
    getPatientOptions(),
    Promise.all([getTimeZone(), getCalendarView()]).then(([timeZone, view]) =>
      loadInitialCalendar(timeZone, view, { withWeek: true }),
    ),
    getTimeZone(),
    getCalendarView(),
  ]);

  return <CalendarView timeZone={timeZone} patients={patients} initialView={initialView} initialData={initialData} />;
}
