// Ayuda: preguntas frecuentes (las mismas de la página promocional), cómo instalar la app y contacto.
import type { Metadata } from "next";
import { MailIcon, MonitorIcon, ShareIcon, SmartphoneIcon, SquarePlusIcon } from "lucide-react";
import { Faq } from "@/components/sitio/faq";
import { InstallButton } from "@/components/sitio/install-button";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Preguntas frecuentes, cómo instalar Profesio y cómo contactarnos.",
  alternates: { canonical: "/ayuda" },
};

const INSTALL = [
  {
    icon: MonitorIcon,
    title: "En la compu",
    steps: [
      "Abrí miprofesio.com en Chrome o Edge.",
      "Tocá el ícono de instalar, a la derecha de la barra de direcciones (o, ya adentro de Profesio, Configuración → Instalar la app).",
      "Profesio queda en el escritorio y en el menú de inicio, como cualquier programa.",
    ],
  },
  {
    icon: SmartphoneIcon,
    title: "En Android",
    steps: [
      "Abrí miprofesio.com en Chrome.",
      "Tocá el menú (los tres puntos) → «Instalar app» o «Agregar a la pantalla principal».",
      "Profesio queda en tu pantalla de inicio.",
    ],
  },
  {
    icon: ShareIcon,
    title: "En iPhone o iPad",
    steps: [
      "Abrí miprofesio.com en Safari (los otros navegadores no permiten instalarla).",
      "Tocá el botón Compartir (el cuadrado con una flecha hacia arriba).",
      "Elegí «Agregar a pantalla de inicio» y tocá «Agregar».",
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-14 md:px-6 md:py-20">
      <header className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-medium">Ayuda</h1>
        <p className="text-lg text-muted-foreground">
          Respuestas a las dudas más comunes. Si no encontrás lo que buscás, escribinos.
        </p>
      </header>

      <section aria-labelledby="preguntas" className="flex flex-col gap-5">
        <h2 id="preguntas" className="font-heading text-2xl">Preguntas frecuentes</h2>
        <Faq />
      </section>

      <section id="instalar" aria-labelledby="instalar-titulo" className="flex scroll-mt-20 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="instalar-titulo" className="font-heading text-2xl">Cómo instalar la app</h2>
          <InstallButton />
        </div>
        <p className="text-muted-foreground">
          No hace falta instalarla: funciona en el navegador. Instalada, se abre desde el escritorio o la pantalla de
          inicio, en su propia ventana. En iPhone, además, es necesaria para recibir los recordatorios de sesión.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {INSTALL.map(({ icon: Icon, title, steps }) => (
            <div key={title} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
              <h3 className="flex items-center gap-2 font-heading text-lg">
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                {title}
              </h3>
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted-foreground">
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <SquarePlusIcon className="size-4 shrink-0" aria-hidden />
          Las notificaciones se activan después, en Configuración → Notificaciones, en cada dispositivo.
        </p>
      </section>

      <section aria-labelledby="contacto" className="flex flex-col gap-3 rounded-xl border bg-card p-6">
        <h2 id="contacto" className="flex items-center gap-2 font-heading text-2xl">
          <MailIcon className="size-5 text-muted-foreground" aria-hidden />
          Contacto
        </h2>
        <p className="text-muted-foreground">
          Para dudas, sugerencias o problemas con tu cuenta, escribinos a{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
          . Nunca te vamos a pedir tu contraseña ni tus códigos de verificación.
        </p>
      </section>
    </div>
  );
}
