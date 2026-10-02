// Mensaje de recordatorio por WhatsApp: el psicólogo lo escribe una vez (Configuración → Sesiones) con
// marcadores, y la app lo completa con los datos de cada sesión. Solo arma el texto del link: lo envía el
// psicólogo desde su WhatsApp, después de revisarlo.
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export const DEFAULT_REMINDER_TEMPLATE = "Hola {nombre}, te recuerdo nuestra sesión del {fecha} a las {hora}. ¡Nos vemos!";

export const REMINDER_TEMPLATE_MAX = 500; // igual que el check de profiles.whatsapp_reminder_template

export const REMINDER_PLACEHOLDERS = [
  { key: "{nombre}", label: "nombre del paciente" },
  { key: "{fecha}", label: "día de la sesión (ej. martes 7 de octubre)" },
  { key: "{hora}", label: "hora de inicio (ej. 18:00)" },
] as const;

// Vacío o igual al de la app = null: así, si se mejora el mensaje de la app, les llega a quienes no lo cambiaron.
export function parseReminderTemplate(raw: string): string | null | "invalid" {
  const text = raw.trim();
  if (!text || text === DEFAULT_REMINDER_TEMPLATE) return null;
  return text.length > REMINDER_TEMPLATE_MAX ? "invalid" : text;
}

export function reminderText(
  template: string,
  session: { first_name: string; starts_at: string },
  timeZone: string,
): string {
  const values: Record<string, string> = {
    "{nombre}": session.first_name,
    "{fecha}": formatInTimeZone(session.starts_at, timeZone, "EEEE d 'de' MMMM", { locale: es }),
    "{hora}": formatInTimeZone(session.starts_at, timeZone, "HH:mm"),
  };
  return template.replace(/\{(nombre|fecha|hora)\}/g, (key) => values[key]);
}
