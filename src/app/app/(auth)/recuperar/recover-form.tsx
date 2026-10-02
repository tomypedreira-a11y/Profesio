"use client";

// Pide el email y manda el link para crear una contraseña nueva.
import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { type FormState, formKey } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";
import { Turnstile, useCaptcha } from "@/components/turnstile";

const initialState: FormState = {};

export function RecoverForm({ linkError }: { linkError?: boolean }) {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  const { captchaReady, onCaptchaToken } = useCaptcha();
  const errors = state.fieldErrors ?? {};

  // Enviado: el mismo aviso exista o no la cuenta.
  if (state.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revisá tu email</CardTitle>
          <CardDescription>{state.success}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Abrí el link en este mismo navegador. Si no lo ves en unos minutos, fijate en la carpeta de spam.
          </p>
          <Button variant="outline" render={<Link href="/app/login" />} nativeButton={false}>
            Volver a ingresar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contraseña</CardTitle>
        <CardDescription>Ingresá tu email y te mandamos un link para crear una contraseña nueva.</CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey(state)} action={action}>
          <FieldGroup>
            <FormMessage
              error={
                state.error ??
                (linkError ? "El link no es válido o ya venció. Pedí uno nuevo." : undefined)
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
            <Turnstile onToken={onCaptchaToken} resetKey={state} />
            <Button type="submit" disabled={pending || !captchaReady} className="w-full">
              {pending ? "Enviando…" : "Enviar link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/app/login" className="underline underline-offset-4">
                Volver a ingresar
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
