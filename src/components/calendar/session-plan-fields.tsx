"use client";

// Cómo se agendan las sesiones: regular (uno o más días fijos, cada 1, 2 o 3 semanas)
// o irregular (una fecha en el calendario). Se usa en "Agregar sesión" y en el formulario de paciente.
import type { ReactNode } from "react";
import { addWeeks, format, min, parseISO, startOfDay } from "date-fns";
import { PlusIcon, XIcon } from "lucide-react";
import {
  endFromDuration,
  frequencyWeeks,
  isValidRange,
  resolveEnd,
  SCHEDULE_FREQUENCIES,
  SESSION_LENGTHS,
  type ScheduleFrequency,
  type ScheduleSlot,
} from "@/lib/schedule";
import { WEEKDAYS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSessionLength } from "@/components/profile-defaults-provider";
import { DatePicker, DateTimePicker } from "./date-time-picker";
import { TimeInput } from "./time-range-fields";

type PlanSlot = { weekday: string; start: string; end: string }; // "" = sin completar

// Lunes primero, domingo al final.
const WEEKDAY_ITEMS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAYS[d] }));

export type SessionPlan = {
  type: "fixed" | "irregular";
  slots: PlanSlot[];
  // Regular: una frecuencia para todos los días; si no es semanal, la fecha de la primera sesión.
  frequency: ScheduleFrequency;
  firstDate: Date | undefined;
  date: Date | undefined;
  start: string;
  end: string;
};

const FREQUENCY_ITEMS = SCHEDULE_FREQUENCIES.map((f) => ({ value: f.value, label: f.label }));

// Próxima fecha de los horarios guardados, según su fecha de inicio y su frecuencia. Al editar se
// muestra como "Primera sesión": si no se cambia, el paciente sigue en las mismas semanas.
function nextScheduledDate(slots: ScheduleSlot[]): Date | undefined {
  const today = startOfDay(new Date());
  const dates = slots
    .filter((s) => s.start_date)
    .map((s) => {
      let d = parseISO(s.start_date!);
      while (d < today) d = addWeeks(d, frequencyWeeks(s.frequency));
      return d;
    });
  return dates.length > 0 ? min(dates) : undefined;
}

// Sin horarios fijos arranca en `emptyType`: irregular al agregar una sesión, regular al crear un paciente.
export function initialPlan(slots: ScheduleSlot[] = [], date?: Date, emptyType: SessionPlan["type"] = "irregular"): SessionPlan {
  const frequency = slots[0]?.frequency ?? "weekly";
  return {
    type: slots.length > 0 ? "fixed" : emptyType,
    slots:
      slots.length > 0
        ? slots.map((s) => ({ weekday: String(s.weekday), start: s.start_time, end: s.end_time }))
        : [{ weekday: "", start: "", end: "" }],
    frequency,
    firstDate: frequency === "weekly" ? undefined : nextScheduledDate(slots),
    date,
    start: "",
    end: "",
  };
}

// Regular con otra frecuencia que la semanal: hace falta la fecha de la primera sesión.
export const missingFirstDate = (plan: SessionPlan) =>
  plan.type === "fixed" && plan.frequency !== "weekly" && !plan.firstDate;

export const FIRST_DATE_ERROR = "Elegí la fecha de la primera sesión.";

// Horarios del plan como se envían a la base: el fin vacío se completa con la duración habitual,
// y cada uno lleva la frecuencia y la semana de la primera sesión (sin fecha, la actual).
function draftSlots(plan: SessionPlan, minutes: number) {
  const start_date = plan.frequency !== "weekly" && plan.firstDate ? format(plan.firstDate, "yyyy-MM-dd") : undefined;
  return plan.slots.map((s) => ({
    weekday: s.weekday === "" ? null : Number(s.weekday),
    start_time: s.start,
    end_time: resolveEnd(s.start, s.end, minutes),
    frequency: plan.frequency,
    start_date,
  }));
}

// Para el campo oculto del formulario de paciente (lo valida el servidor).
export const planSlotsJson = (plan: SessionPlan, minutes: number) => JSON.stringify(draftSlots(plan, minutes));

// null si falta algún dato o un fin no es posterior a su inicio.
export function planSlots(plan: SessionPlan, minutes: number): ScheduleSlot[] | null {
  const slots = draftSlots(plan, minutes);
  if (slots.some((s) => s.weekday === null || !isValidRange(s.start_time, s.end_time))) return null;
  return slots.map((s) => ({ ...s, weekday: s.weekday! }));
}

export function planDate(plan: SessionPlan): string {
  return plan.date ? format(plan.date, "yyyy-MM-dd") : "";
}

type SessionPlanFieldsProps = {
  value: SessionPlan;
  onChange: (plan: SessionPlan) => void;
  error?: string;
  fixedHint?: ReactNode;
  irregularHint?: ReactNode;
};

