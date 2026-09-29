"use client";

import { useActionState } from "react";
import { updateProfile } from "../actions";
import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormMessage } from "@/components/form-message";
import { SESSION_LENGTHS } from "@/lib/schedule";
import { CALENDAR_VIEWS } from "@/lib/calendar-views";

type ProfileFormProps = {
  email: string;
  profile: {
    first_name: string;
    last_name: string;
    license_number: string | null;
    default_session_minutes: number;
    default_session_fee: number | null;
    calendar_view: string;
  };
};

export function ProfileForm({ email, profile }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, {} as FormState);
  const errors = state.fieldErrors ?? {};
  const value = (field: keyof ProfileFormProps["profile"]) => {
    if (state.values?.[field] !== undefined) return state.values[field];
    const saved = String(profile[field] ?? "");
    // El monto se muestra con coma decimal, como se escribe.
    return field === "default_session_fee" ? saved.replace(".", ",") : saved;
  };

  return (
    <Card className="max-w-xl">
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <FormMessage error={state.error} success={state.success} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.first_name}>
                <FieldLabel htmlFor="first_name">Nombre</FieldLabel>
                <Input id="first_name" name="first_name" defaultValue={value("first_name")} aria-invalid={!!errors.first_name} required />
                <FieldError>{errors.first_name?.[0]}</FieldError>
              </Field>
              <Field data-invalid={!!errors.last_name}>
                <FieldLabel htmlFor="last_name">Apellido</FieldLabel>
                <Input id="last_name" name="last_name" defaultValue={value("last_name")} aria-invalid={!!errors.last_name} required />
                <FieldError>{errors.last_name?.[0]}</FieldError>
              </Field>
            </div>
            <Field data-invalid={!!errors.license_number}>
              <FieldLabel htmlFor="license_number">Matrícula</FieldLabel>
              <Input id="license_number" name="license_number" defaultValue={value("license_number")} aria-invalid={!!errors.license_number} />
              <FieldDescription>Opcional.</FieldDescription>
              <FieldError>{errors.license_number?.[0]}</FieldError>
            </Field>
            {/* Valores por defecto de las sesiones */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.default_session_minutes}>
                <FieldLabel htmlFor="default_session_minutes">Duración de las sesiones</FieldLabel>
                <Select
                  name="default_session_minutes"
                  defaultValue={value("default_session_minutes")}
                  items={SESSION_LENGTHS.map((l) => ({ value: String(l.minutes), label: l.label }))}
                >
                  <SelectTrigger id="default_session_minutes" aria-invalid={!!errors.default_session_minutes} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_LENGTHS.map((l) => (
                      <SelectItem key={l.minutes} value={String(l.minutes)}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Al agendar una sesión sin hora de fin, se usa esta duración.</FieldDescription>
                <FieldError>{errors.default_session_minutes?.[0]}</FieldError>
              </Field>
              <Field data-invalid={!!errors.default_session_fee}>
                <FieldLabel htmlFor="default_session_fee">Valor por sesión ($)</FieldLabel>
                <Input
                  id="default_session_fee"
                  name="default_session_fee"
                  inputMode="decimal"
                  placeholder="25.000"
                  defaultValue={value("default_session_fee")}
                  aria-invalid={!!errors.default_session_fee}
                />
                <FieldDescription>Opcional. Lo usan los pacientes que no tienen un valor propio.</FieldDescription>
                <FieldError>{errors.default_session_fee?.[0]}</FieldError>
              </Field>
            </div>
            <Field data-invalid={!!errors.calendar_view}>
              <FieldLabel htmlFor="calendar_view">Vista inicial del calendario</FieldLabel>
              <Select name="calendar_view" defaultValue={value("calendar_view")} items={CALENDAR_VIEWS}>
                <SelectTrigger id="calendar_view" aria-invalid={!!errors.calendar_view} className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALENDAR_VIEWS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Cómo se muestra el calendario cada vez que entrás a la app.</FieldDescription>
              <FieldError>{errors.calendar_view?.[0]}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" value={email} disabled readOnly />
              <FieldDescription>El email de la cuenta no se puede cambiar desde acá.</FieldDescription>
            </Field>
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
