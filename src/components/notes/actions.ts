"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const noteSchema = z.object({
  sessionId: z.uuid(),
  noteId: z.uuid().optional(), // borrador existente a actualizar
  supersedesId: z.uuid().optional(), // anotación finalizada que se corrige
  content: z.string().trim().min(1, "Escribí la anotación antes de guardarla.").max(50000, "La anotación es demasiado larga."),
  finalize: z.boolean(),
});

export type SaveNoteInput = z.input<typeof noteSchema>;

export type SaveNoteResult =
  | { error: string }
  | { error?: undefined; noteId: string; version: number; finalizedAt: string | null };

// Guarda una anotación de sesión:
// - borrador existente → se actualiza;
// - sin anotación, o corrigiendo una finalizada → se crea una fila nueva (versión).
// Devuelve la fila guardada: el guardado automático sigue actualizando ese mismo borrador.
export async function saveNote(input: SaveNoteInput): Promise<SaveNoteResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const { sessionId, noteId, supersedesId, content, finalize } = parsed.data;
  const status = finalize ? "final" : "draft";

  const supabase = await createClient();
  const { data, error } = noteId
    ? await supabase.from("session_notes").update({ content, status }).eq("id", noteId).select("id, version, finalized_at").single()
    : await supabase
        .from("session_notes")
        .insert({ session_id: sessionId, content, status, supersedes_id: supersedesId ?? null })
        .select("id, version, finalized_at")
        .single();

  if (error) {
    // Mensajes de las reglas de la base (ej: "Una anotación finalizada no se puede modificar").
    return { error: error.code === "P0001" ? error.message : "No se pudo guardar la anotación. Volvé a intentar." };
  }

  // Los borradores se guardan solos cada pocos segundos: solo se refrescan las pantallas al finalizar.
  if (finalize) revalidatePath("/app/pacientes", "layout");
  return { noteId: data.id, version: data.version, finalizedAt: data.finalized_at };
}

// Descarta una corrección en borrador: vuelve a quedar vigente la versión finalizada anterior.
export async function discardCorrection(noteId: string): Promise<{ error?: string }> {
  if (!z.uuid().safeParse(noteId).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_notes")
    .delete()
    .eq("id", noteId)
    .eq("status", "draft")
    .not("supersedes_id", "is", null) // solo correcciones: un primer borrador no se descarta así
    .select("id");

  if (error || !data?.length) return { error: "No se pudo descartar la corrección. Volvé a intentar." };

  revalidatePath("/app/pacientes", "layout");
  return {};
}
