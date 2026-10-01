// Opciones de las notificaciones (Configuración). Coinciden con los checks de profiles en la base.

// Minutos antes de cada sesión; "off" = recordatorios apagados (reminder_minutes null).
export const REMINDER_OPTIONS = [
  { value: "off", label: "Apagado" },
  { value: "5", label: "5 minutos antes" },
  { value: "10", label: "10 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
] as const;

export const reminderValue = (minutes: number | null) => (minutes === null ? "off" : String(minutes));

export function parseReminder(value: string): number | null | "invalid" {
  if (value === "off") return null;
  return REMINDER_OPTIONS.some((o) => o.value === value) ? Number(value) : "invalid";
}

// Hora del resumen del día: de 5:00 a 12:00, cada media hora (es la agenda "de hoy": a la mañana).
export const SUMMARY_TIMES = Array.from({ length: 15 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
  return { value, label: value };
});

// La base guarda "08:00:00"; las opciones son "08:00".
export const summaryTimeValue = (time: string) => time.slice(0, 5);
export const isSummaryTime = (value: string) => SUMMARY_TIMES.some((t) => t.value === value);
