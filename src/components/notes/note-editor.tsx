"use client";

// Informe de una sesión: se escribe como borrador y se finaliza.
// Un informe finalizado no se modifica: se corrige creando una versión nueva.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { LockIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormMessage } from "@/components/form-message";
import { saveNote } from "./actions";

type Note = {
  note_id: string;
  content: string;
  note_status: "draft" | "final";
  version: number;
  finalized_at: string | null;
};

type NoteEditorProps = {
  sessionId: string;
  timeZone: string;
  onSaved?: () => void;
};

export function NoteEditor({ sessionId, timeZone, onSaved }: NoteEditorProps) {
  const supabase = useRef(createClient()).current;
  const [note, setNote] = useState<Note | null | undefined>(undefined); // undefined = cargando
  const [text, setText] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // Última versión del informe de esta sesión.
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("session_book")
      .select("note_id, content, note_status, version, finalized_at")
      .eq("session_id", sessionId)
      .maybeSingle();
    const current = (data as Note | null) ?? null;
    setNote(current);
    setText(current?.content ?? "");
    setCorrecting(false);
  }, [supabase, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isFinal = note?.note_status === "final";
  const editing = !isFinal || correcting;
  const dirty = text.trim() !== (note?.content ?? "").trim();

  function save(finalize: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await saveNote({
        sessionId,
        content: text,
        finalize,
        // Borrador existente → se actualiza. Corrección → nueva versión del finalizado.
        noteId: note && !isFinal ? note.note_id : undefined,
        supersedesId: note && isFinal ? note.note_id : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(finalize ? "Informe finalizado." : "Borrador guardado.");
      await load();
      onSaved?.();
    });
  }

  if (note === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Informe</h3>
        <div className="flex gap-1.5">
          {note && (note.note_status === "final" ? <Badge>Finalizado</Badge> : <Badge variant="secondary">Borrador</Badge>)}
          {note && note.version > 1 && <Badge variant="outline">Corregido (v{note.version})</Badge>}
        </div>
      </div>

      <FormMessage error={error} />

      {editing ? (
        <>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí el informe de la sesión…"
            className="min-h-40"
            aria-label="Informe de la sesión"
          />
          {correcting && (
            <p className="text-xs text-muted-foreground">
              La corrección se guarda como una versión nueva. La versión anterior queda registrada.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={pending || !text.trim() || (!dirty && !correcting)} onClick={() => save(false)}>
              Guardar borrador
            </Button>
            <Button disabled={pending || !text.trim()} onClick={() => setConfirmOpen(true)}>
              <LockIcon />
              Finalizar
            </Button>
            {correcting && (
              <Button variant="ghost" disabled={pending} onClick={() => { setCorrecting(false); setText(note?.content ?? ""); }}>
                Cancelar
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">{note?.content}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {note?.finalized_at && `Finalizado el ${formatInTimeZone(note.finalized_at, timeZone, "dd/MM/yyyy HH:mm")}`}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCorrecting(true)}>
              <PencilIcon />
              Corregir
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Finalizar el informe?</AlertDialogTitle>
            <AlertDialogDescription>
              Un informe finalizado forma parte de la historia clínica y ya no se puede editar. Si después necesitás
              cambiar algo, podés corregirlo: la corrección queda como una versión nueva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); save(true); }}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
