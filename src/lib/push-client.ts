// Suscripción de este navegador a las notificaciones (Web Push). Solo en el navegador.
// El service worker (public/sw.js) recibe y muestra las notificaciones; se registra solo en producción.
import { deleteSubscription } from "@/app/(app)/configuracion/notification-actions";

// La clave pública VAPID viene en base64url; pushManager.subscribe la quiere en bytes.
export function vapidKeyBytes(base64url: string) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// El service worker activo, o null si no hay (ej. en `npm run dev`) o tarda demasiado en estar listo.
export async function readyRegistration(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

// Al cerrar sesión: este dispositivo deja de recibir las notificaciones de la cuenta (en una compu compartida,
// el siguiente que entre no tiene que ver los recordatorios del anterior). Nunca impide cerrar la sesión.
export async function forgetThisDevice() {
  try {
    if (!pushSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await deleteSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // sigue el cierre de sesión igual
  }
}
