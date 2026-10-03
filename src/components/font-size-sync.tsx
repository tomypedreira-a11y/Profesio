"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { applyFontSize, isFontSize, storedFontSize } from "@/lib/font-size";
import { isAppPath } from "@/lib/routes";

// Aplica el tamaño de letra guardado en el perfil al abrir la app (así se respeta en cualquier dispositivo).
// Solo actúa cuando cambia el valor guardado, para no pisar un cambio que el usuario acaba de hacer.
export function FontSizeSync({ size }: { size: string }) {
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (applied.current === size || !isFontSize(size)) return;
    applied.current = size;
    applyFontSize(size);
  }, [size]);

  return null;
}

// El tamaño de letra es de la app: al navegar al sitio público se quita y al volver se recupera el recordado.
// En el layout raíz (cubre los dos lados). Layout effect: se aplica antes de pintar la página nueva.
export function FontSizeScope() {
  const inApp = isAppPath(usePathname());

  useLayoutEffect(() => {
    const size = inApp ? storedFontSize() : null;
    if (size) document.documentElement.dataset.fontSize = size;
    else delete document.documentElement.dataset.fontSize;
  }, [inApp]);

  return null;
}
