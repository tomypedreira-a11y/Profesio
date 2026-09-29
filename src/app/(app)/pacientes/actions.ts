"use server";

import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formValues, type FormState } from "@/lib/form-state";
import { patientSchema } from "./schema";

// Traduce errores de la base a mensajes para el formulario.
function dbErrorToState(error: PostgrestError, values: Record<string, string>): FormState {
  if (error.code === "23505" && error.message.includes("patients_unique_dni")) {
    return { fieldErrors: { dni: ["Ya tenés un paciente con ese documento."] }, values };
  }
  // Choques de horario y validaciones de la base (ej. paciente archivado): se muestran en "Sesiones".
  if (error.hint === "schedule_conflict" || error.code === "P0001") {
    return { fieldErrors: { schedule: [error.message] }, values };
  }
  return { error: "No se pudo guardar. Volvé a intentar.", values };
}

function parse(formData: FormData) {
  const values = formValues(formData);
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  return { values, parsed };
}

export async function createPatient(_prev: FormState, formData: FormData): Promise<FormState> {
  const { values, parsed } = parse(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_patient_with_schedules", parsed.data);
  if (error) return dbErrorToState(error, values);

  revalidatePath("/pacientes");
  redirect(`/pacientes/${id}`);
}

export async function updatePatient(
  patientId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { values, parsed } = parse(formData);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_patient_with_schedules", {
    p_patient_id: patientId,
    ...parsed.data,
  });
  if (error) return dbErrorToState(error, values);

  revalidatePath("/pacientes");
  redirect(`/pacientes/${patientId}`);
}

export async function setPatientArchived(patientId: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_patient_archived", {
    p_patient_id: patientId,
    p_archived: archived,
  });
  if (error) return { error: "No se pudo actualizar el paciente." };

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${patientId}`);
  return {};
}
