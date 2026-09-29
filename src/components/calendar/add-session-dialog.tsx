"use client";

// Panel "Agregar sesión": paciente + regular (días fijos) o irregular (una fecha).
// Se usa en Sesiones, en el calendario y en la ficha del paciente.
import { useState, useTransition } from "react";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { addSessions } from "@/app/(app)/sesiones/actions";
import { formatSchedules } from "@/lib/format";
import { isValidRange } from "@/lib/schedule";
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormMessage } from "@/components/form-message";
import { initialPlan, planDate, planSlots, SessionPlanFields, type SessionPlan } from "./session-plan-fields";
import type { PatientOption } from "./types";

// Horas escritas como HH:MM y el fin después del inicio.
const RANGE_ERROR = "Completá el día, el inicio y el fin de cada sesión (el fin tiene que ser después del inicio).";

type AddSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: PatientOption[];
  patientId?: string; // paciente elegido de antemano
  lockPatient?: boolean; // en la ficha del paciente no se puede cambiar
  defaultDate?: Date;
  onAdded?: () => void;
};

export function AddSessionDialog({ open, onOpenChange, patients, patientId, lockPatient, defaultDate, onAdded }: AddSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {open && (
          // key: al abrir para otro paciente, el formulario arranca de cero.
          <AddSessionForm
            key={patientId ?? ""}
            patients={patients}
            patientId={patientId}
            lockPatient={lockPatient}
            defaultDate={defaultDate}
            onDone={() => {
              onOpenChange(false);
              onAdded?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddSessionForm({
  patients,
  patientId: initialPatientId,
  lockPatient,
  defaultDate,
  onDone,
}: Omit<AddSessionDialogProps, "open" | "onOpenChange" | "onAdded"> & { onDone: () => void }) {
  const today = startOfDay(new Date());
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [plan, setPlan] = useState<SessionPlan>(() => initialPlan([], defaultDate && defaultDate >= today ? defaultDate : today));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const patient = patients.find((p) => p.id === patientId);

  function submit() {
    if (!patient) return setError("Elegí el paciente.");
    const slots = planSlots(plan);
    if (plan.type === "fixed" && !slots) return setError(RANGE_ERROR);
    if (plan.type === "irregular" && !plan.date) return setError("Elegí la fecha.");
    if (plan.type === "irregular" && !isValidRange(plan.start, plan.end)) {
      return setError("Completá el inicio y el fin (el fin tiene que ser después del inicio).");
    }
    setError(undefined);

    startTransition(async () => {
      const result =
        plan.type === "fixed"
          ? await addSessions({ type: "fixed", patientId: patient.id, slots: slots! })
          : await addSessions({ type: "irregular", patientId: patient.id, date: planDate(plan), start: plan.start, end: plan.end });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(
          plan.type === "fixed"
            ? `Horario agregado: ${formatSchedules(slots!)}.`
            : `Sesión agendada: ${format(plan.date!, "dd/MM")} de ${plan.start} a ${plan.end}.`,
        );
        onDone();
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Agregar sesión</DialogTitle>
        <DialogDescription>{lockPatient && patient ? patient.name : "Elegí el paciente y cuándo son sus sesiones."}</DialogDescription>
      </DialogHeader>

      <FormMessage error={error} />

      {!lockPatient && (
        <Field>
          <FieldLabel htmlFor="add-session-patient">Paciente</FieldLabel>
          <NativeSelect id="add-session-patient" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full">
            <NativeSelectOption value="" disabled>
              {patients.length === 0 ? "No hay pacientes activos" : "Elegí un paciente"}
            </NativeSelectOption>
            {patients.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      )}

      <SessionPlanFields
        value={plan}
        onChange={setPlan}
        fixedHint={
          patient && patient.schedules.length > 0
            ? `Ya tiene: ${formatSchedules(patient.schedules)}. Los días que agregues se suman.`
            : "Se agenda todas las semanas, a partir de la próxima fecha."
        }
      />

      <DialogFooter>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Agendando…" : "Agendar"}
        </Button>
      </DialogFooter>
    </>
  );
}
