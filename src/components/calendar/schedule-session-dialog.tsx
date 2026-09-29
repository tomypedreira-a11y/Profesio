"use client";

// Panel para agendar una sesión suelta: fecha (calendario) + horario.
import { useState, useTransition } from "react";
import { format, startOfDay } from "date-fns";
import { es } from "react-day-picker/locale";
import { toast } from "sonner";
import { scheduleSession } from "@/app/(app)/sesiones/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

// Horarios cada 15 minutos, de 7:00 a 22:00.
const TIMES = Array.from({ length: (22 - 7) * 4 + 1 }, (_, i) => {
  const minutes = 7 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

type ScheduleSessionDialogProps = {
  patient: { id: string; name: string } | null; // null = cerrado
  defaultDate?: Date;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
};

export function ScheduleSessionDialog({ patient, defaultDate, onOpenChange, onScheduled }: ScheduleSessionDialogProps) {
  return (
    <Dialog open={!!patient} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {patient && (
          // key: al abrir para otro paciente, el formulario arranca de cero.
          <ScheduleForm
            key={patient.id}
            patient={patient}
            defaultDate={defaultDate}
            onDone={() => {
              onOpenChange(false);
              onScheduled?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleForm({
  patient,
  defaultDate,
  onDone,
}: {
  patient: { id: string; name: string };
  defaultDate?: Date;
  onDone: () => void;
}) {
  const today = startOfDay(new Date());
  const initial = defaultDate && defaultDate >= today ? defaultDate : today;
  const [date, setDate] = useState<Date | undefined>(initial);
  const [time, setTime] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!date || !time) {
      setError("Elegí una fecha y un horario.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await scheduleSession({ patientId: patient.id, date: format(date, "yyyy-MM-dd"), time });
      if (result.error) {
        setError(result.error);
      } else {
        toast.success(`Sesión agendada: ${format(date, "dd/MM")} a las ${time}.`);
        onDone();
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Agendar sesión</DialogTitle>
        <DialogDescription>{patient.name} · 45 minutos</DialogDescription>
      </DialogHeader>

      <FormMessage error={error} />

      <Calendar
        mode="single"
        locale={es}
        selected={date}
        onSelect={setDate}
        defaultMonth={initial}
        disabled={{ before: today }}
        className="mx-auto rounded-lg border"
      />

      <Field>
        <FieldLabel htmlFor="session-time">Horario</FieldLabel>
        <NativeSelect id="session-time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full">
          <NativeSelectOption value="" disabled>
            Elegí un horario
          </NativeSelectOption>
          {TIMES.map((t) => (
            <NativeSelectOption key={t} value={t}>
              {t}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <DialogFooter>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Agendando…" : "Agendar"}
        </Button>
      </DialogFooter>
    </>
  );
}
