// Páginas públicas: la promocional ("/"), la ayuda y las legales. Encabezado y pie propios, sin el panel de la app.
// Se ven igual con o sin sesión (el proxy no las redirige).
import { SiteFooter } from "@/components/sitio/site-footer";
import { SiteHeader } from "@/components/sitio/site-header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
