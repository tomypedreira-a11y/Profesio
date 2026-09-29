"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const noteSchema = z.object({
  sessionId: z.uuid(),
  noteId: z.uuid().optional(), // borrador existente a actualizar
  supersedesId: z.uuid().optional(), // informe finalizado que se corrige
  content: z.string().trim().min(1, "Escribí el informe antes de guardarlo.").max(50000, "El informe es demasiado largo."),
  finalize: z.boolean(),
});

export type SaveNoteInput = z.input<typeof noteSchema>;

// Guarda un informe de sesión:
// - borrador existente → se actualiza;
// - sin informe, o corrigiendo uno finalizado → se crea una fila nueva (versión).
export async function saveNote(input: SaveNoteInput): Promise<{ error?: string }> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const { sessionId, noteId, supersedesId, content, finalize } = parsed.data;
  const status = finalize ? "final" : "draft";

  const supabase = await createClient();
  const { error } = noteId
    ? await supabase.from("session_notes").update({ content, status }).eq("id", noteId)
    : await supabase.from("session_notes").insert({ session_id: sessionId, content, status, supersedes_id: supersedesId ?? null });

  if (error) {
    // Mensajes de las reglas de la base (ej: "Una nota finalizada no se puede modificar").
    return { error: error.code === "P0001" ? error.message : "No se pudo guardar el informe. Volvé a intentar." };
  }

  revalidatePath("/pacientes", "layout");
  return {};
}
