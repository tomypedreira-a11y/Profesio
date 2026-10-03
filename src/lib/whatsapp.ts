// Mensajes de WhatsApp ya escritos: recordatorio de una sesión y aviso cuando el paciente no llegó. Son fijos
// (antes se armaban en Configuración con marcadores, y resultaba complicado). Solo arman el texto del link: lo
// envía el psicólogo desde su WhatsApp, después de revisarlo.
import { addDays, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { toWall } from "@/lib/zoned";

type MessageSession = { first_name: string; starts_at: string };

// Cuándo es la sesión, según cuánto falta: "en un rato, a las 18:00", "hoy a las 18:00", "mañana a las 18:00",
// "el jueves a las 18:00" (dentro de la semana) o "el martes 14 de octubre a las 18:00".
// Los días son los de la zona del perfil, no la del dispositivo.
export function sessionWhen(startsAt: string, timeZone: string, now: number | Date = Date.now()): string {
  const time = formatInTimeZone(startsAt, timeZone, "HH:mm");
  const minutesLeft = (new Date(startsAt).getTime() - new Date(now).getTime()) / 60_000;
  const day = format(toWall(startsAt, timeZone), "yyyy-MM-dd");
  const today = toWall(now, timeZone);
  const dayIn = (days: number) => format(addDays(today, days), "yyyy-MM-dd");

  if (day === dayIn(0)) return minutesLeft > 0 && minutesLeft <= 60 ? `en un rato, a las ${time}` : `hoy a las ${time}`;
  if (day === dayIn(1)) return `mañana a las ${time}`;
  // Hasta 6 días: el nombre del día alcanza (a 7 días sería el mismo día de hoy, y confunde).
  for (let days = 2; days <= 6; days++) {
    if (day === dayIn(days)) return `el ${formatInTimeZone(startsAt, timeZone, "EEEE", { locale: es })} a las ${time}`;
  }
  return `el ${formatInTimeZone(startsAt, timeZone, "EEEE d 'de' MMMM", { locale: es })} a las ${time}`;
}

export function reminderText(session: MessageSession, timeZone: string, now: number | Date = Date.now()): string {
  const when = sessionWhen(session.starts_at, timeZone, now);
  // "en un rato, a las 18:00" va mejor al final de la frase.
  return when.startsWith("en un rato")
    ? `Hola ${session.first_name}, te recuerdo que tenemos sesión ${when}. ¡Nos vemos!`
    : `Hola ${session.first_name}, te recuerdo que ${when} tenemos sesión. ¡Nos vemos!`;
}

// Sesión en curso y el paciente no llegó (o no se conectó, si es virtual).
export function lateText(session: MessageSession & { modality: string }, timeZone: string): string {
  const time = formatInTimeZone(session.starts_at, timeZone, "HH:mm");
  const question = session.modality === "virtual" ? "¿Te podés conectar?" : "¿Estás por llegar?";
  return `Hola ${session.first_name}, te escribo porque teníamos sesión a las ${time}. ${question}`;
}
