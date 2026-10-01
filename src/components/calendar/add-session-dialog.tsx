"use client";

// Panel "Agregar sesión": paciente + regular (días fijos) o irregular (una fecha).
// Se usa en Sesiones, en el calendario y en la ficha del paciente.
import Link from "next/link";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { UserRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { addSessions } from "@/app/(app)/sesiones/actions";
import { formatSchedules } from "@/lib/format";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormMessage } from "@/components/form-message";
import { useSessionLength, useTimeZone } from "@/components/profile-defaults-provider";
import { useVacations } from "@/components/vacations-provider";
import { dayKey, isVacationDay } from "@/lib/vacations";
import { todayIn } from "@/lib/zoned";
import {
  FIRST_DATE_ERROR,
  initialPlan,
  missingFirstDate,
  planDate,
  planSlots,
  SessionPlanFields,
  type SessionPlan,
} from "./session-plan-fields";
import type { PatientOption } from "./types";

// Horas escritas como HH:MM; el fin (opcional) después del inicio y sin pasar la medianoche.
const RANGE_ERROR = "Completá el día y el inicio de cada sesión. El fin tiene que ser después del inicio, sin pasar la medianoche.";

type AddSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: PatientOption[];
  patientId?: string; // paciente elegido de antemano
  lockPatient?: boolean; // en la ficha del paciente no se puede cambiar
  defaultDate?: Date;
  showPatientLink?: boolean; // botón a la ficha del paciente (desde "No agendados" del calendario)
  onAdded?: () => void;
};

export function AddSessionDialog({
  open,
  onOpenChange,
  patients,
  patientId,
  lockPatient,
  defaultDate,
  showPatientLink,
  onAdded,
}: AddSessionDialogProps) {
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
            showPatientLink={showPatientLink}
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
  showPatientLink,
  onDone,
}: Omit<AddSessionDialogProps, "open" | "onOpenChange" | "onAdded"> & { onDone: () => void }) {
  const today = todayIn(useTimeZone());
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [plan, setPlan] = useState<SessionPlan>(() => initialPlan([], defaultDate && defaultDate >= today ? defaultDate : today));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const minutes = useSessionLength();
  const patient = patients.find((p) => p.id === patientId);

  // Aviso de vacaciones: una suelta en esos días es una urgencia; un horario fijo los saltea.
  const vacations = useVacations();
  const vacationNotice =
    plan.type === "irregular"
      ? plan.date && isVacationDay(vacations, plan.date)
        ? "Ese día estás de vacaciones: se agenda como sesión suelta, para una urgencia."
        : undefined
      : vacations.some((v) => v.end_date >= dayKey(today))
        ? "Los días de tus vacaciones se saltean: esas semanas no se agenda la sesión."
        : undefined;

  function submit() {
    if (!patient) return setError("Elegí el paciente.");
    const slots = planSlots(plan, minutes);
    const end = resolveEnd(plan.start, plan.end, minutes);
    if (plan.type === "fixed" && !slots) return setError(RANGE_ERROR);
    if (missingFirstDate(plan)) return setError(FIRST_DATE_ERROR);
    if (plan.type === "irregular" && !plan.date) return setError("Elegí la fecha.");
    if (plan.type === "irregular" && !isValidRange(plan.start, end)) {
      return setError("Completá el inicio. El fin tiene que ser después del inicio, sin pasar la medianoche.");
    }
    setError(undefined);

    startTransition(async () => {
      const result =
        plan.type === "fixed"
          ? await addSessions({ type: "fixed", patientId: patient.id, slots: slots! })
          : await addSessions({ type: "irregular", patientId: patient.id, date: planDate(plan), start: plan.start, end });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(
          plan.type === "fixed"
            ? `Horario agregado: ${formatSchedules(slots!)}.`
            : `Sesión agendada: ${format(plan.date!, "dd/MM")} de ${plan.start} a ${end}.`,
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
          <Select
            value={patientId || null}
            onValueChange={(value) => setPatientId(value ?? "")}
            items={patients.map((p) => ({ value: p.id, label: p.name }))}
            disabled={patients.length === 0}
          >
            <SelectTrigger id="add-session-patient" className="w-full">
              <SelectValue placeholder={patients.length === 0 ? "No hay pacientes activos" : "Elegí un paciente"} />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {showPatientLink && patient && (
        <Button variant="outline" render={<Link href={`/pacientes/${patient.id}`} />} nativeButton={false}>
          <UserRoundIcon />
          Ver ficha del paciente
        </Button>
      )}

      <SessionPlanFields
        value={plan}
        onChange={setPlan}
        fixedHint={
          patient && patient.schedules.length > 0
            ? `Ya tiene: ${formatSchedules(patient.schedules)}. Los días que agregues se suman.`
            : undefined
        }
      />

      {vacationNotice && <p className="rounded-lg bg-(--vacation) px-3 py-2 text-sm">{vacationNotice}</p>}

      <DialogFooter>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Agendando…" : "Agendar"}
        </Button>
      </DialogFooter>
    </>
  );
}
