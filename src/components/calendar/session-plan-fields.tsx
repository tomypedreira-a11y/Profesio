"use client";

// Cómo se agendan las sesiones: regular (uno o más días fijos cada semana)
// o irregular (una fecha en el calendario). Se usa en "Agregar sesión" y en el formulario de paciente.
import type { ReactNode } from "react";
import { format } from "date-fns";
import { PlusIcon, XIcon } from "lucide-react";
import { endFromDuration, isValidRange, resolveEnd, SESSION_LENGTHS, type ScheduleSlot } from "@/lib/schedule";
import { WEEKDAYS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSessionLength } from "@/components/profile-defaults-provider";
import { DateTimePicker } from "./date-time-picker";
import { TimeInput } from "./time-range-fields";

type PlanSlot = { weekday: string; start: string; end: string }; // "" = sin completar

// Lunes primero, domingo al final.
const WEEKDAY_ITEMS = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: WEEKDAYS[d] }));

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

// Horarios del plan en el formato de la base, con el fin vacío completado con la duración habitual.
// null si falta algún dato o un fin no es posterior a su inicio.
export function planSlots(plan: SessionPlan, minutes: number): ScheduleSlot[] | null {
  const slots = plan.slots.map((s) => ({ weekday: s.weekday, start_time: s.start, end_time: resolveEnd(s.start, s.end, minutes) }));
  if (slots.some((s) => s.weekday === "" || !isValidRange(s.start_time, s.end_time))) return null;
  return slots.map((s) => ({ ...s, weekday: Number(s.weekday) }));
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
