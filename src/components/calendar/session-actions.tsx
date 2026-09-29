"use client";

// Acciones sobre una sesión: reprogramar, cancelar y deshacer la cancelación.
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CalendarClockIcon, CalendarXIcon, UndoIcon } from "lucide-react";
import { toast } from "sonner";
import { cancelSession, rescheduleSession, restoreSession } from "@/app/(app)/sesiones/actions";
import { isValidRange, resolveEnd } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormMessage } from "@/components/form-message";
import { useSessionLength } from "@/components/profile-defaults-provider";
import { DateTimePicker } from "./date-time-picker";
import type { CalendarSession } from "./types";

type Scope = "one" | "following";

type SessionActionsProps = {
  session: CalendarSession;
  timeZone: string;
  onChanged: () => void;
};

export function SessionActions({ session, timeZone, onChanged }: SessionActionsProps) {
  const [dialog, setDialog] = useState<"reschedule" | "cancel" | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelled = session.status === "cancelled";
  // "Esta y las siguientes" solo tiene sentido en un horario fijo vigente y en sesiones futuras.
  const canAffectFollowing = session.series_active && session.starts_at > new Date().toISOString();

  function restore() {
    startTransition(async () => {
      const result = await restoreSession(session.id);
      if (result.error) toast.error(result.error);
      else {
        toast.success("La sesión vuelve a estar agendada.");
        onChanged();
      }
    });
  }

  if (cancelled) {
    return (
      <Button variant="outline" disabled={pending} onClick={restore}>
        <UndoIcon />
        Deshacer cancelación
      </Button>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setDialog("reschedule")}>
          <CalendarClockIcon />
          Reprogramar
        </Button>
        <Button variant="outline" onClick={() => setDialog("cancel")} className="text-destructive">
          <CalendarXIcon />
          Cancelar
        </Button>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
          {dialog === "reschedule" && (
            <RescheduleForm
              session={session}
              timeZone={timeZone}
              canAffectFollowing={!!canAffectFollowing}
              onDone={() => {
                setDialog(null);
                onChanged();
              }}
            />
          )}
          {dialog === "cancel" && (
            <CancelForm
              session={session}
              canAffectFollowing={!!canAffectFollowing}
              onClose={() => setDialog(null)}
              onDone={() => {
                setDialog(null);
                onChanged();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Elegir entre "solo esta" y "esta y las siguientes".
function ScopeChoice({
  value,
  onChange,
  followingDescription,
}: {
  value: Scope;
  onChange: (scope: Scope) => void;
  followingDescription: string;
}) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as Scope)} className="gap-2">
      <FieldLabel htmlFor="scope-one">
        <Field orientation="horizontal">
          <RadioGroupItem value="one" id="scope-one" />
          <FieldContent>
            <FieldTitle>Solo esta sesión</FieldTitle>
          </FieldContent>
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor="scope-following">
        <Field orientation="horizontal">
          <RadioGroupItem value="following" id="scope-following" />
          <FieldContent>
            <FieldTitle>Esta y las siguientes</FieldTitle>
            <FieldDescription>{followingDescription}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
}

function RescheduleForm({
  session,
  timeZone,
  canAffectFollowing,
  onDone,
}: {
  session: CalendarSession;
  timeZone: string;
  canAffectFollowing: boolean;
  onDone: () => void;
}) {
  // Arranca con la fecha y hora actuales de la sesión (si no pasó).
  const current = new Date(formatInTimeZone(session.starts_at, timeZone, "yyyy-MM-dd'T'HH:mm"));
  const [date, setDate] = useState<Date | undefined>(current > new Date() ? current : undefined);
  const [start, setStart] = useState(formatInTimeZone(session.starts_at, timeZone, "HH:mm"));
  const [end, setEnd] = useState(formatInTimeZone(session.ends_at, timeZone, "HH:mm"));
  const [scope, setScope] = useState<Scope>("one");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const minutes = useSessionLength();

  function submit() {
    if (!date) {
      setError("Elegí la fecha.");
      return;
    }
    const resolvedEnd = resolveEnd(start, end, minutes);
    if (!isValidRange(start, resolvedEnd)) {
      setError("Completá el inicio. El fin tiene que ser después del inicio, sin pasar la medianoche.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await rescheduleSession({ sessionId: session.id, date: format(date, "yyyy-MM-dd"), start, end: resolvedEnd, scope });
      if (result.error) setError(result.error);
      else {
        toast.success(scope === "one" ? "Sesión reprogramada." : "Horario fijo actualizado.");
        onDone();
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reprogramar sesión</DialogTitle>
        <DialogDescription>
          {session.first_name} {session.last_name} · actualmente {formatInTimeZone(session.starts_at, timeZone, "dd/MM HH:mm")}–{formatInTimeZone(session.ends_at, timeZone, "HH:mm")}
        </DialogDescription>
      </DialogHeader>
      <FormMessage error={error} />
      {canAffectFollowing && (
        <ScopeChoice
          value={scope}
          onChange={setScope}
          followingDescription="Cambia el horario fijo: desde la nueva fecha, todas las semanas ese día y horario."
        />
      )}
      <DateTimePicker date={date} onDateChange={setDate} start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
      <DialogFooter>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Guardando…" : "Reprogramar"}
        </Button>
      </DialogFooter>
    </>
  );
}

function CancelForm({
  session,
  canAffectFollowing,
  onClose,
  onDone,
}: {
  session: CalendarSession;
  canAffectFollowing: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [scope, setScope] = useState<Scope>("one");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await cancelSession({ sessionId: session.id, scope });
      if (result.error) setError(result.error);
      else {
        toast.success(scope === "one" ? "Sesión cancelada." : "Horario fijo terminado.");
        onDone();
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cancelar sesión</DialogTitle>
        <DialogDescription>
          {session.first_name} {session.last_name}. La sesión queda registrada como cancelada y el horario se libera.
        </DialogDescription>
      </DialogHeader>
      <FormMessage error={error} />
      {canAffectFollowing && (
        <ScopeChoice
          value={scope}
          onChange={setScope}
          followingDescription="Termina el horario fijo: se quitan las sesiones siguientes y el paciente pasa a irregular. Las que tienen informe se conservan."
        />
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Volver
        </Button>
        <Button variant="destructive" onClick={submit} disabled={pending}>
          {pending ? "Cancelando…" : "Cancelar sesión"}
        </Button>
      </DialogFooter>
    </>
  );
}
