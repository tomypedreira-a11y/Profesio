"use client";

// Opción de Configuración de sí/no: se guarda en cuanto se cambia (como PreferenceSelect).
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { SaveResult } from "./actions";

type PreferenceSwitchProps = {
  id: string;
  checked: boolean;
  save: (checked: boolean) => Promise<SaveResult>;
  onChange?: (checked: boolean) => void; // para mostrar u ocultar opciones que dependen de esta
};

export function PreferenceSwitch({ id, checked: saved, save, onChange }: PreferenceSwitchProps) {
  const [checked, setChecked] = useState(saved);
  const [pending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setChecked(next);
    onChange?.(next);
    startTransition(async () => {
      const result = await save(next);
      if (result.error) {
        setChecked(!next); // vuelve a mostrar lo que quedó guardado
        onChange?.(!next);
        toast.error(result.error);
      } else {
        toast.success("Guardado.");
      }
    });
  }

  return <Switch id={id} checked={checked} onCheckedChange={toggle} disabled={pending} />;
}
