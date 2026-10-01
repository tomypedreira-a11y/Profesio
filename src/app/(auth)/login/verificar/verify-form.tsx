"use client";

import { useActionState, useTransition } from "react";
import { verifyLoginCode } from "../../actions";
import type { FormState } from "@/lib/form-state";
import { signOutThisDevice } from "@/lib/sign-out";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";

const initialState: FormState = {};

export function VerifyForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(verifyLoginCode, initialState);
  const [leaving, startLeaving] = useTransition();
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificación en dos pasos</CardTitle>
        <CardDescription>Ingresá el código de 6 números que muestra tu app de códigos (Google Authenticator, Authy…).</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <FormMessage error={state.error} />
            <input type="hidden" name="next" value={next} />
            <Field data-invalid={!!errors.code}>
              <FieldLabel htmlFor="code">Código</FieldLabel>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={7}
                placeholder="123456"
                className="text-center text-lg tracking-[0.3em]"
                aria-invalid={!!errors.code}
                autoFocus
                required
              />
              <FieldError>{errors.code?.[0]}</FieldError>
            </Field>
            <Button type="submit" disabled={pending || leaving} className="w-full">
              {pending ? "Verificando…" : "Verificar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="underline underline-offset-4"
                disabled={pending || leaving}
                onClick={() => startLeaving(() => signOutThisDevice())}
              >
                Usar otra cuenta
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Si perdés acceso a tu app de códigos y no tenés otro dispositivo registrado, escribinos para recuperar tu
              cuenta.
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
