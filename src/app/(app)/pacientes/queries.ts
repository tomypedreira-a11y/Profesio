// Consultas de pacientes compartidas entre pantallas (se ejecutan en el servidor).
import { createClient } from "@/lib/supabase/server";
import { toSlots } from "@/lib/schedule";
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

export async function getPatients(active: boolean): Promise<PatientListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_list")
    .select("id, first_name, last_name, phone, dni, schedules, last_session_at, next_session_at")
    .eq("active", active);
  return (data ?? []).map((p) => ({ ...p, schedules: toSlots(p.schedules) })) as PatientListItem[];
}

// Pacientes activos para el selector de "Agregar sesión", ordenados por apellido.
export async function getPatientOptions(): Promise<PatientOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("patient_list")
    .select("id, first_name, last_name, schedules")
    .eq("active", true)
    .order("last_name")
    .order("first_name");
  return (data ?? []).map((p) => ({
    id: p.id!,
    name: `${p.last_name}, ${p.first_name}`,
    schedules: toSlots(p.schedules),
  }));
}

export async function countArchived() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("active", false);
  return count ?? 0;
}
