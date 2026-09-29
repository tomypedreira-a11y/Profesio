"use client";

// Modo claro / oscuro / del sistema. Cambia al instante y lo guarda en el perfil.
import { useSyncExternalStore, useTransition } from "react";
import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";
import { updateTheme } from "./actions";
import { THEMES, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS: Record<Theme, typeof SunIcon> = { light: SunIcon, dark: MoonIcon, system: MonitorIcon };

// true solo en el navegador: el tema real (next-themes) no se conoce en el servidor.
const subscribe = () => () => {};
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false);

export function ThemeModeSelector({ value }: { value: string }) {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();
  const [, startTransition] = useTransition();
  // En el servidor se usa el guardado en el perfil; en el navegador, el que está aplicado.
  const current = isClient && theme ? theme : value;

  function choose(mode: Theme) {
    setTheme(mode); // cambia al instante
    // y lo guarda en el perfil
    startTransition(async () => {
      const result = await updateTheme(mode);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <div role="radiogroup" aria-label="Modo" className="grid grid-cols-3 gap-3 sm:max-w-md">
      {THEMES.map((t) => {
        const Icon = ICONS[t.value];
        const active = t.value === current;
        return (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(t.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50",
              active && "border-primary ring-2 ring-primary/30",
            )}
          >
            <Icon className="size-5" />
            <span className="font-medium">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
