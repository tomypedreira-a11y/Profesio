"use client";

// Aplica el tamaño de letra guardado en el perfil al abrir la app (así se respeta en cualquier dispositivo).
// Solo actúa cuando cambia el valor guardado, para no pisar un cambio que el usuario acaba de hacer.
import { useEffect, useRef } from "react";
import { applyFontSize, isFontSize } from "@/lib/font-size";

export function FontSizeSync({ size }: { size: string }) {
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (applied.current === size || !isFontSize(size)) return;
    applied.current = size;
    applyFontSize(size);
  }, [size]);

  return null;
}
