"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";

const initialState: FormState = {};

export function LoginForm({ linkError }: { linkError?: boolean }) {
  const [state, action, pending] = useActionState(login, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresar</CardTitle>
        <CardDescription>Entrá con tu email y contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <FormMessage
              error={
                state.error ??
                (linkError ? "El link de confirmación no es válido o ya venció. Si abriste el mail en otro navegador o dispositivo, probá abrirlo donde te registraste, o ingresá directamente: tu cuenta puede estar confirmada." : undefined)
              }
            />
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.values?.email}
                aria-invalid={!!errors.email}
                required
              />
              <FieldError>{errors.email?.[0]}</FieldError>
            </Field>
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                required
              />
              <FieldError>{errors.password?.[0]}</FieldError>
            </Field>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Ingresando…" : "Ingresar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿No tenés cuenta?{" "}
              <Link href="/registro" className="underline underline-offset-4">
                Registrate
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
