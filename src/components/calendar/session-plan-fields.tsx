"use client";

// Cómo se agendan las sesiones: regular (uno o más días fijos cada semana)
// o irregular (una fecha en el calendario). Se usa en "Agregar sesión" y en el formulario de paciente.
import type { ReactNode } from "react";
import { format } from "date-fns";
import { PlusIcon, XIcon } from "lucide-react";
import { isValidRange, type ScheduleSlot } from "@/lib/schedule";
import { WEEKDAYS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DateTimePicker } from "./date-time-picker";
import { TimeInput } from "./time-range-fields";

type PlanSlot = { weekday: string; start: string; end: string }; // "" = sin completar

export type SessionPlan = {
  type: "fixed" | "irregular";
  slots: PlanSlot[];
  date: Date | undefined;
  start: string;
  end: string;
};

export function initialPlan(slots: ScheduleSlot[] = [], date?: Date): SessionPlan {
  return {
    type: slots.length > 0 ? "fixed" : "irregular",
    slots:
      slots.length > 0
        ? slots.map((s) => ({ weekday: String(s.weekday), start: s.start_time, end: s.end_time }))
        : [{ weekday: "", start: "", end: "" }],
    date,
    start: "",
    end: "",
  };
}

// Horarios del plan en el formato de la base. null si falta algún dato o un fin no es posterior a su inicio.
export function planSlots(plan: SessionPlan): ScheduleSlot[] | null {
  if (plan.slots.some((s) => s.weekday === "" || !isValidRange(s.start, s.end))) return null;
  return plan.slots.map((s) => ({ weekday: Number(s.weekday), start_time: s.start, end_time: s.end }));
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
              <FieldDescription>Todas las semanas, los mismos días y horarios.</FieldDescription>
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
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2rem] gap-2 text-sm font-medium">
            <span>Día</span>
            <span>Inicio</span>
            <span>Fin</span>
          </div>
          {value.slots.map((slot, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2rem] items-center gap-2">
              <NativeSelect
                value={slot.weekday}
                onChange={(e) => setSlot(i, { weekday: e.target.value })}
                aria-label="Día"
                className="w-full"
              >
                <NativeSelectOption value="" disabled>
                  Elegí un día
                </NativeSelectOption>
                {/* Lunes primero, domingo al final */}
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <NativeSelectOption key={d} value={String(d)}>
                    {WEEKDAYS[d]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <TimeInput value={slot.start} onChange={(start) => setSlot(i, { start })} aria-label="Inicio" />
              <TimeInput
                value={slot.end}
                onChange={(end) => setSlot(i, { end })}
                invalid={slot.start.length === 5 && slot.end.length === 5 && slot.end <= slot.start}
                aria-label="Fin"
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            // El día nuevo arranca con el mismo horario que el último, que suele repetirse.
            onClick={() => {
              const last = value.slots.at(-1);
              set({ slots: [...value.slots, { weekday: "", start: last?.start ?? "", end: last?.end ?? "" }] });
            }}
          >
            <PlusIcon />
            Agregar otro día
          </Button>
          {fixedHint && <FieldDescription>{fixedHint}</FieldDescription>}
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
        </div>
      )}

      {error && <FieldError>{error}</FieldError>}
    </>
  );
}
