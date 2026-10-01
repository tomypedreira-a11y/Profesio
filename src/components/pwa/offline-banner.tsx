"use client";

// Aviso discreto cuando se corta internet, arriba del contenido (queda fijo al hacer scroll).
// Con navigator.onLine y los eventos online/offline, y no con useOffline de Next: ese flag experimental además
// reintenta solo las Server Actions al volver la conexión, y con una conexión inestable podría repetir una
// escritura que sí llegó (un paciente, un cobro). Mejor que una acción sin conexión falle a la vista.
import { useSyncExternalStore } from "react";
import { WifiOffIcon } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OfflineBanner() {
  // En el servidor (y hasta hidratar) se asume que hay conexión.
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-(--session-cancelled-border) bg-(--session-cancelled) px-4 py-1.5 text-center text-sm text-(--session-cancelled-foreground) pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
    >
      <WifiOffIcon className="size-4 shrink-0" />
      Sin conexión. Los cambios no se van a guardar hasta que vuelva internet.
    </div>
  );
}
