// Pie de las páginas públicas.
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/legal";

const LINKS = [
  { href: "/ayuda", label: "Ayuda" },
  { href: "/terminos", label: "Términos" },
  { href: "/privacidad", label: "Privacidad" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-col gap-1">
          <span className="font-heading text-lg">Profesio</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>
        <nav aria-label="Información" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Profesio</p>
      </div>
    </footer>
  );
}
