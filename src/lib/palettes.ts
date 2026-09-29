// Paletas de color de la app. Se combinan con el modo (claro / oscuro / del sistema).
// Para agregar una: sumarla a esta lista y definir sus colores en src/app/palettes.css.
// El valor se guarda en profiles.palette (solo minúsculas, números y guiones).

export const PALETTES = [
  // swatch: color de muestra para el selector (el --primary de la paleta en modo claro).
  { value: "neutral", label: "Neutro", swatch: "oklch(0.205 0 0)" },
  { value: "navy", label: "Azul marino", swatch: "oklch(0.545 0.111 254.1)" },
  { value: "peach", label: "Durazno", swatch: "oklch(0.779 0.129 20.4)" },
  { value: "brown", label: "Café", swatch: "oklch(0.562 0.054 56.8)" },
  { value: "pink", label: "Rosa", swatch: "oklch(0.568 0.130 354.7)" },
  { value: "sage", label: "Salvia", swatch: "oklch(0.557 0.029 141.7)" },
  { value: "maroon", label: "Bordó", swatch: "oklch(0.380 0.152 18.6)" },
] as const;

export type Palette = (typeof PALETTES)[number]["value"];

export const DEFAULT_PALETTE: Palette = "neutral";

// Cookie con la paleta elegida: permite aplicarla desde el servidor, sin parpadeo al abrir la app.
export const PALETTE_COOKIE = "palette";

export function isPalette(value: unknown): value is Palette {
  return PALETTES.some((p) => p.value === value);
}
