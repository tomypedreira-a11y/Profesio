"use client";

// Inicio y fin de una sesión, escritos con el teclado numérico: "1830" → "18:30".
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSessionLength } from "@/components/profile-defaults-provider";
import { endFromDuration, isValidTime } from "@/lib/schedule";

// Mientras se escribe: los dos puntos se agregan solos.
function mask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// Al salir del campo se completa: "9" → "09:00", "930" → "09:30", "18" → "18:00".
function complete(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `${digits.padStart(2, "0")}:00`;
  if (digits.length === 3) return `0${digits[0]}:${digits.slice(1)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
}

type TimeInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

export function TimeInput({ id, value, onChange, invalid, placeholder = "HH:MM", ...props }: TimeInputProps) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      maxLength={5}
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(mask(e.target.value))}
      onBlur={() => onChange(complete(value))}
      aria-invalid={invalid || (value.length === 5 && !isValidTime(value))}
      aria-label={props["aria-label"]}
      className="tabular-nums"
    />
  );
}

type TimeRangeFieldsProps = {
  idPrefix: string;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

// Placeholder del fin: la hora que se usa si se deja vacío (inicio + duración habitual).
export function useEndPlaceholder(start: string) {
  const minutes = useSessionLength();
  return endFromDuration(start, minutes) || "HH:MM";
}

// Inicio y fin con sus etiquetas (sesión suelta y reprogramar). El fin es opcional.
export function TimeRangeFields({ idPrefix, start, end, onStartChange, onEndChange }: TimeRangeFieldsProps) {
  const endBeforeStart = isValidTime(start) && isValidTime(end) && end <= start;
  const endPlaceholder = useEndPlaceholder(start);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-start`}>Inicio</FieldLabel>
        <TimeInput id={`${idPrefix}-start`} value={start} onChange={onStartChange} />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-end`}>Fin</FieldLabel>
        <TimeInput id={`${idPrefix}-end`} value={end} onChange={onEndChange} invalid={endBeforeStart} placeholder={endPlaceholder} />
        <FieldDescription>(opcional)</FieldDescription>
      </Field>
    </div>
  );
}
