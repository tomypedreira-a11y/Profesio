"use client";

// Tamaño de letra: normal, grande o muy grande. Cambia al instante y lo guarda en el perfil.
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateFontSize } from "./actions";
import { applyFontSize, FONT_SIZES, type FontSize } from "@/lib/font-size";
import { cn } from "@/lib/utils";

// Muestra de cada tamaño, en proporción al que se aplica (globals.css).
const SAMPLE: Record<FontSize, string> = { normal: "text-base", large: "text-lg", xlarge: "text-xl" };

export function FontSizeSelector({ value }: { value: FontSize }) {
  const [current, setCurrent] = useState(value);
  const [, startTransition] = useTransition();

  function choose(size: FontSize) {
    setCurrent(size);
    applyFontSize(size); // cambia al instante
    // y lo guarda en el perfil
    startTransition(async () => {
      const result = await updateFontSize(size);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div role="radiogroup" aria-label="Tamaño de letra" className="grid grid-cols-3 gap-3 sm:max-w-md">
      {FONT_SIZES.map((f) => {
        const active = f.value === current;
        return (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(f.value)}
            className={cn(
              "flex flex-col items-center justify-end gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50",
              active && "border-primary ring-2 ring-primary/30",
            )}
          >
            <span className={cn("leading-none font-medium", SAMPLE[f.value])} aria-hidden="true">
              Aa
            </span>
            <span className="font-medium">{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
