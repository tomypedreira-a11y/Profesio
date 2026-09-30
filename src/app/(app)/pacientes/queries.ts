// Consultas de pacientes compartidas entre pantallas (se ejecutan en el servidor).
import { createClient } from "@/lib/supabase/server";
import { toSlots } from "@/lib/schedule";
import { sortName } from "@/lib/format";
import { DEFAULT_CALENDAR_VIEW, isCalendarView, type CalendarViewPreference } from "@/lib/calendar-views";
import type { PatientOption } from "@/components/calendar/types";
import type { PatientListItem } from "./patient-list";

export async function getTimeZone() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", claims?.claims.sub ?? "")
    .single();
  return data?.timezone ?? "America/Argentina/Buenos_Aires";
}

// Vista con la que abre el calendario (preferencia del perfil).
export async function getCalendarView(): Promise<CalendarViewPreference> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data } = await supabase
    .from("profiles")
    .select("calendar_view")
    .eq("id", claims?.claims.sub ?? "")
    .single();
  return isCalendarView(data?.calendar_view) ? data.calendar_view : DEFAULT_CALENDAR_VIEW;
}

// Valor por sesión del perfil: lo usan los pacientes sin valor propio.
export async function getDefaultFee(): Promise<number | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const { data } = await supabase
    .from("profiles")
    .select("default_session_fee")
    .eq("id", claims?.claims.sub ?? "")
    .single();
  return data?.default_session_fee ?? null;
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
