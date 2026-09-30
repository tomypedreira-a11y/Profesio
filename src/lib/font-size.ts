// Tamaños de letra; coinciden con los valores permitidos en profiles.font_size.
// Se aplican como porcentaje de la letra del navegador (globals.css), así se agranda toda la interfaz.
export const FONT_SIZES = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Grande" },
  { value: "xlarge", label: "Muy grande" },
] as const;

export type FontSize = (typeof FONT_SIZES)[number]["value"];

export function isFontSize(value: unknown): value is FontSize {
  return FONT_SIZES.some((f) => f.value === value);
}

const STORAGE_KEY = "font-size";

// Lo aplica en <html> y lo recuerda en el navegador para la próxima carga.
export function applyFontSize(size: FontSize) {
  document.documentElement.dataset.fontSize = size;
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // Sin almacenamiento (ventana privada): se aplica igual, solo que no se recuerda.
  }
}

// Corre antes de pintar la página (en el <head>), para que no aparezca primero en tamaño normal.
export const FONT_SIZE_SCRIPT = `try{var s=localStorage.getItem("${STORAGE_KEY}");if(s)document.documentElement.dataset.fontSize=s}catch(e){}`;
