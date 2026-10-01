// Envío de notificaciones push (Web Push con claves VAPID). Solo en el servidor.
// Lo usan el cron (/api/cron/notifications) y la notificación de prueba de Configuración.
//
// Las notificaciones se ven en la pantalla bloqueada: llevan hora y modalidad, y el nombre del paciente
// (nombre e inicial) solo si el psicólogo lo eligió. Nunca contenido de anotaciones ni datos clínicos.
import "server-only";
import webpush, { WebPushError } from "web-push";
import { modalityLabel } from "@/lib/modality";

export type PushPayload = {
  title: string;
  body: string;
  url: string; // pantalla que se abre al tocarla
  tag: string; // una notificación con el mismo tag reemplaza a la anterior (no se apilan)
};

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type SendResult = "sent" | "expired" | "failed";

// Las claves VAPID identifican al servidor ante los servicios de push (Google, Apple, Mozilla).
// La privada y el subject nunca llevan NEXT_PUBLIC.
function vapidDetails() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("Faltan NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT.");
  }
  return { publicKey, privateKey, subject };
}

export const pushConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

// "expired": el dispositivo ya no existe o desactivó las notificaciones (404/410): hay que borrar la suscripción.
// ttlSeconds: si el dispositivo está apagado, cuánto puede esperar el servicio de push para entregarla.
export async function sendPush(target: PushTarget, payload: PushPayload, ttlSeconds: number): Promise<SendResult> {
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { vapidDetails: vapidDetails(), TTL: Math.max(0, Math.round(ttlSeconds)), urgency: "high" },
    );
    return "sent";
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) return "expired";
    return "failed";
  }
}

// --- Textos (castellano rioplatense) -------------------------------------------------------------

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function reminderPayload(n: {
  sessionId: string;
  minutesBefore: number;
  startTime: string;
  modality: string;
  patientLabel: string | null;
}): PushPayload {
  const parts = [n.startTime, n.patientLabel, modalityLabel(n.modality)].filter(Boolean);
  return {
    title: `Sesión en ${n.minutesBefore === 60 ? "1 hora" : plural(n.minutesBefore, "minuto", "minutos")}`,
    body: parts.join(" · "),
    url: "/calendario",
    tag: `session-${n.sessionId}`,
  };
}

export function dailySummaryPayload(n: { forDate: string; sessionCount: number; firstTime: string }): PushPayload {
  return {
    title: "Tu agenda de hoy",
    body:
      n.sessionCount === 1
        ? `Tenés 1 sesión. Es a las ${n.firstTime}.`
        : `Tenés ${n.sessionCount} sesiones. La primera es a las ${n.firstTime}.`,
    url: "/calendario",
    tag: `summary-${n.forDate}`,
  };
}

export const testPayload: PushPayload = {
  title: "Notificación de prueba",
  body: "Así vas a ver los recordatorios en este dispositivo.",
  url: "/calendario", // como los recordatorios
  tag: "test",
};
