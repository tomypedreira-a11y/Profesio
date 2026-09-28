// Refresca la sesión de Supabase en cada request y protege las rutas privadas.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que se pueden ver sin estar logueado.
const PUBLIC_PATHS = ["/login", "/registro", "/auth"];

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
  const isLoggedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // Sin sesión y en una ruta privada → al login.
  if (!isLoggedIn && !isPublic) {
    return redirectKeepingCookies(request, response, "/login");
  }

  // Con sesión y en login/registro → al calendario.
  if (isLoggedIn && (pathname === "/login" || pathname === "/registro")) {
    return redirectKeepingCookies(request, response, "/");
  }

  return response;
}

// Redirige sin perder las cookies de sesión que Supabase pudo haber refrescado.
function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const url = request.nextUrl.clone();
  url.pathname = to;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
