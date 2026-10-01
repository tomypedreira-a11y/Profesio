import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getTimeZone } from "../../pacientes/queries";

export const metadata: Metadata = { title: "Vistas del calendario" };

// Pantalla aparte (se abre desde el celular) para mirar el calendario por día, semana o mes.
// Arranca en el mes, que complementa la tira de días de la pantalla principal.
export default async function CalendarBrowsePage() {
  const supabase = await createClient();
  // Mantiene generados al menos 3 meses de sesiones de los horarios fijos.
  await supabase.rpc("extend_series");
  const timeZone = await getTimeZone();

  return <CalendarView mode="browse" timeZone={timeZone} initialView="dayGridMonth" />;
}
