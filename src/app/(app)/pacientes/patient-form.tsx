"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/lib/form-state";
import type { ScheduleSlot } from "@/lib/schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormMessage } from "@/components/form-message";
import { initialPlan, planDate, SessionPlanFields, type SessionPlan } from "@/components/calendar/session-plan-fields";
import { BirthDateInput } from "./birth-date-input";

export type PatientFormDefaults = {
  first_name: string;
  last_name: string;
  schedules: ScheduleSlot[]; // horarios fijos vigentes; vacío = irregular
  phone_country: string;
  phone: string;
  dni: string;
  email: string;
  birth_date: string;
  session_fee: string;
};

export const EMPTY_PATIENT: PatientFormDefaults = {
  first_name: "",
  last_name: "",
  schedules: [],
  phone_country: "AR",
  phone: "",
  dni: "",
  email: "",
  birth_date: "",
  session_fee: "",
};

type PatientFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: PatientFormDefaults;
  countries: { code: string; label: string }[];
  submitLabel: string;
  cancelHref: string;
  isEdit?: boolean;
  archived?: boolean; // un paciente archivado no tiene sesiones: se oculta esa sección
};

export function PatientForm({ action, defaults, countries, submitLabel, cancelHref, isEdit, archived }: PatientFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const errors = state.fieldErrors ?? {};
  // Si hubo un error, se muestran los valores que el usuario había escrito.
  const v = (field: Exclude<keyof PatientFormDefaults, "schedules">) => state.values?.[field] ?? defaults[field];

  // Las sesiones son estado del componente (no inputs sueltos), así que no se pierden si hay error.
  const [plan, setPlan] = useState<SessionPlan>(() => initialPlan(defaults.schedules));
  const hadFixedSchedule = isEdit && defaults.schedules.length > 0;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <FormMessage error={state.error} />

      {/* Datos principales */}
      <Card>
        <CardHeader>
          <CardTitle>Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.first_name}>
                <FieldLabel htmlFor="first_name">Nombre</FieldLabel>
                <Input id="first_name" name="first_name" defaultValue={v("first_name")} aria-invalid={!!errors.first_name} autoComplete="off" required />
                <FieldError>{errors.first_name?.[0]}</FieldError>
              </Field>
              <Field data-invalid={!!errors.last_name}>
                <FieldLabel htmlFor="last_name">Apellido</FieldLabel>
                <Input id="last_name" name="last_name" defaultValue={v("last_name")} aria-invalid={!!errors.last_name} autoComplete="off" required />
                <FieldError>{errors.last_name?.[0]}</FieldError>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Sesiones: la misma interfaz que "Agregar sesión" */}
      <input type="hidden" name="schedule_type" value={plan.type} />
      <input
        type="hidden"
        name="schedules"
        value={JSON.stringify(plan.slots.map((s) => ({ weekday: s.weekday === "" ? null : Number(s.weekday), start_time: s.start, end_time: s.end })))}
      />
      <input type="hidden" name="session_date" value={plan.type === "irregular" ? planDate(plan) : ""} />
      <input type="hidden" name="session_start" value={plan.type === "irregular" ? plan.start : ""} />
      <input type="hidden" name="session_end" value={plan.type === "irregular" ? plan.end : ""} />
      {!archived && (
        <Card>
          <CardHeader>
            <CardTitle>Sesiones</CardTitle>
            <CardDescription>Cuándo se agendan sus sesiones y cuánto duran.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <SessionPlanFields
                value={plan}
                onChange={setPlan}
                error={errors.schedule?.[0]}
                fixedHint={
                  hadFixedSchedule
                    ? "Los días que quites dejan de agendarse: se borran sus sesiones futuras (las que tienen informe se conservan). Los que agregues empiezan en la próxima fecha."
                    : "Las sesiones se agendan automáticamente todas las semanas, a partir de la próxima fecha."
                }
                irregularHint={
                  <>
                    {hadFixedSchedule && "Al pasar a irregular se quitan las sesiones futuras de los horarios fijos (las que tienen informe se conservan). "}
                    Opcional: elegí fecha, inicio y fin para agendar una sesión, o dejalos vacíos.
                  </>
                }
              />
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {/* Contacto y otros datos */}
      <Card>
        <CardHeader>
          <CardTitle>Contacto y datos</CardTitle>
          <CardDescription>Todos opcionales.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
              <div className="flex gap-2">
                <NativeSelect name="phone_country" defaultValue={v("phone_country")} aria-label="País del teléfono" className="w-32 shrink-0 sm:w-44">
                  {countries.map((c) => (
                    <NativeSelectOption key={c.code} value={c.code}>
                      {c.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="11 2345-6789" defaultValue={v("phone")} aria-invalid={!!errors.phone} className="flex-1" />
              </div>
              <FieldDescription>Escribilo como quieras: con o sin 0, 15 o guiones.</FieldDescription>
              <FieldError>{errors.phone?.[0]}</FieldError>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.dni}>
                <FieldLabel htmlFor="dni">Documento</FieldLabel>
                <Input id="dni" name="dni" inputMode="numeric" defaultValue={v("dni")} aria-invalid={!!errors.dni} autoComplete="off" />
                <FieldError>{errors.dni?.[0]}</FieldError>
              </Field>
              <Field data-invalid={!!errors.birth_date}>
                <FieldLabel htmlFor="birth_date">Fecha de nacimiento</FieldLabel>
                <BirthDateInput id="birth_date" name="birth_date" defaultValue={v("birth_date")} aria-invalid={!!errors.birth_date} />
                <FieldError>{errors.birth_date?.[0]}</FieldError>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" defaultValue={v("email")} aria-invalid={!!errors.email} autoComplete="off" />
                <FieldError>{errors.email?.[0]}</FieldError>
              </Field>
              <Field data-invalid={!!errors.session_fee}>
                <FieldLabel htmlFor="session_fee">Valor por sesión ($)</FieldLabel>
                <Input id="session_fee" name="session_fee" inputMode="decimal" placeholder="25.000" defaultValue={v("session_fee")} aria-invalid={!!errors.session_fee} />
                <FieldError>{errors.session_fee?.[0]}</FieldError>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        <Button variant="outline" render={<Link href={cancelHref} />} nativeButton={false}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
