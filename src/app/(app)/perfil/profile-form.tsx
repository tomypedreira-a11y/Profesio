"use client";

import { useActionState } from "react";
import { updateProfile } from "../actions";
import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";

type ProfileFormProps = {
  profile: { first_name: string; last_name: string; license_number: string | null };
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, {} as FormState);
  const errors = state.fieldErrors ?? {};
  const value = (field: keyof ProfileFormProps["profile"]) =>
    state.values?.[field] ?? profile[field] ?? "";

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
            <Button type="submit" disabled={pending} className="w-fit">
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
