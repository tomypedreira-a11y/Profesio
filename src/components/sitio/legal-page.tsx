// Estructura común de las páginas legales (Términos y Política de privacidad): título, fecha y texto.
import { LEGAL_UPDATED } from "@/lib/legal";

export function LegalPage({ title, intro, children }: { title: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14 md:px-6 md:py-20">
      <header className="flex flex-col gap-3 border-b pb-8">
        <h1 className="font-heading text-4xl font-medium">{title}</h1>
        <p className="text-sm text-muted-foreground">Última actualización: {LEGAL_UPDATED}</p>
        <div className="text-lg text-muted-foreground">{intro}</div>
      </header>
      {/* Estilos del texto: títulos de sección, párrafos y listas. */}
      <div className="flex flex-col gap-4 leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:text-foreground [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6 text-foreground/90">
        {children}
      </div>
    </article>
  );
}
