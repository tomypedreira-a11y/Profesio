"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHODS } from "@/lib/payments";

const methodSchema = z.string().refine((v) => PAYMENT_METHODS.some((m) => m.value === v));

// Cobra una o varias sesiones (realizadas o futuras, por adelantado) (ej. "Cobrar todo" de un paciente). Devuelve { error } si no se pudo.
export async function markSessionsPaid(input: { sessionIds: string[]; method: string }) {
  const parsed = z.object({ sessionIds: z.array(z.uuid()).min(1), method: methodSchema }).safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_sessions_paid", {
    p_session_ids: parsed.data.sessionIds,
    p_method: parsed.data.method,
  });

  // Los errores de la base (P0001) ya vienen explicados para el usuario.
  if (error) return { error: error.code === "P0001" ? error.message : "No se pudo registrar el cobro." };
  revalidatePath("/", "layout");
  return {};
}

export async function markSessionUnpaid(sessionId: string) {
  if (!z.uuid().safeParse(sessionId).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_session_unpaid", { p_session_id: sessionId });

  if (error) return { error: error.code === "P0001" ? error.message : "No se pudo deshacer el cobro." };
  revalidatePath("/", "layout");
  return {};
}
