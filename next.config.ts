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

// ---------------------------------------------------------------------------
// Encabezados de seguridad (todas las respuestas)
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === "development";
// Las previews de Vercel inyectan su barra de comentarios (vercel.live): solo ahí se le abre la CSP.
const isPreview = process.env.VERCEL_ENV === "preview";

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
const TURNSTILE = "https://challenges.cloudflare.com"; // captcha del login, registro y recuperación

// Content Security Policy: de dónde puede cargar cosas cada página (ver CLAUDE.md → Seguridad de la cuenta).
// Sin nonces: Next mete scripts inline en cada página (y next-themes y el tamaño de letra, en el <head>), y los
// nonces obligarían a renderizar todo en cada request. Por eso script-src lleva 'unsafe-inline': la CSP no frena
// un script inline inyectado, pero sí que se carguen scripts de otros sitios y que se envíen datos a otros
// dominios (connect-src), que la app se muestre dentro de otro sitio (frame-ancestors) y los <base>/<form> ajenos.
const CSP_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // 'unsafe-eval' solo en desarrollo (React lo usa para los errores); va.vercel-scripts.com: Speed Insights en dev.
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    TURNSTILE,
    ...(isDev ? ["'unsafe-eval'", "https://va.vercel-scripts.com"] : []),
    ...(isPreview ? ["https://vercel.live"] : []),
  ],
  // 'unsafe-inline': FullCalendar, sonner y Base UI ponen estilos desde JavaScript (<style> y style="…").
  "style-src": ["'self'", "'unsafe-inline'", ...(isPreview ? ["https://vercel.live"] : [])],
  "img-src": ["'self'", "data:", "blob:", ...(isPreview ? ["https://vercel.live", "https://vercel.com"] : [])],
  // Las fuentes de Google las sirve Next desde el propio sitio (next/font). data:: los íconos de FullCalendar.
  "font-src": ["'self'", "data:", ...(isPreview ? ["https://vercel.live", "https://assets.vercel.com"] : [])],
  // fetch del navegador: el propio sitio (Server Actions, Speed Insights) y Supabase (el calendario lee desde ahí).
  "connect-src": ["'self'", SUPABASE, ...(isPreview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : [])].filter(
    Boolean,
  ),
  "frame-src": [TURNSTILE, ...(isPreview ? ["https://vercel.live"] : [])], // el widget de Turnstile es un iframe
  "worker-src": ["'self'"], // el service worker (/sw.js)
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};
const CSP = Object.entries(CSP_DIRECTIVES)
  .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");

// Report-Only: el navegador avisa en la consola lo que bloquearía, sin bloquearlo. Se pasa a obligatoria
// (Content-Security-Policy) cuando una preview no muestra violaciones.
const CSP_HEADER = "Content-Security-Policy-Report-Only";

const SECURITY_HEADERS = [
  { key: CSP_HEADER, value: CSP },
  { key: "X-Frame-Options", value: "DENY" }, // como frame-ancestors 'none', para navegadores viejos
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Strict-Transport-Security no va acá: Vercel ya lo manda en todo el dominio (max-age=63072000).
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
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // Va después de la regla general: con la misma clave, gana la última (su CSP propia, más estricta).
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
