"use client";

// Selector de una opción de Configuración: guarda en cuanto se elige.
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SaveResult } from "./actions";

type PreferenceSelectProps = {
  id: string;
  value: string;
  items: readonly { value: string; label: string }[];
  save: (value: string) => Promise<SaveResult>;
  disabled?: boolean;
};

export function PreferenceSelect({ id, value: saved, items, save, disabled }: PreferenceSelectProps) {
  const [value, setValue] = useState(saved);
  const [pending, startTransition] = useTransition();

  function choose(next: string | null) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await save(next);
      if (result.error) {
        setValue(previous); // vuelve a mostrar lo que quedó guardado
        toast.error(result.error);
      } else {
        toast.success("Guardado.");
      }
    });
  }

  return (
    <Select value={value} onValueChange={choose} items={items} disabled={pending || disabled}>
      <SelectTrigger id={id} className="w-full sm:w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
