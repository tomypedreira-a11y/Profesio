// Destino del link del mail de confirmación de registro.
// Valida el link, inicia la sesión y manda al usuario a la app.
//
// Acepta los dos formatos de link de Supabase:
// - `code`: el de la plantilla original de Supabase. Funciona si el mail se abre
//   en el mismo navegador donde se hizo el registro.
// - `token_hash`: el de una plantilla personalizada (cuando tengamos SMTP propio).
//   Funciona desde cualquier dispositivo.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

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
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  url.pathname = "/login";
  url.searchParams.set("error", "link-invalido");
  return NextResponse.redirect(url);
}
