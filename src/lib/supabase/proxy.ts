// Refresca la sesión de Supabase en cada request y protege las rutas privadas:
// sin sesión → al login; sesión inactiva demasiado tiempo → se cierra; verificación en dos pasos pendiente → al código.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  IDLE_COOKIE_OPTIONS,
  IDLE_LOGOUT_REASON,
  IDLE_TIMEOUT_COOKIE,
  LAST_ACTIVITY_COOKIE,
  parseIdleMinutes,
} from "@/lib/idle";
import { APP_HOME } from "@/lib/routes";

// Rutas que se pueden ver sin estar logueado (y sus subrutas). "/" (la página promocional) va aparte,
// como ruta exacta: si estuviera acá, todas las rutas empezarían con ella y serían públicas.
const PUBLIC_PATHS = ["/login", "/registro", "/recuperar", "/auth", "/ayuda", "/terminos", "/privacidad"];

// Pide el código de la verificación en dos pasos: requiere sesión (aunque esté bajo /login).
const MFA_PATH = "/login/verificar";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Importante: no poner código entre createServerClient y getClaims().
  // getClaims() valida el token y lo refresca si hace falta.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const isLoggedIn = Boolean(claims);

  const { pathname } = request.nextUrl;
  const isMfaPage = pathname === MFA_PATH;
  const isPublic =
    pathname === "/" ||
    (!isMfaPage && PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)));

  // Sin sesión y en una ruta privada → al login.
  if (!isLoggedIn && !isPublic) {
    return redirectKeepingCookies(request, response, "/login");
  }

  // Con sesión y en login/registro → al calendario. La página promocional y las legales se ven igual con sesión.
  if (isLoggedIn && (pathname === "/login" || pathname === "/registro")) {
    return redirectKeepingCookies(request, response, APP_HOME);
  }

  if (!isLoggedIn || isPublic) return response;

  // Inactividad: lo controla el servidor (y no solo el navegador) para que una pestaña dormida, un celular
  // bloqueado o una compu que quedó prendida no puedan seguir usando la sesión, aunque no corra el JavaScript.
  // Se revisa antes de renderizar nada, también en las Server Actions.
  const lastActivity = Number(request.cookies.get(LAST_ACTIVITY_COOKIE)?.value);
  const idleMinutes = parseIdleMinutes(request.cookies.get(IDLE_TIMEOUT_COOKIE)?.value);
  if (lastActivity > 0 && Date.now() - lastActivity > idleMinutes * 60_000) {
    // Solo esta sesión (el default de signOut es global). Borra las cookies de la sesión vía setAll.
    await supabase.auth.signOut({ scope: "local" });
    response.cookies.delete(LAST_ACTIVITY_COOKIE);
    response.cookies.delete(IDLE_TIMEOUT_COOKIE);
    return redirectKeepingCookies(request, response, `/login?motivo=${IDLE_LOGOUT_REASON}`);
  }

  // Verificación en dos pasos: con factores verificados y la sesión todavía en aal1 (solo pasó la contraseña),
  // todo lleva a pedir el código. La base igual no le devuelve datos (políticas restrictivas).
  if (claims?.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const mfaPending = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    if (mfaPending && !isMfaPage) {
      // Después del código vuelve a donde iba (ej. /nueva-contrasena desde el link de recuperación).
      const next = isServerAction(request) ? "" : `?next=${encodeURIComponent(pathname)}`;
      return redirectKeepingCookies(request, response, `${MFA_PATH}${next}`);
    }
    if (!mfaPending && isMfaPage) {
      return redirectKeepingCookies(request, response, APP_HOME);
    }
  } else if (isMfaPage) {
    return redirectKeepingCookies(request, response, APP_HOME);
  }

  // Cualquier request con sesión cuenta como actividad. Al final: setAll puede reemplazar `response`.
  response.cookies.set(LAST_ACTIVITY_COOKIE, String(Date.now()), IDLE_COOKIE_OPTIONS);
  return response;
}

// Las Server Actions se piden con fetch y llevan este header.
function isServerAction(request: NextRequest) {
  return request.method === "POST" && request.headers.has("next-action");
}

// Redirige sin perder las cookies de sesión que Supabase pudo haber refrescado (o borrado, al cerrar la sesión).
function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const url = new URL(to, request.url);

  // Una Server Action no puede seguir un redirect HTTP (fetch repetiría el POST en el destino).
  // Se responde como lo hace Next cuando una acción llama a redirect(): con el header x-action-redirect
  // y sin datos, el navegador hace una navegación completa al destino.
  const redirect = isServerAction(request)
    ? new NextResponse(null, {
        status: 200,
        headers: { "x-action-redirect": `${url.pathname}${url.search};replace`, "content-type": "text/plain" },
      })
    : NextResponse.redirect(url);

  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
