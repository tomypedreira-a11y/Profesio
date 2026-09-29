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
};

export type UnscheduledPatient = { id: string; first_name: string; last_name: string };
