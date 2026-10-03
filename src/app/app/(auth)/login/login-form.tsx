"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { type FormState, formKey } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { FormMessage } from "@/components/form-message";
import { Turnstile, useCaptcha } from "@/components/turnstile";

const initialState: FormState = {};

export function LoginForm({ linkError, idleLogout }: { linkError?: boolean; idleLogout?: boolean }) {
  const [state, action, pending] = useActionState(login, initialState);
  const { captchaReady, onCaptchaToken } = useCaptcha();
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresar</CardTitle>
        <CardDescription>Entrá con tu email y contraseña.</CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey(state)} action={action}>
          <FieldGroup>
            {/* No es un error: se muestra como aviso. */}
            {!state.error && idleLogout && (
              <FormMessage success="Cerramos tu sesión por inactividad. Ingresá de nuevo." />
            )}
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
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Link href="/app/recuperar" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                required
              />
              <FieldError>{errors.password?.[0]}</FieldError>
            </Field>
            <Turnstile onToken={onCaptchaToken} resetKey={state} />
            <Button type="submit" disabled={pending || !captchaReady} className="w-full">
              {pending ? "Ingresando…" : "Ingresar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿No tenés cuenta?{" "}
              <Link href="/app/registro" className="underline underline-offset-4">
                Registrate
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
