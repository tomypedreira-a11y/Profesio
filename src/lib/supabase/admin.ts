// Cliente de Supabase con la secret key (rol service_role): saltea RLS y ve los datos de TODOS los psicólogos.
//
// Existe solo para el cron de notificaciones (/api/cron/*), que corre sin la sesión de nadie: necesita saber a
// quién avisar y registrar los envíos. REGLA: solo se importa desde src/app/api/cron/ (ESLint lo impide en el
// resto). Nunca en componentes, Server Actions de usuario ni con NEXT_PUBLIC (la clave no puede llegar al
// navegador). Lo que haga con la base, que sea a través de funciones acotadas (due_notifications) y tablas
// sin datos clínicos (push_subscriptions, notification_log).
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");

  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
