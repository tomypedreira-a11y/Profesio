// Destino de los links de los mails (confirmación de registro y recuperación de contraseña).
// Valida el link, inicia la sesión y manda al usuario a `next` (por defecto, el calendario: APP_HOME).
//
// Acepta los dos formatos de link de Supabase:
// - `code`: el de la plantilla por defecto de Supabase (la de dev). Funciona si el mail se abre
//   en el mismo navegador donde se hizo el registro o se pidió el link.
// - `token_hash` + `type` (email, recovery, email_change): el de las plantillas de prod (ver CLAUDE.md →
//   Infraestructura). Funciona desde cualquier dispositivo. Si cambia esta ruta, revisar esas plantillas.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startIdleTracking } from "@/lib/idle-cookies";
import { safeNextPath } from "@/lib/safe-path";

const RECOVERY_PATH = "/nueva-contrasena";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));
  const isRecovery = type === "recovery" || next === RECOVERY_PATH;

  const url = request.nextUrl.clone();
  url.search = "";

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (ok) {
    await startIdleTracking(supabase);
    // El link de recuperación siempre termina en crear la contraseña nueva.
    const destination = new URL(type === "recovery" ? RECOVERY_PATH : next, request.url);
    return NextResponse.redirect(destination);
  }

  // Link de recuperación vencido: a pedir uno nuevo. Confirmación de registro: al login.
  url.pathname = isRecovery ? "/recuperar" : "/login";
  url.searchParams.set("error", "link-invalido");
  return NextResponse.redirect(url);
}
