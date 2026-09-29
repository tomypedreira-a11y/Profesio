// Consultas de pacientes compartidas entre pantallas (se ejecutan en el servidor).
import { createClient } from "@/lib/supabase/server";
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
    .select("id, first_name, last_name, phone, dni, weekday, start_time, last_session_at, next_session_at")
    .eq("active", active);
  return (data ?? []) as PatientListItem[];
}

export async function countArchived() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("active", false);
  return count ?? 0;
}
