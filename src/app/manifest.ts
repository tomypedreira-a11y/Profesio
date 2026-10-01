import type { MetadataRoute } from "next";

// Manifest de la PWA (se sirve en /manifest.webmanifest): permite instalar Profesio como app.
// Los íconos se generan con scripts/generate-icons.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Profesio",
    short_name: "Profesio",
    description: "Agenda y gestión de pacientes para psicólogos",
    start_url: "/",
    scope: "/",
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
      { name: "Calendario", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Pacientes", url: "/pacientes", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      {
        name: "Nuevo paciente",
        url: "/pacientes/nuevo",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
