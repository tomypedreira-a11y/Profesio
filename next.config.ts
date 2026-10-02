import type { NextConfig } from "next";

// Rutas de la app de antes de moverla a /app (para que la PWA tuviera su propio scope y "/" abriera el navegador).
// Redirigen para siempre (308) con sus subrutas y el query string: apps ya instaladas (su start_url era
// /calendario), marcadores y links de mails viejos. Se aplican antes del proxy.
const LEGACY_APP_PATHS = [
  "calendario",
  "pacientes",
  "sesiones",
  "ingresos",
  "perfil",
  "configuracion",
  "login",
  "registro",
  "recuperar",
  "nueva-contrasena",
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      ...LEGACY_APP_PATHS.map((path) => ({
        source: `/${path}/:rest*`,
        destination: `/app/${path}/:rest*`,
        permanent: true,
      })),
      // /app sola no es una pantalla: al calendario (APP_HOME). Temporal, por si algún día tiene una propia.
      { source: "/app", destination: "/app/calendario", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // Service worker de la PWA: que el navegador siempre busque la versión nueva (sin caché) y que solo
        // pueda cargar scripts del propio sitio.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
