// Paletas de color de la app. Se combinan con el modo (claro / oscuro / del sistema).
// Para agregar una: sumarla a esta lista y definir sus colores en src/app/palettes.css.
// El valor se guarda en profiles.palette (solo minúsculas, números y guiones).

export const PALETTES = [
  // swatch: color de muestra para el selector (el --primary de la paleta en modo claro).
  { value: "neutral", label: "Neutro", swatch: "oklch(0.205 0 0)" },
] as const;

export type Palette = (typeof PALETTES)[number]["value"];

export const DEFAULT_PALETTE: Palette = "neutral";

// Cookie con la paleta elegida: permite aplicarla desde el servidor, sin parpadeo al abrir la app.
export const PALETTE_COOKIE = "palette";

export function isPalette(value: unknown): value is Palette {
  return PALETTES.some((p) => p.value === value);
}
