"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { scheduleSlotsSchema, timeSchema } from "@/lib/schedule";

// Fecha + inicio y fin; el fin después del inicio.
const whenSchema = z
  .object({ date: z.iso.date(), start: timeSchema, end: timeSchema })
  .refine((w) => w.end > w.start);

const addSessionsSchema = z.discriminatedUnion("type", [
  // Irregular: una sesión suelta.
  whenSchema.safeExtend({ type: z.literal("irregular"), patientId: z.uuid() }),
  // Regular: se suman horarios fijos a los que ya tenga el paciente.
  z.object({ type: z.literal("fixed"), patientId: z.uuid(), slots: scheduleSlotsSchema.min(1) }),
]);

// Agrega sesiones a un paciente. Devuelve { error } si no se pudo.
export async function addSessions(input: z.input<typeof addSessionsSchema>) {
  const parsed = addSessionsSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisá el paciente, el día, el inicio y el fin." };
  const data = parsed.data;

  const supabase = await createClient();
  const { error } =
    data.type === "irregular"
      ? await supabase.rpc("schedule_session", {
          p_patient_id: data.patientId,
          p_date: data.date,
          p_time: data.start,
          p_end_time: data.end,
        })
      : await supabase.rpc("add_patient_schedules", { p_patient_id: data.patientId, p_schedules: data.slots });

  if (error) return { error: conflictMessage(error, "No se pudo agendar. Volvé a intentar.") };
  revalidatePath("/", "layout");
  return {};
}

// ---------------------------------------------------------------------------
// Etapa 5: reprogramar, cancelar y deshacer la cancelación
// ---------------------------------------------------------------------------

const scopeSchema = z.enum(["one", "following"]); // solo esta / esta y las siguientes

const rescheduleSchema = whenSchema.safeExtend({ sessionId: z.uuid(), scope: scopeSchema });

function conflictMessage(error: { code?: string; hint?: string; message: string }, fallback: string) {
  if (error.hint === "schedule_conflict") return error.message;
  if (error.code === "23P01") return "Ese horario se superpone con otra sesión.";
  if (error.code === "P0001") return error.message;
  return fallback;
}

export async function rescheduleSession(input: z.input<typeof rescheduleSchema>) {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisá la fecha, el inicio y el fin." };
  const { sessionId, date, start, end, scope } = parsed.data;

  const supabase = await createClient();
  const args = { p_session_id: sessionId, p_date: date, p_time: start, p_end_time: end };
  const { error } =
    scope === "one"
      ? await supabase.rpc("reschedule_session", args)
      : await supabase.rpc("reschedule_series_from", args);

  if (error) return { error: conflictMessage(error, "No se pudo reprogramar la sesión.") };
  revalidatePath("/", "layout");
  return {};
}

export async function cancelSession(input: { sessionId: string; scope: "one" | "following" }) {
  const parsed = z.object({ sessionId: z.uuid(), scope: scopeSchema }).safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };
  const { sessionId, scope } = parsed.data;

  const supabase = await createClient();
  const { error } =
    scope === "one"
      ? await supabase.from("sessions").update({ status: "cancelled" }).eq("id", sessionId)
      : await supabase.rpc("cancel_series_from", { p_session_id: sessionId });

  if (error) return { error: conflictMessage(error, "No se pudo cancelar la sesión.") };
  revalidatePath("/", "layout");
  return {};
}

export async function restoreSession(sessionId: string) {
  if (!z.uuid().safeParse(sessionId).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").update({ status: "scheduled" }).eq("id", sessionId);

  if (error) {
    return {
      error:
        error.code === "23P01"
          ? "Ese horario ya está ocupado por otra sesión. Reprogramala en otro horario."
          : error.hint === "vacation"
            ? error.message
            : "No se pudo deshacer la cancelación.",
    };
  }
  revalidatePath("/", "layout");
  return {};
}

// ---------------------------------------------------------------------------
// Modalidad (presencial o virtual): solo esta sesión, o esta y las siguientes del paciente
// (pasa a ser la modalidad del paciente de ahí en adelante).
// ---------------------------------------------------------------------------

const modalitySchema = z.object({
  sessionId: z.uuid(),
  modality: z.enum(["in_person", "virtual"]),
  scope: scopeSchema,
});

export async function setSessionModality(input: z.input<typeof modalitySchema>) {
  const parsed = modalitySchema.safeParse(input);
  if (!parsed.success) return { error: "Elegí presencial o virtual." };
  const { sessionId, modality, scope } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_session_modality", {
    p_session_id: sessionId,
    p_modality: modality,
    p_scope: scope,
  });

  if (error) return { error: error.code === "P0001" ? error.message : "No se pudo cambiar la modalidad." };
  revalidatePath("/", "layout");
  return {};
}
