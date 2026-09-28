// Temas disponibles; coinciden con los valores permitidos en profiles.theme.
export const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Del sistema" },
] as const;

export type Theme = (typeof THEMES)[number]["value"];

export function isTheme(value: unknown): value is Theme {
  return THEMES.some((t) => t.value === value);
}
