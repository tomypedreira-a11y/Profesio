import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/calendar-view";
import { getTimeZone } from "./pacientes/queries";

// Vista principal: el calendario.
export default async function CalendarPage() {
  const supabase = await createClient();
  // Mantiene generados al menos 3 meses de sesiones de los horarios fijos.
  await supabase.rpc("extend_series");
  const timeZone = await getTimeZone();

  return <CalendarView timeZone={timeZone} />;
}
