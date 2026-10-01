// Cron de notificaciones (vercel.json: cada minuto). Envía los recordatorios de sesión y los resúmenes del día.
//
// - Lo llama Vercel con `Authorization: Bearer ${CRON_SECRET}`; sin eso, 401. No pasa por el proxy (no hay sesión).
// - due_notifications dice qué corresponde enviar. Cada envío se registra en notification_log ANTES de enviarlo:
//   si dos corridas se superponen (Vercel puede repetir una), la segunda choca con el registro y no lo repite.
// - Las suscripciones que el servicio de push da por vencidas (404/410) se borran.
// - Un error con un psicólogo no corta el resto. En los logs, solo cantidades: nunca datos de pacientes.
import { createAdminClient } from "@/lib/supabase/admin";
import { dailySummaryPayload, pushConfigured, reminderPayload, sendPush, type PushPayload } from "@/lib/push";

type Due = {
  kind: string;
  psychologist_id: string;
  session_id: string | null;
  for_date: string | null;
  start_time: string;
  modality: string | null;
  patient_label: string | null;
  minutes_before: number | null;
  session_count: number | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!pushConfigured()) {
    console.error("[cron/notifications] Faltan las claves VAPID.");
    return Response.json({ error: "push no configurado" }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("due_notifications", { p_now: new Date().toISOString() });
  if (error) {
    console.error("[cron/notifications] due_notifications falló:", error.code);
    return Response.json({ error: "due_notifications" }, { status: 500 });
  }

  const due = (data ?? []) as Due[];
  const stats = { due: due.length, sent: 0, skipped: 0, expired: 0, failed: 0, errors: 0 };
  if (due.length === 0) return Response.json(stats);

  const psychologists = [...new Set(due.map((n) => n.psychologist_id))];
  const { data: subscriptions, error: subsError } = await admin
    .from("push_subscriptions")
    .select("id, psychologist_id, endpoint, p256dh, auth")
    .in("psychologist_id", psychologists);
  if (subsError) {
    console.error("[cron/notifications] No se pudieron leer las suscripciones:", subsError.code);
    return Response.json({ error: "push_subscriptions" }, { status: 500 });
  }

  const used = new Set<string>();
  const expired = new Set<string>();

  await Promise.all(
    psychologists.map(async (psychologistId) => {
      try {
        const targets = (subscriptions ?? []).filter((s) => s.psychologist_id === psychologistId);
        for (const n of due.filter((d) => d.psychologist_id === psychologistId)) {
          // Registrar antes de enviar: si ya estaba (otra corrida lo tomó), no se envía de nuevo.
          const { error: logError } = await admin.from("notification_log").insert({
            psychologist_id: psychologistId,
            kind: n.kind,
            session_id: n.session_id,
            for_date: n.for_date,
          });
          if (logError) {
            if (logError.code === "23505") stats.skipped++;
            else throw logError;
            continue;
          }

          const { payload, ttl } = toPayload(n);
          const results = await Promise.all(targets.map((t) => sendPush(t, payload, ttl)));
          results.forEach((result, i) => {
            stats[result]++;
            if (result === "sent") used.add(targets[i].id);
            if (result === "expired") expired.add(targets[i].id);
          });
        }
      } catch {
        stats.errors++; // sigue con los demás psicólogos
      }
    }),
  );

  if (expired.size > 0) await admin.from("push_subscriptions").delete().in("id", [...expired]);
  const stillUsed = [...used].filter((id) => !expired.has(id));
  if (stillUsed.length > 0) {
    await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).in("id", stillUsed);
  }

  console.log("[cron/notifications]", JSON.stringify(stats));
  return Response.json(stats);
}

// Texto de cada notificación y cuánto puede esperar si el dispositivo está apagado: un recordatorio vale
// hasta que empieza la sesión; el resumen, unas horas.
function toPayload(n: Due): { payload: PushPayload; ttl: number } {
  if (n.kind === "session_reminder") {
    return {
      payload: reminderPayload({
        sessionId: n.session_id!,
        minutesBefore: n.minutes_before ?? 0,
        startTime: n.start_time,
        modality: n.modality ?? "",
        patientLabel: n.patient_label,
      }),
      ttl: (n.minutes_before ?? 0) * 60,
    };
  }
  return {
    payload: dailySummaryPayload({ forDate: n.for_date!, sessionCount: n.session_count ?? 0, firstTime: n.start_time }),
    ttl: 4 * 60 * 60,
  };
}
