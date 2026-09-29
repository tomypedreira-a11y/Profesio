"use client";

// Maneja el tema claro/oscuro (clase "dark" en el <html>) y la paleta de colores (data-palette).
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { isPalette, PALETTE_COOKIE } from "@/lib/palettes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}

// Aplica el tema guardado en el perfil al abrir la app (así se respeta en cualquier dispositivo).
// Solo actúa cuando cambia el valor guardado, para no pisar un cambio que el usuario acaba de hacer.
export function ThemeSync({ theme }: { theme: string }) {
  const { setTheme } = useTheme();
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (applied.current === theme) return;
    applied.current = theme;
    setTheme(theme);
  }, [theme, setTheme]);

  return null;
}

// Aplica una paleta al instante y la recuerda en una cookie (la lee el layout raíz al abrir la app).
export function applyPalette(palette: string) {
  document.documentElement.dataset.palette = palette;
  document.cookie = `${PALETTE_COOKIE}=${palette}; path=/; max-age=31536000; samesite=lax`;
}

// Aplica la paleta guardada en el perfil (así se respeta en cualquier dispositivo).
export function PaletteSync({ palette }: { palette: string }) {
  useEffect(() => {
    if (isPalette(palette) && document.documentElement.dataset.palette !== palette) applyPalette(palette);
  }, [palette]);

  return null;
}