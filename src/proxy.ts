// Next.js ejecuta este archivo antes de cada request (antes se llamaba middleware).
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos, imágenes (incluidos los íconos de public/icons) y los archivos de la PWA:
    // el manifest, el service worker y la pantalla sin conexión se piden sin sesión (si pasaran por acá, el
    // service worker guardaría el login en lugar de offline.html).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js$|offline\\.html$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
