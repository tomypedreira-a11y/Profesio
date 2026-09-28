"use client";

// Maneja el tema claro/oscuro agregando la clase "dark" al <html>.
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, useRef } from "react";

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