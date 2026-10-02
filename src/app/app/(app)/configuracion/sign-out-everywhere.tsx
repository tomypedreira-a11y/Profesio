"use client";

// Cerrar sesión en todos los dispositivos (ej. se perdió el celular o se usó una compu compartida).
import { useState, useTransition } from "react";
import { LogOutIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { signOutAllDevices } from "@/lib/sign-out";

export function SignOutEverywhere() {
  // Controlado: en Base UI, AlertDialogAction no cierra el diálogo solo.
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    // En un div: Field estira a sus hijos directos (*:w-full) y el botón quedaría a todo el ancho.
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button variant="outline" />}>
          <LogOutIcon />
          Cerrar sesión en todos los dispositivos
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión en todos los dispositivos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cierra la sesión en esta y en todas las computadoras y celulares donde ingresaste, y dejan de llegarles
              las notificaciones. Para volver a usar Profesio vas a tener que ingresar de nuevo en cada uno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => signOutAllDevices())}
            >
              {pending ? "Cerrando…" : "Cerrar sesión en todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
