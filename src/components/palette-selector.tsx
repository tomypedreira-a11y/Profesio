"use client";

// Selector de paleta de colores (Configuración → Personalización).
// Cambia los colores al instante y guarda la elección en el perfil.
import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { updatePalette } from "@/app/(app)/actions";
import { DEFAULT_PALETTE, isPalette, PALETTES, type Palette } from "@/lib/palettes";
import { cn } from "@/lib/utils";
import { applyPalette } from "./theme-provider";

export function PaletteSelector({ value }: { value: string }) {
  const [selected, setSelected] = useState<Palette>(isPalette(value) ? value : DEFAULT_PALETTE);
  const [, startTransition] = useTransition();

  function choose(palette: Palette) {
    setSelected(palette);
    applyPalette(palette); // cambia al instante
    startTransition(() => updatePalette(palette)); // y lo guarda en el perfil
  }

  return (
    <div role="radiogroup" aria-label="Paleta de colores" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PALETTES.map((p) => {
        const active = p.value === selected;
        return (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(p.value)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-muted/50",
              active && "border-primary ring-2 ring-primary/30",
            )}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{ background: p.swatch }}
            >
              {active && <CheckIcon className="size-4 text-white mix-blend-difference" />}
            </span>
            <span className="font-medium">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
