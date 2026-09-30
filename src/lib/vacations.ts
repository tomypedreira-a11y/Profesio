// Vacaciones del psicólogo: períodos de fechas "de reloj" (YYYY-MM-DD), ambos días incluidos.
// Durante las vacaciones no hay sesiones de horarios fijos; las sueltas (urgencias) sí.
import { format } from "date-fns";

export type Vacation = { id: string; start_date: string; end_date: string };

// El día de una fecha local, comparable como texto con start_date y end_date.
export const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

export function findVacation(vacations: readonly Vacation[], date: Date) {
  const day = dayKey(date);
  return vacations.find((v) => v.start_date <= day && day <= v.end_date);
}

export function isVacationDay(vacations: readonly Vacation[], date: Date) {
  return findVacation(vacations, date) !== undefined;
}
