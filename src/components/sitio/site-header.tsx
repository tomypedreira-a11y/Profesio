// Encabezado de las páginas públicas (promocional, ayuda y legales).
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_HOME } from "@/lib/routes";
import { hasSession } from "./session";

const SECTIONS = [
  { href: "/#funciones", label: "Funciones" },
  { href: "/#seguridad", label: "Seguridad" },
  { href: "/#precio", label: "Precio" },
  { href: "/#preguntas", label: "Preguntas" },
];

export async function SiteHeader() {
  const loggedIn = await hasSession();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold" aria-label="Profesio, inicio">
          <LogoMark />
          Profesio
        </Link>
        <nav aria-label="Secciones" className="ml-4 hidden gap-1 lg:flex">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {loggedIn ? (
            <Link href={APP_HOME} className={buttonVariants()}>
              Ir a mi agenda
            </Link>
          ) : (
            <>
              <Link href="/app/login" className={buttonVariants({ variant: "ghost" })}>
                Ingresar
              </Link>
              <Link href="/app/registro" className={cn(buttonVariants(), "max-sm:hidden")}>
                Probala gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
