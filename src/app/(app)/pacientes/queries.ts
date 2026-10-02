// Consultas de pacientes compartidas entre pantallas (se ejecutan en el servidor).
// Lo del perfil sale de getProfile(): una sola consulta por request, compartida con el layout.
import { createClient, getProfile } from "@/lib/supabase/server";
import { toSlots } from "@/lib/schedule";
import { sortName } from "@/lib/format";
import { DEFAULT_TIME_ZONE } from "@/lib/timezones";
import { DEFAULT_CALENDAR_VIEW, isCalendarView, type CalendarViewPreference } from "@/lib/calendar-views";
import type { PatientOption } from "@/components/calendar/types";
import type { PatientListItem } from "./patient-list";

export async function getTimeZone() {
  const profile = await getProfile();
  return profile?.timezone ?? DEFAULT_TIME_ZONE;
}

// Vista con la que abre el calendario (preferencia del perfil).
export async function getCalendarView(): Promise<CalendarViewPreference> {
  const profile = await getProfile();
  return isCalendarView(profile?.calendar_view) ? profile.calendar_view : DEFAULT_CALENDAR_VIEW;
}

// Valor por sesión del perfil: lo usan los pacientes sin valor propio.
export async function getDefaultFee(): Promise<number | null> {
  const profile = await getProfile();
  return profile?.default_session_fee ?? null;
}

export async function getPatients(active: boolean): Promise<PatientListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_list")
    .select("id, first_name, last_name, phone, dni, schedules, last_session_at, next_session_at")
    .eq("active", active);
  return (data ?? []).map((p) => ({ ...p, schedules: toSlots(p.schedules) })) as PatientListItem[];
}

// Pacientes activos para el selector de "Agregar sesión", ordenados por apellido (o nombre, si no tiene).
export async function getPatientOptions(): Promise<PatientOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_list")
    .select("id, first_name, last_name, schedules")
    .eq("active", true);
  const collator = new Intl.Collator("es", { sensitivity: "base" });
  return (data ?? [])
    .map((p) => ({
      id: p.id!,
      name: sortName({ first_name: p.first_name ?? "", last_name: p.last_name ?? "" }),
      schedules: toSlots(p.schedules),
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

export async function countArchived() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("active", false);
  return count ?? 0;
}
