"use client";

import Link from "next/link";
import { useActionState, useSyncExternalStore } from "react";
import { signup } from "../actions";
import { type FormState, formKey } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";

const initialState: FormState = {};

// Zona horaria del navegador, para el perfil (después se cambia en Configuración).
// En el servidor no se conoce: queda vacía hasta que el formulario se hidrata.
const noSubscribe = () => () => {};
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, initialState);
  const errors = state.fieldErrors ?? {};
  const timeZone = useSyncExternalStore(noSubscribe, browserTimeZone, () => "");

  // Registro exitoso: en lugar del formulario, mostramos el aviso del mail.
  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revisá tu email</CardTitle>
          <CardDescription>{state.success}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Si no lo ves en unos minutos, fijate en la carpeta de spam.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Registrate para empezar a organizar tu agenda.</CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey(state)} action={action}>
          <input type="hidden" name="timezone" value={timeZone} />
          <FieldGroup>
            <FormMessage error={state.error} />
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.first_name}>
                <FieldLabel htmlFor="first_name">Nombre</FieldLabel>
                <Input
                  id="first_name"
                  name="first_name"
                  autoComplete="given-name"
                  defaultValue={state.values?.first_name}
                  aria-invalid={!!errors.first_name}
                  required
                />
                <FieldError>{errors.first_name?.[0]}</FieldError>
              </Field>
              <Field data-invalid={!!errors.last_name}>
                <FieldLabel htmlFor="last_name">Apellido</FieldLabel>
                <Input
                  id="last_name"
                  name="last_name"
                  autoComplete="family-name"
                  defaultValue={state.values?.last_name}
                  aria-invalid={!!errors.last_name}
                  required
                />
                <FieldError>{errors.last_name?.[0]}</FieldError>
              </Field>
            </div>
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
                autoComplete="new-password"
                minLength={8}
                aria-invalid={!!errors.password}
                required
              />
              <FieldDescription>Al menos 8 caracteres.</FieldDescription>
              <FieldError>{errors.password?.[0]}</FieldError>
            </Field>
            <Field orientation="horizontal" data-invalid={!!errors.terms}>
              <Checkbox
                id="terms"
                name="terms"
                value="accepted"
                defaultChecked={state.values?.terms === "accepted"}
                aria-invalid={!!errors.terms}
                required
              />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="terms" className="font-normal">
                  <span>
                    Acepto los{" "}
                    <Link href="/terminos" target="_blank" className="underline underline-offset-4">
                      Términos
                    </Link>{" "}
                    y la{" "}
                    <Link href="/privacidad" target="_blank" className="underline underline-offset-4">
                      Política de privacidad
                    </Link>
                  </span>
                </FieldLabel>
                <FieldError>{errors.terms?.[0]}</FieldError>
              </div>
            </Field>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Ingresá
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
