import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getTimeZone } from "../../pacientes/queries";
import { loadInitialCalendar } from "../initial-data";

export const metadata: Metadata = { title: "Vistas del calendario" };

// Pantalla aparte (se abre desde el celular) para mirar el calendario por día, semana o mes.
// Arranca en el mes, que complementa la tira de días de la pantalla principal.
export default async function CalendarBrowsePage() {
  const supabase = await createClient();
  // A la vez, como en la pantalla principal: extend_series solo agrega sesiones a más de 3 meses.
  const [, timeZone, initialData] = await Promise.all([
    supabase.rpc("extend_series"),
    getTimeZone(),
    getTimeZone().then((timeZone) => loadInitialCalendar(timeZone, "dayGridMonth", { withWeek: false })),
  ]);

  return <CalendarView mode="browse" timeZone={timeZone} initialView="dayGridMonth" initialData={initialData} />;
}
