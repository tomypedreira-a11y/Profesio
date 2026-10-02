import type { ScheduleSlot } from "@/lib/schedule";

// Columnas de calendar_sessions que necesita el panel de la sesión.
export const SESSION_COLUMNS =
  "id, patient_id, series_id, starts_at, ends_at, status, rescheduled_from, first_name, last_name, phone, series_active, modality, paid_at";

export type CalendarSession = {
  id: string;
  patient_id: string;
  series_id: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  rescheduled_from: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  series_active: boolean;
  modality: string; // la de la sesión, o la del paciente si no se cambió
  paid_at: string | null;
};

export type UnscheduledPatient = { id: string; first_name: string; last_name: string };

// Paciente activo, para elegirlo al agregar una sesión.
export type PatientOption = { id: string; name: string; schedules: ScheduleSlot[] };
