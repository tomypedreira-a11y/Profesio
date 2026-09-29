// Horarios fijos semanales: formato compartido entre la interfaz, las acciones y la base
// (parámetro p_schedules y columna patient_list.schedules).
import { z } from "zod";

// "HH:MM" de 00:00 a 23:59.
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const isValidTime = (value: string) => timeSchema.safeParse(value).success;

// Inicio y fin válidos, y el fin después del inicio (una sesión no cruza la medianoche).
export const isValidRange = (start: string, end: string) => isValidTime(start) && isValidTime(end) && end > start;

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
