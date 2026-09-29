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