export function SessionPlanFields({ value, onChange, error, fixedHint, irregularHint }: SessionPlanFieldsProps) {
  const set = (changes: Partial<SessionPlan>) => onChange({ ...value, ...changes });
  const setSlot = (index: number, changes: Partial<PlanSlot>) =>
    set({ slots: value.slots.map((s, i) => (i === index ? { ...s, ...changes } : s)) });

  const minutes = useSessionLength();
  const lengthLabel = SESSION_LENGTHS.find((l) => l.minutes === minutes)?.label ?? `${minutes} minutos`;
  const endHint = `Si dejás el fin vacío, la sesión dura ${lengthLabel} (se cambia en Mi perfil).`;

  return (
    <>
      <RadioGroup
        value={value.type}
        onValueChange={(type) => set({ type: type as SessionPlan["type"] })}
        className="grid gap-3 sm:grid-cols-2"
      >
        <FieldLabel htmlFor="plan-fixed">
          <Field orientation="horizontal">
            <RadioGroupItem value="fixed" id="plan-fixed" />
            <FieldContent>
              <FieldTitle>Regular</FieldTitle>
              <FieldDescription>Los mismos días y horarios, cada 1, 2 o 3 semanas.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
        <FieldLabel htmlFor="plan-irregular">
          <Field orientation="horizontal">
            <RadioGroupItem value="irregular" id="plan-irregular" />
            <FieldContent>
              <FieldTitle>Irregular</FieldTitle>
              <FieldDescription>Una sesión en la fecha que elijas.</FieldDescription>
            </FieldContent>
          </Field>
        </FieldLabel>
      </RadioGroup>

      {value.type === "fixed" ? (
        <div className="flex flex-col gap-2">
          <div className="mb-2 grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="plan-frequency">Frecuencia</FieldLabel>
              <Select
                value={value.frequency}
                onValueChange={(frequency) => frequency && set({ frequency: frequency as ScheduleFrequency })}
                items={FREQUENCY_ITEMS}
              >
                <SelectTrigger id="plan-frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_ITEMS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {value.frequency !== "weekly" && (
              <Field>
                <FieldLabel htmlFor="plan-first-date">Primera sesión</FieldLabel>
                <DatePicker id="plan-first-date" date={value.firstDate} onDateChange={(firstDate) => set({ firstDate })} />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2rem] gap-2 text-sm font-medium">
            <span>Día</span>
            <span>Inicio</span>
            <span>Fin</span>
          </div>
          {value.slots.map((slot, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2rem] items-center gap-2">
              <Select
                value={slot.weekday || null}
                onValueChange={(weekday) => setSlot(i, { weekday: weekday ?? "" })}
                items={WEEKDAY_ITEMS}
              >
                <SelectTrigger aria-label="Día" className="w-full">
                  <SelectValue placeholder="Elegí un día" />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_ITEMS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TimeInput value={slot.start} onChange={(start) => setSlot(i, { start })} aria-label="Inicio" />
              <TimeInput
                value={slot.end}
                onChange={(end) => setSlot(i, { end })}
                invalid={slot.start.length === 5 && slot.end.length === 5 && slot.end <= slot.start}
                placeholder={endFromDuration(slot.start, minutes) || "HH:MM"}
                aria-label="Fin (opcional)"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => set({ slots: value.slots.filter((_, j) => j !== i) })}
                disabled={value.slots.length === 1}
                aria-label="Quitar día"
              >
                <XIcon />
              </Button>
            </div>
          ))}
          {/* "(opcional)" debajo de la columna del fin */}
          <div className="-mt-1 grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2rem] gap-2 text-xs text-muted-foreground">
            <span className="col-start-3">(opcional)</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => set({ slots: [...value.slots, { weekday: "", start: "", end: "" }] })}
          >
            <PlusIcon />
            Agregar otro día
          </Button>
          <FieldDescription>
            {value.frequency === "weekly"
              ? "Se agenda todas las semanas, a partir de la próxima fecha."
              : `Los días elegidos se agendan en la semana de la primera sesión y después cada ${frequencyWeeks(value.frequency)} semanas.`}
          </FieldDescription>
          {fixedHint && <FieldDescription>{fixedHint}</FieldDescription>}
          <FieldDescription>{endHint}</FieldDescription>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <DateTimePicker
            date={value.date}
            onDateChange={(date) => set({ date })}
            start={value.start}
            end={value.end}
            onStartChange={(start) => set({ start })}
            onEndChange={(end) => set({ end })}
          />
          {irregularHint && <FieldDescription>{irregularHint}</FieldDescription>}
          <FieldDescription>{endHint}</FieldDescription>
        </div>
      )}

      {error && <FieldError>{error}</FieldError>}
    </>
  );
}
