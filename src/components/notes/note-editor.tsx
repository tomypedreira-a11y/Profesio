"use client";

// Anotación de una sesión: se escribe como borrador (que se guarda solo) y se finaliza.
// Una anotación finalizada no se modifica: se corrige creando una versión nueva.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { CheckIcon, LockIcon, PencilIcon } from "lucide-react";
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
import { registerPendingSave } from "@/lib/pending-saves";
import { discardCorrection, saveNote, type SaveNoteResult } from "./actions";

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
  // Se llama al cerrar el editor si se guardó algo, y al finalizar o descartar.
  onSaved?: () => void;
};

// Espera tras la última tecla antes de guardar: cada guardado queda en audit_log, no conviene uno por tecla.
const AUTOSAVE_DELAY = 3000;
// Si falla la conexión, se reintenta cada tanto sin perder lo escrito.
const RETRY_DELAY = 5000;

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "offline";

export function NoteEditor({ sessionId, timeZone, onSaved }: NoteEditorProps) {
  const supabase = useRef(createClient()).current;
  const [note, setNote] = useState<Note | null | undefined>(undefined); // undefined = cargando
  const [text, setText] = useState("");
  const [correcting, setCorrecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [pending, startTransition] = useTransition();

  // Los guardados leen los valores más recientes desde refs: pueden correr después de varios renders.
  const noteRef = useRef<Note | null>(null);
  const textRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Cola de guardados: uno por vez, así el segundo usa el id del borrador que creó el primero.
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const busyRef = useRef(0);
  const savedSomethingRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const applyNote = useCallback((next: Note | null) => {
    noteRef.current = next;
    setNote(next);
  }, []);

  const changeText = useCallback((value: string) => {
    textRef.current = value;
    setText(value);
  }, []);

  // Última versión de la anotación de esta sesión.
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("session_book")
      .select("note_id, content, note_status, version, finalized_at")
      .eq("session_id", sessionId)
      .maybeSingle();
    const current = (data as Note | null) ?? null;
    applyNote(current);
    changeText(current?.content ?? "");
    setCorrecting(false);
    setStatus("idle");
  }, [supabase, sessionId, applyNote, changeText]);

  useEffect(() => {
    void load();
  }, [load]);

  // Hay cambios sin guardar respecto de la última versión (la base guarda el texto sin espacios de los bordes).
  const isDirty = useCallback(() => textRef.current.trim() !== (noteRef.current?.content ?? "").trim(), []);

  // Encola un guardado. Borrador existente → se actualiza; finalizada → se crea la corrección.
  const persist = useCallback(
    (finalize: boolean) => {
      const run = async (): Promise<SaveNoteResult | null> => {
        const current = noteRef.current;
        const content = textRef.current;
        // Un borrador vacío o sin cambios no se guarda (al finalizar sí se valida en la acción).
        if (!finalize && (!content.trim() || !isDirty())) return null;

        const isFinalNow = current?.note_status === "final";
        busyRef.current++;
        try {
          const result = await saveNote({
            sessionId,
            content,
            finalize,
            noteId: current && !isFinalNow ? current.note_id : undefined,
            supersedesId: current && isFinalNow ? current.note_id : undefined,
          });
          if (result.error === undefined) {
            savedSomethingRef.current = true;
            applyNote({
              note_id: result.noteId,
              content: content.trim(),
              note_status: finalize ? "final" : "draft",
              version: result.version,
              finalized_at: result.finalizedAt,
            });
          }
          return result;
        } finally {
          busyRef.current--;
        }
      };
      const next = queueRef.current.then(run, run);
      queueRef.current = next.catch(() => {});
      return next;
    },
    [sessionId, isDirty, applyNote],
  );

  // El guardado se reprograma a sí mismo (seguir escribiendo, reintentos): se llama por ref.
  const autosaveRef = useRef<() => Promise<void>>(async () => {});
  const scheduleAutosave = useCallback((delay: number) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void autosaveRef.current(), delay);
  }, []);

  const autosave = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (!textRef.current.trim() || !isDirty()) return;
    setStatus("saving");
    try {
      const result = await persist(false);
      if (result?.error) {
        // Error de datos o de una regla de la base: se muestra; el próximo cambio vuelve a intentar.
        setError(result.error);
        setStatus("unsaved");
        return;
      }
      setError(undefined);
      // Si se siguió escribiendo mientras se guardaba, queda otro guardado pendiente.
      if (isDirty()) {
        setStatus("unsaved");
        scheduleAutosave(AUTOSAVE_DELAY);
      } else {
        setStatus("saved");
      }
    } catch {
      // Sin conexión (la acción no llegó al servidor): lo escrito sigue en pantalla y se reintenta.
      setStatus("offline");
      scheduleAutosave(RETRY_DELAY);
    }
  }, [isDirty, persist, scheduleAutosave]);
  useEffect(() => {
    autosaveRef.current = autosave;
  }, [autosave]);

  function handleChange(value: string) {
    changeText(value);
    clearTimeout(timerRef.current);
    // Vacío: no se guarda. Igual a lo guardado: no hay nada pendiente.
    if (!value.trim() || !isDirty()) {
      setStatus(!value.trim() ? "unsaved" : savedSomethingRef.current ? "saved" : "idle");
      return;
    }
    setStatus("unsaved");
    scheduleAutosave(AUTOSAVE_DELAY);
  }

  // Al salir de la app en el celular (cambiar de app, bloquear) se guarda enseguida.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void autosave();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [autosave]);

  // Antes de cerrar la sesión (menú o inactividad) se guarda lo pendiente y se espera lo que esté en camino.
  useEffect(
    () =>
      registerPendingSave(async () => {
        await autosave();
        await queueRef.current;
      }),
    [autosave],
  );

  // Cerrar o recargar la pestaña con cambios sin guardar: el navegador pide confirmación.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty() || busyRef.current > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Al cerrar el editor (cerrar el panel, abrir otra sesión, navegar) se guarda lo pendiente.
  useEffect(() => {
    const timer = timerRef;
    const saved = savedSomethingRef;
    const callback = onSavedRef;
    return () => {
      clearTimeout(timer.current);
      void persist(false)
        .then(() => saved.current && callback.current?.())
        .catch(() => toast.error("No se pudo guardar el último cambio de la anotación. Revisá tu conexión."));
    };
  }, [persist]);

  const isFinal = note?.note_status === "final";
  const editing = !isFinal || correcting;
  const isCorrectionDraft = note?.note_status === "draft" && note.version > 1;

  function finalize() {
    clearTimeout(timerRef.current);
    setError(undefined);
    setStatus("saving");
    startTransition(async () => {
      try {
        const result = await persist(true);
        if (result?.error) {
          setError(result.error);
          setStatus("unsaved");
          return;
        }
        setCorrecting(false);
        setStatus("idle");
        toast.success("Anotación finalizada.");
        onSavedRef.current?.();
      } catch {
        setError("No se pudo finalizar la anotación. Revisá tu conexión y volvé a intentar.");
        setStatus("offline");
        // Finalizar se reintenta a mano; el borrador, solo.
        scheduleAutosave(RETRY_DELAY);
      }
    });
  }

  // Corrección todavía sin guardar: se vuelve al texto finalizado sin tocar la base.
  function cancelCorrection() {
    clearTimeout(timerRef.current);
    changeText(noteRef.current?.content ?? "");
    setCorrecting(false);
    setError(undefined);
    setStatus("idle");
  }

  function discard() {
    const current = noteRef.current;
    if (!current) return;
    clearTimeout(timerRef.current);
    setError(undefined);
    startTransition(async () => {
      await queueRef.current; // que no quede un guardado en camino sobre el borrador que se borra
      const result = await discardCorrection(current.note_id);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Corrección descartada.");
      await load();
      onSavedRef.current?.();
    });
  }

  if (note === undefined) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Anotación</h3>
        <div className="flex gap-1.5">
          {note && (note.note_status === "final" ? <Badge>Finalizada</Badge> : <Badge variant="secondary">Borrador</Badge>)}
          {note && note.version > 1 && <Badge variant="outline">Corregida (v{note.version})</Badge>}
        </div>
      </div>

      <FormMessage error={error} />

      {editing ? (
        <>
          <Textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Escribí la anotación de la sesión…"
            className="min-h-40"
            aria-label="Anotación de la sesión"
          />
          <SaveIndicator status={status} />
          {(correcting || isCorrectionDraft) && (
            <p className="text-xs text-muted-foreground">
              La corrección se guarda como una versión nueva. La versión anterior queda registrada.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || !text.trim()} onClick={() => setConfirmOpen(true)}>
              <LockIcon />
              Finalizar
            </Button>
            {/* Corrección todavía sin guardar: se cancela sin tocar la base. */}
            {isFinal && correcting && (
              <Button variant="ghost" disabled={pending || status === "saving"} onClick={cancelCorrection}>
                Cancelar
              </Button>
            )}
            {/* Corrección ya guardada como borrador: se descarta y vuelve a quedar la versión anterior. */}
            {isCorrectionDraft && (
              <Button variant="ghost" disabled={pending} onClick={() => setDiscardOpen(true)}>
                Descartar corrección
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">{note?.content}</p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {note?.finalized_at && `Finalizada el ${formatInTimeZone(note.finalized_at, timeZone, "dd/MM/yyyy HH:mm")}`}
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
            <AlertDialogTitle>¿Finalizar la anotación?</AlertDialogTitle>
            <AlertDialogDescription>
              Una anotación finalizada forma parte de la historia clínica y ya no se puede editar. Si después necesitás
              cambiar algo, podés corregirlo: la corrección queda como una versión nueva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmOpen(false); finalize(); }}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar la corrección?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el texto de la corrección y vuelve a quedar vigente la versión finalizada anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { setDiscardOpen(false); discard(); }}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Estado del guardado automático, debajo del texto.
function SaveIndicator({ status }: { status: SaveStatus }) {
  const messages: Record<SaveStatus, React.ReactNode> = {
    idle: "El borrador se guarda solo mientras escribís.",
    unsaved: "Cambios sin guardar…",
    saving: "Guardando…",
    saved: (
      <span className="inline-flex items-center gap-1">
        <CheckIcon className="size-3.5" />
        Borrador guardado
      </span>
    ),
    offline: "Sin conexión: lo escrito no se perdió, se va a guardar cuando vuelva.",
  };
  return (
    <p role="status" aria-live="polite" className={status === "offline" ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
      {messages[status]}
    </p>
  );
}
