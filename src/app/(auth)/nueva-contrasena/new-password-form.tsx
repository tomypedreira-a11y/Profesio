"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setNewPassword } from "../actions";
import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { FormMessage } from "@/components/form-message";
import { NewPasswordFields } from "@/components/new-password-fields";

const initialState: FormState = {};

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    toast.success(state.success);
    router.replace("/");
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contraseña nueva</CardTitle>
        <CardDescription>Elegí la contraseña con la que vas a ingresar a partir de ahora.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          <FieldGroup>
            <FormMessage error={state.error} />
            <NewPasswordFields errors={state.fieldErrors ?? {}} />
            <Button type="submit" disabled={pending || !!state.success} className="w-full">
              {pending ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
