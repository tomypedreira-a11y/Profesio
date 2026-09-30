"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  CalendarClockIcon,
  CalendarDaysIcon,
  LogOutIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

// Barra de navegación inferior, solo en el celular (en PC está el panel lateral).
// Secciones a los costados y la cuenta en el medio, que despliega sus accesos en abanico.

const LEFT_ITEMS = [
  { href: "/", label: "Calendario", icon: CalendarDaysIcon },
  { href: "/pacientes", label: "Pacientes", icon: UsersIcon },
];

const RIGHT_ITEMS = [
  { href: "/sesiones", label: "Sesiones", icon: CalendarClockIcon },
  { href: "/ingresos", label: "Ingresos", icon: WalletIcon },
];

// Posición final de cada acceso de la cuenta respecto del botón central (en px).
const ACCOUNT_ITEMS = [
  { href: "/configuracion", label: "Configuración", icon: SettingsIcon, x: -68, y: -52 },
  { href: "/perfil", label: "Mi perfil", icon: UserRoundIcon, x: 0, y: -80 },
] as const;
const LOGOUT_POSITION = { x: 68, y: -52 };

// "Calendario" también queda marcado en la pantalla aparte de vistas (/calendario).
function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname.startsWith("/calendario") : pathname.startsWith(href);
}

type MobileNavProps = {
  user: { firstName: string; lastName: string; email: string };
};

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() ||
    user.email.charAt(0).toUpperCase();
  const inAccount = ACCOUNT_ITEMS.some((item) => pathname.startsWith(item.href));

  // Escape cierra el menú de la cuenta.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const navItem = (item: (typeof LEFT_ITEMS)[number]) => {
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        aria-current={active ? "page" : undefined}
        className="flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground aria-[current=page]:text-foreground"
      >
        <span
          className={cn(
            "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
            active && "bg-primary text-primary-foreground",
          )}
        >
          <item.icon className="size-5" />
        </span>
        {item.label}
      </Link>
    );
  };

  // Los accesos salen del botón central: cerrados quedan escondidos detrás de él.
  const fanStyle = (position: { x: number; y: number }) => ({
    transform: open
      ? `translate(${position.x}px, ${position.y}px) scale(1)`
      : "translate(0, 0) scale(0.4)",
  });
  const fanClass = cn(
    "absolute -top-3.5 left-[calc(50%-1.375rem)] flex size-11 items-center justify-center rounded-full border-[1.5px] shadow-md transition-all duration-200 ease-out",
    open ? "opacity-100" : "pointer-events-none opacity-0",
  );

  return (
    <>
      {/* Fondo que cierra el menú al tocar afuera. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px] transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <nav
        data-mobile-nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {LEFT_ITEMS.map(navItem)}

          <div className="relative flex justify-center">
            {ACCOUNT_ITEMS.map((item) => (
              <button
                key={item.href}
                type="button"
                aria-label={item.label}
                title={item.label}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
                style={fanStyle(item)}
                className={cn(
                  fanClass,
                  isActivePath(pathname, item.href)
                    ? "border-primary-border bg-primary text-primary-foreground"
                    : "border-primary-border bg-background text-foreground",
                )}
              >
                <item.icon className="size-5" />
              </button>
            ))}
            <button
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              tabIndex={open ? 0 : -1}
              onClick={() => startTransition(() => logout())}
              style={fanStyle(LOGOUT_POSITION)}
              className={cn(fanClass, "border-destructive/40 bg-background text-destructive")}
            >
              <LogOutIcon className="size-5" />
            </button>

            {/* Botón de la cuenta: más grande y sobresaliendo de la barra. */}
            <button
              type="button"
              aria-label="Cuenta"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className={cn(
                "relative -mt-5 flex size-14 items-center justify-center rounded-full border-4 border-background bg-primary text-base font-semibold text-primary-foreground shadow-lg",
                // En Mi perfil o Configuración se remarca, como las secciones activas.
                inAccount && !open && "ring-2 ring-primary-border",
              )}
            >
              {open ? <XIcon className="size-6" /> : initials}
            </button>
          </div>

          {RIGHT_ITEMS.map(navItem)}
        </div>
      </nav>
    </>
  );
}
