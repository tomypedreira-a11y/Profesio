// Formatos de fecha, hora y dinero en castellano (Argentina).
import { differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import type { ScheduleSlot } from "./schedule";

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// "Martes 18:00–19:00 · Jueves 18:00–19:00"; sin horarios fijos, "Irregular".
export function formatSchedules(slots: ScheduleSlot[]): string {
  if (slots.length === 0) return "Irregular";
  return slots.map((s) => `${WEEKDAYS[s.weekday]} ${s.start_time}–${s.end_time}`).join(" · ");
}

// "mar 30/09 · 18:00"
export function formatSessionShort(iso: string, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "EEE dd/MM · HH:mm", { locale: es });
}

// "martes 30 de septiembre de 2026 · 18:00"
export function formatSessionLong(iso: string, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "EEEE d 'de' MMMM 'de' yyyy · HH:mm", { locale: es });
}

// Tiempo que falta para una sesión: "Faltan 25 min", "Falta 1 h 20 min", "Faltan 2 días y 3 h".
export function formatTimeUntil(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  if (totalMinutes <= 0) return "Empieza ahora";

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  // Con días no se muestran los minutos: a esa distancia no aportan.
  const [first, text] =
    days > 0
      ? [days, `${days} ${days === 1 ? "día" : "días"}${hours > 0 ? ` y ${hours} h` : ""}`]
      : hours > 0
        ? [hours, `${hours} h${minutes > 0 ? ` ${minutes} min` : ""}`]
        : [minutes, `${minutes} min`];
  return `${first === 1 ? "Falta" : "Faltan"} ${text}`;
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

// Monto escrito por el usuario. Acepta "25000", "25.000", "25.000,50", "$ 25000".
export function parseFee(raw: string): number | null | "invalid" {
  let v = raw.replace(/[$\s]/g, "");
  if (v === "") return null;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : "invalid";
}
