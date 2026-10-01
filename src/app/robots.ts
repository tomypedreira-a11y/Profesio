import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/legal";

// Los buscadores indexan solo las páginas públicas ("/", /ayuda, /terminos, /privacidad); la app y el ingreso, no.
// Se bloquean las rutas de la app una por una (y no todo con "/"): así siguen accesibles los estilos, scripts e
// imágenes que los buscadores necesitan para ver las páginas públicas. Si se agrega una sección a la app, sumarla.
const APP_PATHS = [
  "/calendario",
  "/pacientes",
  "/sesiones",
  "/ingresos",
  "/perfil",
  "/configuracion",
  "/login",
  "/registro",
  "/recuperar",
  "/nueva-contrasena",
  "/auth",
  "/api",
];

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
