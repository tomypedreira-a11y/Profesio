import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getCalendarView, getPatientOptions, getTimeZone } from "../pacientes/queries";

export const metadata: Metadata = { title: "Calendario" };

// Vista principal de la app: el calendario (APP_HOME, lib/routes.ts).
export default async function CalendarPage() {
  const supabase = await createClient();
  // Mantiene generados al menos 3 meses de sesiones de los horarios fijos.
  await supabase.rpc("extend_series");
  const [timeZone, patients, initialView] = await Promise.all([getTimeZone(), getPatientOptions(), getCalendarView()]);

  return <CalendarView timeZone={timeZone} patients={patients} initialView={initialView} />;
}
