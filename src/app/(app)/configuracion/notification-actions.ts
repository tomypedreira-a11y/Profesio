"use server";

// Suscripciones de este dispositivo a las notificaciones y la notificación de prueba.
// Con la sesión del usuario (RLS): solo ve y toca sus propias suscripciones. No usa la secret key.
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { pushConfigured, sendPush, testPayload } from "@/lib/push";

// Lo que da PushSubscription.toJSON() en el navegador.
const subscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export type SubscriptionResult = { error?: string; conflict?: boolean };

// Guarda la suscripción de este dispositivo (si ya estaba, no hace nada).
// conflict: el navegador sigue suscripto a nombre de otra cuenta; hay que suscribirse de nuevo (otro endpoint).
export async function saveSubscription(input: unknown): Promise<SubscriptionResult> {
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "El navegador devolvió una suscripción inválida." };
  const { endpoint, keys } = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("push_subscriptions").select("id").eq("endpoint", endpoint).maybeSingle();
  if (existing) return {};

  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent });
  if (error?.code === "23505") return { conflict: true };
  if (error) return { error: "No se pudieron activar las notificaciones. Volvé a intentar." };
  return {};
}

export async function deleteSubscription(endpoint: string): Promise<SubscriptionResult> {
  if (!z.url().safeParse(endpoint).success) return { error: "Datos inválidos." };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { error: "No se pudieron desactivar las notificaciones. Volvé a intentar." };
  return {};
}

// Envía una notificación de prueba a este dispositivo (solo si es del usuario logueado).
export async function sendTestNotification(endpoint: string): Promise<SubscriptionResult> {
  if (!z.url().safeParse(endpoint).success) return { error: "Datos inválidos." };
  if (!pushConfigured()) return { error: "Las notificaciones no están configuradas en el servidor." };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (!target) return { error: "Este dispositivo no tiene las notificaciones activadas." };

  const result = await sendPush(target, testPayload, 60);
  if (result === "expired") {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    return { error: "La suscripción de este dispositivo venció. Desactivá y volvé a activar las notificaciones." };
  }
  if (result === "failed") return { error: "No se pudo enviar la notificación de prueba. Volvé a intentar." };
  return {};
}
