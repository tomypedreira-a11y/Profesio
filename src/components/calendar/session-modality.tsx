"use client";

// Modalidad de una sesión (presencial o virtual), en su panel. Arranca con la del paciente.
// En una sesión futura se elige si el cambio es solo para esta o también para las siguientes.
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setSessionModality } from "@/app/(app)/sesiones/actions";
import { DEFAULT_MODALITY, isModality, modalityLabel, type Modality } from "@/lib/modality";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormMessage } from "@/components/form-message";
import { ModalityChoice } from "@/components/modality-choice";
import { ScopeChoice, type Scope } from "./session-actions";
import type { CalendarSession } from "./types";

type SessionModalityProps = {
  session: CalendarSession;
  onChanged: () => void;
};

export function SessionModality({ session, onChanged }: SessionModalityProps) {
  const saved: Modality = isModality(session.modality) ? session.modality : DEFAULT_MODALITY;
  const [value, setValue] = useState(saved);
  const [asking, setAsking] = useState<Modality | null>(null); // cambio esperando elegir el alcance
  const [scope, setScope] = useState<Scope>("one");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // "Esta y las siguientes" solo desde una sesión que todavía no pasó.
  const future = session.starts_at > new Date().toISOString();

  function save(next: Modality, nextScope: Scope) {
    setValue(next);
    startTransition(async () => {
      const result = await setSessionModality({ sessionId: session.id, modality: next, scope: nextScope });
      if (result.error) {
        setValue(saved); // vuelve a mostrar lo que quedó guardado
        if (asking) setError(result.error);
        else toast.error(result.error);
        return;
      }
      setAsking(null);
      toast.success(
        nextScope === "one"
          ? `Sesión ${modalityLabel(next).toLowerCase()}.`
          : `${session.first_name} pasa a ${modalityLabel(next).toLowerCase()} desde esta sesión.`,
      );
      onChanged();
    });
  }

  function choose(next: Modality) {
    if (next === value) return;
    if (!future) return save(next, "one");
    setScope("one");
    setError(undefined);
    setAsking(next);
  }

  return (
    <>
      <Field>
        <FieldLabel>Modalidad</FieldLabel>
        <ModalityChoice idPrefix={`session-modality-${session.id}`} value={value} onChange={choose} disabled={pending} />
      </Field>

      <Dialog open={asking !== null} onOpenChange={(open) => !open && !pending && setAsking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar a {modalityLabel(asking).toLowerCase()}</DialogTitle>
            <DialogDescription>
              {session.first_name} {session.last_name}
            </DialogDescription>
          </DialogHeader>
          <FormMessage error={error} />
          <ScopeChoice
            value={scope}
            onChange={setScope}
            followingDescription={`También sus sesiones siguientes, y pasa a ser la modalidad de ${session.first_name} de ahora en más.`}
          />
          <DialogFooter>
            <Button onClick={() => asking && save(asking, scope)} disabled={pending}>
              {pending ? "Guardando…" : "Cambiar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
