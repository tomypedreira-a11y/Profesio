"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const scheduleSchema = z.object({
  patientId: z.uuid(),
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

// Agenda una sesión suelta. Devuelve { error } si no se pudo.
export async function scheduleSession(input: { patientId: string; date: string; time: string }) {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { error: "Elegí una fecha y un horario." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("schedule_session", {
    p_patient_id: parsed.data.patientId,
    p_date: parsed.data.date,
    p_time: parsed.data.time,
  });

  if (error) {
    return {
      error: error.hint === "schedule_conflict" ? error.message : "No se pudo agendar la sesión. Volvé a intentar.",
    };
  }

  revalidatePath("/", "layout");
  return {};
}

// ---------------------------------------------------------------------------
// Etapa 5: reprogramar, cancelar y deshacer la cancelación
// ---------------------------------------------------------------------------

const scopeSchema = z.enum(["one", "following"]); // solo esta / esta y las siguientes

const rescheduleSchema = z.object({
  sessionId: z.uuid(),
  date: z.iso.date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  scope: scopeSchema,
});

function conflictMessage(error: { code?: string; hint?: string; message: string }, fallback: string) {
  if (error.hint === "schedule_conflict") return error.message;
  if (error.code === "23P01") return "Ese horario se superpone con otra sesión.";
  if (error.code === "P0001") return error.message;
  return fallback;
}

export async function rescheduleSession(input: z.input<typeof rescheduleSchema>) {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { error: "Elegí una fecha y un horario." };
  const { sessionId, date, time, scope } = parsed.data;

  const supabase = await createClient();
  const args = { p_session_id: sessionId, p_date: date, p_time: time };
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
          : "No se pudo deshacer la cancelación.",
    };
  }
  revalidatePath("/", "layout");
  return {};
}
