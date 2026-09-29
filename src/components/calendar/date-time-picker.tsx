"use client";

// Selector de fecha (calendario) + horario, usado al agendar y al reprogramar.
import { startOfDay } from "date-fns";
import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// Horarios cada 15 minutos, de 7:00 a 22:00.
const TIMES = Array.from({ length: (22 - 7) * 4 + 1 }, (_, i) => {
  const minutes = 7 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

type DateTimePickerProps = {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  time: string;
  onTimeChange: (time: string) => void;
};

export function DateTimePicker({ date, onDateChange, time, onTimeChange }: DateTimePickerProps) {
  const today = startOfDay(new Date());
  // Si el horario actual no está en la lista (ej. 18:10), se agrega para no perderlo.
  const times = time && !TIMES.includes(time) ? [...TIMES, time].sort() : TIMES;

  return (
    <>
      <Calendar
        mode="single"
        locale={es}
        selected={date}
        onSelect={onDateChange}
        defaultMonth={date ?? today}
        disabled={{ before: today }}
        className="mx-auto rounded-lg border"
      />
      <Field>
        <FieldLabel htmlFor="session-time">Horario</FieldLabel>
        <NativeSelect id="session-time" value={time} onChange={(e) => onTimeChange(e.target.value)} className="w-full">
          <NativeSelectOption value="" disabled>
            Elegí un horario
          </NativeSelectOption>
          {times.map((t) => (
            <NativeSelectOption key={t} value={t}>
              {t}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
    </>
  );
}
