// Horarios fijos semanales: formato compartido entre la interfaz, las acciones y la base
// (parámetro p_schedules y columna patient_list.schedules).
import { z } from "zod";

// "HH:MM" de 00:00 a 23:59.
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const isValidTime = (value: string) => timeSchema.safeParse(value).success;

// Inicio y fin válidos, y el fin después del inicio (una sesión no cruza la medianoche).
export const isValidRange = (start: string, end: string) => isValidTime(start) && isValidTime(end) && end > start;

// Duraciones habituales que se pueden elegir en el perfil (coinciden con el check de profiles).
export const SESSION_LENGTHS = [
  { minutes: 45, label: "45 minutos" },
  { minutes: 50, label: "50 minutos" },
  { minutes: 60, label: "1 hora" },
  { minutes: 75, label: "1 hora 15 minutos" },
  { minutes: 90, label: "1 hora 30 minutos" },
] as const;

export const DEFAULT_SESSION_MINUTES = 45;

export const isSessionLength = (value: number) => SESSION_LENGTHS.some((l) => l.minutes === value);

// Inicio + duración, como "HH:MM". "" si el inicio no es válido o la sesión pasaría la medianoche.
export function endFromDuration(start: string, minutes: number): string {
  if (!isValidTime(start)) return "";
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return "";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// El fin es opcional: si está vacío, se calcula con la duración habitual.
export const resolveEnd = (start: string, end: string, minutes: number) =>
  end === "" ? endFromDuration(start, minutes) : end;

// weekday: 0 = domingo … 6 = sábado (como extract(dow) en Postgres).
export const scheduleSlotSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    start_time: timeSchema,
    end_time: timeSchema,
  })
  .refine((s) => s.end_time > s.start_time);

export const scheduleSlotsSchema = z.array(scheduleSlotSchema).max(14);

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;

// La columna jsonb llega sin tipo desde Supabase.
export function toSlots(value: unknown): ScheduleSlot[] {
  const parsed = scheduleSlotsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}
