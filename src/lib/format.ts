// Formatos de fecha, hora y dinero en castellano (Argentina).
import { differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "Martes 18:00"
export function formatSchedule(weekday: number | null, startTime: string | null): string {
  if (weekday === null || !startTime) return "Irregular";
  return `${WEEKDAYS[weekday]} ${startTime.slice(0, 5)}`;
}

// "mar 30/09 · 18:00"
export function formatSessionShort(iso: string, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "EEE dd/MM · HH:mm", { locale: es });
}

// "martes 30 de septiembre de 2026 · 18:00"
export function formatSessionLong(iso: string, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "EEEE d 'de' MMMM 'de' yyyy · HH:mm", { locale: es });
}

// "01/05/1990 (36 años)"
export function formatBirthDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const age = differenceInYears(new Date(), new Date(y, m - 1, d));
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y} (${age} años)`;
}

const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

export function formatFee(value: number | null): string {
  return value === null ? "" : currency.format(value);
}
