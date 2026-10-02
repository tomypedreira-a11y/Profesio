"use client";

// Cambiar la contraseña: pide la actual (por si quedó la sesión abierta en una compu ajena) y la nueva dos veces.
import { useActionState, useEffect, useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";
import { NewPasswordFields } from "@/components/new-password-fields";
import type { FormState } from "@/lib/form-state";
import { changePassword } from "./account-actions";

export function ChangePassword() {
  const [open, setOpen] = useState(false);

  return (
    // En un div: Field estira a sus hijos directos (*:w-full) y el botón quedaría a todo el ancho.
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" />}>
          <KeyRoundIcon />
          Cambiar contraseña
        </DialogTrigger>
        <DialogContent>
          {/* Se monta al abrir: cada vez arranca vacío. */}
          {open && <ChangePasswordForm onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const initialState: FormState = {};

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(changePassword, initialState);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!state.success) return;
    toast.success(state.success);
    onDone();
  }, [state, onDone]);

  return (
    <form action={action}>
      <DialogHeader>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogDescription>Para confirmar que sos vos, ingresá también tu contraseña actual.</DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <FormMessage error={state.error} />
        <Field data-invalid={!!errors.current}>
          <FieldLabel htmlFor="current">Contraseña actual</FieldLabel>
          <Input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.current}
            required
          />
          <FieldError>{errors.current?.[0]}</FieldError>
        </Field>
        <NewPasswordFields errors={errors} />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </DialogFooter>
    </form>
  );
}
