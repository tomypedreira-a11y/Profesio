"use client";

// Maneja el tema claro/oscuro agregando la clase "dark" al <html>.
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import { isAppPath } from "@/lib/routes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El tema elegido es de la app: el sitio público va siempre en claro (forcedTheme no toca el guardado,
  // así que al volver a /app se recupera el del usuario).
  const forcedTheme = isAppPath(usePathname()) ? undefined : "light";
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      forcedTheme={forcedTheme}
    >
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