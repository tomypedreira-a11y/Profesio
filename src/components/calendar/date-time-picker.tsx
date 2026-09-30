"use client";

// Selector de fecha (calendario) + inicio y fin, usado al agendar y al reprogramar.
import { useState } from "react";
import { format, startOfDay } from "date-fns";
import { es as dateFnsEs } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// Solo la fecha: un botón que muestra la elegida y abre el calendario (ocupa menos lugar).
export function DatePicker({
  id,
  date,
  onDateChange,
}: {
  id?: string;
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = startOfDay(new Date());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button id={id} type="button" variant="outline" className="w-full justify-start font-normal" />}>
        <CalendarIcon />
        {date ? (
          <span className="first-letter:uppercase">{format(date, "EEEE d 'de' MMMM", { locale: dateFnsEs })}</span>
        ) : (
          <span className="text-muted-foreground">Elegí una fecha</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          selected={date}
          onSelect={(d) => {
            onDateChange(d);
            setOpen(false);
          }}
          defaultMonth={date ?? today}
          disabled={{ before: today }}
        />
      </PopoverContent>
    </Popover>
  );
}
