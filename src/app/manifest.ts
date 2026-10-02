import type { MetadataRoute } from "next";

// Manifest de la PWA (se sirve en /manifest.webmanifest): permite instalar Profesio como app.
// Los íconos se generan con scripts/generate-icons.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // id: se mantiene "/" (el start_url de antes): si cambia, las instalaciones existentes quedarían duplicadas.
    id: "/",
    name: "Profesio",
    short_name: "Profesio",
    description: "Agenda y gestión de pacientes para psicólogos",
    start_url: "/app/calendario", // APP_HOME: la app instalada abre en el calendario, no en la página promocional
    // Solo /app/ es la app instalada: un link a miprofesio.com (la página promocional, /ayuda, etc.) abre el
    // navegador y no la app. El service worker sigue registrado en "/" (cubre este scope).
    scope: "/app/",
    display: "standalone",
    orientation: "any",
    lang: "es",
    dir: "ltr",
    background_color: "#faf3e5", // beige de la paleta (pantalla de carga)
    theme_color: "#9ccd9c", // verde salvia (--primary del tema claro)
    categories: ["medical", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Calendario", url: "/app/calendario", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Pacientes", url: "/app/pacientes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      {
        name: "Nuevo paciente",
        url: "/app/pacientes/nuevo",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
