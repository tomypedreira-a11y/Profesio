"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/lib/form-state";
import { WEEKDAYS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormMessage } from "@/components/form-message";
import { BirthDateInput } from "./birth-date-input";

export type PatientFormDefaults = {
  first_name: string;
  last_name: string;
  schedule_type: "fixed" | "irregular";
  weekday: string;
  start_time: string;
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
  schedule_type: "irregular",
  weekday: "",
  start_time: "",
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
};

export function PatientForm({ action, defaults, countries, submitLabel, cancelHref, isEdit }: PatientFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as FormState);
  const errors = state.fieldErrors ?? {};
  // Si hubo un error, se muestran los valores que el usuario había escrito.
  const v = (field: keyof PatientFormDefaults) => state.values?.[field] ?? defaults[field];

  const [scheduleType, setScheduleType] = useState<string>(v("schedule_type"));
  const hadFixedSchedule = isEdit && defaults.schedule_type === "fixed";

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

      {/* Frecuencia */}
      <Card>
        <CardHeader>
          <CardTitle>Frecuencia</CardTitle>
          <CardDescription>Las sesiones duran 45 minutos.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <input type="hidden" name="schedule_type" value={scheduleType} />
            <RadioGroup value={scheduleType} onValueChange={(value) => setScheduleType(String(value))} className="grid gap-3 sm:grid-cols-2">
              <FieldLabel htmlFor="schedule-fixed">
                <Field orientation="horizontal">
                  <RadioGroupItem value="fixed" id="schedule-fixed" />
                  <FieldContent>
                    <FieldTitle>Constante</FieldTitle>
                    <FieldDescription>Todas las semanas, mismo día y horario.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
              <FieldLabel htmlFor="schedule-irregular">
                <Field orientation="horizontal">
                  <RadioGroupItem value="irregular" id="schedule-irregular" />
                  <FieldContent>
                    <FieldTitle>Irregular</FieldTitle>
                    <FieldDescription>Días u horarios variables; las sesiones se agendan de a una.</FieldDescription>
                  </FieldContent>
                </Field>
              </FieldLabel>
            </RadioGroup>

            {scheduleType === "fixed" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field data-invalid={!!errors.weekday}>
                    <FieldLabel htmlFor="weekday">Día</FieldLabel>
                    <NativeSelect id="weekday" name="weekday" defaultValue={v("weekday")} aria-invalid={!!errors.weekday} className="w-full">
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
                    <FieldError>{errors.weekday?.[0]}</FieldError>
                  </Field>
                  <Field data-invalid={!!errors.start_time}>
                    <FieldLabel htmlFor="start_time">Horario</FieldLabel>
                    <Input id="start_time" name="start_time" type="time" step={300} defaultValue={v("start_time")} aria-invalid={!!errors.start_time} />
                    <FieldError>{errors.start_time?.[0]}</FieldError>
                  </Field>
                </div>
                <FieldDescription>
                  {hadFixedSchedule
                    ? "Si cambiás el día u horario, se reemplazan las sesiones futuras del horario anterior. Las que tienen notas se conservan."
                    : "Las sesiones se agendan automáticamente todas las semanas, a partir de la próxima fecha."}
                </FieldDescription>
              </>
            )}

            {hadFixedSchedule && scheduleType === "irregular" && (
              <FieldDescription>
                Al pasar a irregular se quitan las sesiones futuras del horario fijo. Las que tienen notas se conservan.
              </FieldDescription>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

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
