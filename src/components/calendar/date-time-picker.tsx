"use client";

// Selector de fecha (calendario) + inicio y fin, usado al agendar y al reprogramar.
import { startOfDay } from "date-fns";
import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { TimeRangeFields } from "./time-range-fields";

type DateTimePickerProps = {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

export function DateTimePicker({ date, onDateChange, start, end, onStartChange, onEndChange }: DateTimePickerProps) {
  const today = startOfDay(new Date());

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
      <TimeRangeFields idPrefix="session" start={start} end={end} onStartChange={onStartChange} onEndChange={onEndChange} />
    </>
  );
}
