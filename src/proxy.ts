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
    // service worker guardaría el login en lugar de offline.html). Tampoco los cron (/api/cron/): no tienen sesión,
    // los protege CRON_SECRET, y Vercel no sigue la redirección al login. Tampoco robots.txt, sitemap.xml ni la
    // imagen para compartir (opengraph-image): son públicos y los piden los buscadores y las redes sociales.
    // Ni /_vercel/ (el script y los envíos de Speed Insights, que van sin sesión).
    "/((?!_next/static|_next/image|_vercel/|favicon.ico|manifest.webmanifest|sw\\.js$|offline\\.html$|robots\\.txt$|sitemap\\.xml$|opengraph-image|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
