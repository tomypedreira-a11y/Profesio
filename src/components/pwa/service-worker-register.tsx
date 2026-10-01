"use client";

// Registra el service worker (public/sw.js) y empieza a escuchar el aviso de "se puede instalar".
// Va en el layout raíz. Solo en producción: en `npm run dev` un service worker se mete en la recarga en caliente.
// Una versión nueva del service worker se activa sola (sw.js llama a skipWaiting al instalarse): no hay cartel.
import { useEffect } from "react";
import { listenForInstallPrompt } from "@/hooks/use-install-prompt";

export function ServiceWorkerRegister() {
  useEffect(() => {
    listenForInstallPrompt();
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    // updateViaCache "none": al buscar versiones nuevas, sw.js se pide siempre a la red.
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sin service worker la app funciona igual (solo no se puede instalar ni hay pantalla sin conexión).
    });
  }, []);

  return null;
}
