// Mientras carga la pantalla aparte del calendario: arranca en el mes.
import { CalendarPageSkeleton } from "@/components/calendar/calendar-skeleton";

export default function Loading() {
  return <CalendarPageSkeleton view="dayGridMonth" browse />;
}
