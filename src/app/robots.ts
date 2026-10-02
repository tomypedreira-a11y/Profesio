import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

// Los buscadores indexan solo las páginas públicas ("/", /ayuda, /terminos, /privacidad); la app y el ingreso, no.
// Toda la app (pantallas e ingreso) vive bajo /app/; /auth y /api son los links de los mails y el cron.
// No se bloquea todo con "/": así siguen accesibles los estilos, scripts e imágenes que los buscadores necesitan
// para ver las páginas públicas. Las rutas viejas de la app (/calendario, /login…) redirigen a /app/.
const APP_PATHS = ["/app/", "/auth/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/ayuda", "/terminos", "/privacidad"],
      disallow: APP_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
