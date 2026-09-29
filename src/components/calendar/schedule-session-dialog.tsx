"use client";

// Panel para agendar una sesión suelta: fecha (calendario) + horario.
import { useState, useTransition } from "react";
import { format, startOfDay } from "date-fns";
import { toast } from "sonner";
import { scheduleSession } from "@/app/(app)/sesiones/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormMessage } from "@/components/form-message";
import { DateTimePicker } from "./date-time-picker";

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

      <DateTimePicker date={date} onDateChange={setDate} time={time} onTimeChange={setTime} />

      <DialogFooter>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Agendando…" : "Agendar"}
        </Button>
      </DialogFooter>
    </>
  );
}
