// Cookies del cierre por inactividad, desde Server Actions y Route Handlers (ver lib/idle.ts).
import "server-only";
import { cookies } from "next/headers";
import type { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_IDLE_MINUTES,
  IDLE_COOKIE_OPTIONS,
  IDLE_TIMEOUT_COOKIE,
  LAST_ACTIVITY_COOKIE,
} from "@/lib/idle";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function writeIdleCookies(minutes: number) {
  const store = await cookies();
  store.set(LAST_ACTIVITY_COOKIE, String(Date.now()), IDLE_COOKIE_OPTIONS);
  store.set(IDLE_TIMEOUT_COOKIE, String(minutes), IDLE_COOKIE_OPTIONS);
}

// Al iniciar sesión (contraseña, link del mail o código de verificación): arranca a contar desde ahora,
// con el límite elegido en el perfil. Con la verificación en dos pasos pendiente (aal1) el perfil no se
// puede leer: queda el valor por defecto hasta que se ingrese el código, que vuelve a llamar a esta función.
export async function startIdleTracking(supabase: ServerClient) {
  const { data } = await supabase.from("profiles").select("idle_timeout_minutes").maybeSingle();
  await writeIdleCookies(data?.idle_timeout_minutes ?? DEFAULT_IDLE_MINUTES);
}

export async function clearIdleCookies() {
  const store = await cookies();
  store.delete(LAST_ACTIVITY_COOKIE);
  store.delete(IDLE_TIMEOUT_COOKIE);
}
