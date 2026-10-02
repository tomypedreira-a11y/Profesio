// Página promocional (pública). Solo afirmaciones verdaderas: cada funcionalidad que se nombra existe en la app.
// Si cambia o se quita una, revisar estos textos (y los de components/sitio/faq.tsx).
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BellRingIcon,
  CalendarDaysIcon,
  FileLockIcon,
  HourglassIcon,
  LockKeyholeIcon,
  MonitorSmartphoneIcon,
  NotebookPenIcon,
  RepeatIcon,
  ShieldCheckIcon,
  TreePalmIcon,
  UsersRoundIcon,
  VideoIcon,
  WalletIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Faq } from "@/components/sitio/faq";
import { InstallButton } from "@/components/sitio/install-button";
import { hasSession } from "@/components/sitio/session";
import { APP_HOME } from "@/lib/routes";

const TITLE = "Profesio · Tu nueva agenda, moderna.";
const DESCRIPTION =
  "Dejá la agenda de papel. Tus sesiones, tus pacientes y tus anotaciones en un solo lugar, desde la compu o el celular.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: "Profesio", locale: "es_AR", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const FEATURES = [
  {
    icon: CalendarDaysIcon,
    title: "Calendario por día, semana o mes",
    text: "Mirá tu agenda como te resulte más cómodo. La próxima sesión queda siempre a la vista.",
  },
  {
    icon: RepeatIcon,
    title: "Horarios fijos que se agendan solos",
    text: "Cargá el día y la hora de cada paciente (uno o varios por semana) y las sesiones aparecen en el calendario. Para quienes vienen cada tanto, agendás sesiones sueltas.",
  },
  {
    icon: NotebookPenIcon,
    title: "Anotaciones de cada sesión",
    text: "Escribís un borrador que se guarda solo y lo finalizás cuando está listo. Si hay que corregir algo, la corrección queda como una versión nueva.",
  },
  {
    icon: BellRingIcon,
    title: "Recordatorios en el celular",
    text: "Un aviso antes de cada sesión y, si querés, un resumen del día a la hora que elijas. Sin datos clínicos en la pantalla bloqueada.",
  },
  {
    icon: WalletIcon,
    title: "Cobros e ingresos",
    text: "Marcá cada sesión como cobrada (en efectivo, por transferencia u otro medio), también por adelantado. Mirá lo cobrado en el mes, lo pendiente y quiénes te deben.",
  },
  {
    icon: TreePalmIcon,
    title: "Vacaciones",
    text: "Cargá tus vacaciones y las sesiones de horario fijo de esos días se quitan solas. Si surge una urgencia, igual podés agendar una sesión suelta.",
  },
  {
    icon: VideoIcon,
    title: "Presencial o virtual",
    text: "Cada paciente con su modalidad, que podés cambiar para una sesión puntual, y un acceso directo a su WhatsApp.",
  },
  {
    icon: MonitorSmartphoneIcon,
    title: "En la compu y en el celular",
    text: "Funciona en el navegador y se instala como app, sin tiendas de aplicaciones. Ves la misma agenda en todos tus dispositivos.",
  },
];

const SECURITY = [
  {
    icon: UsersRoundIcon,
    title: "Cada psicólogo ve solo sus pacientes",
    text: "Las reglas de acceso están en la base de datos, no solo en la pantalla: una cuenta no puede leer los datos de otra.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Verificación en dos pasos",
    text: "Además de la contraseña, un código de una app como Google Authenticator o Authy. La activás cuando quieras.",
  },
  {
    icon: HourglassIcon,
    title: "Cierre de sesión por inactividad",
    text: "Si dejás la compu o el celular sin usar, la sesión se cierra sola después del tiempo que elijas (de 15 minutos a 4 horas).",
  },
  {
    icon: FileLockIcon,
    title: "Anotaciones que no se alteran",
    text: "Una anotación finalizada no se puede modificar ni borrar, como pide la Ley 26.529 de historia clínica. Las correcciones quedan como versiones nuevas.",
  },
  {
    icon: LockKeyholeIcon,
    title: "Conexión cifrada",
    text: "Todo viaja cifrado (HTTPS) entre tu dispositivo y Profesio.",
  },
];

const STEPS = [
  { title: "Creá tu cuenta", text: "Con tu email y una contraseña. Es gratis durante la beta." },
  { title: "Cargá tus pacientes", text: "Con su horario fijo, si tienen, o sin horario para agendarlos cuando vengan." },
  { title: "Listo: tu agenda se arma sola", text: "Las sesiones de los horarios fijos aparecen en el calendario, semana a semana." },
];

export default async function LandingPage() {
  const loggedIn = await hasSession();

  return (
    <>
      {/* Portada */}
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pt-14 pb-16 text-center md:px-6 md:pt-20">
        <div className="flex max-w-2xl flex-col items-center gap-5">
          <p className="rounded-full border border-primary-border/40 bg-accent px-3 py-1 text-sm text-accent-foreground">
            Profesio · Agenda para psicólogos
          </p>
          <h1 className="font-heading text-4xl leading-tight font-medium text-balance md:text-6xl">
            Tu nueva agenda, moderna.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Dejá la agenda de papel. Tus sesiones, tus pacientes y tus anotaciones en un solo lugar, desde la compu o
            el celular.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {loggedIn ? (
              <Link href={APP_HOME} className={buttonVariants({ size: "lg" })}>
                Ir a mi agenda
              </Link>
            ) : (
              <>
                <Link href="/app/registro" className={buttonVariants({ size: "lg" })}>
                  Probala gratis
                </Link>
                <Link href="/app/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Ingresar
                </Link>
              </>
            )}
            <InstallButton />
          </div>
        </div>

        {/* Capturas con datos ficticios (scripts/landing-screenshots.mjs). */}
        <div className="relative w-full max-w-5xl">
          <div className="overflow-hidden rounded-xl border bg-card shadow-xl shadow-foreground/5 max-md:hidden">
            <div className="flex items-center gap-1.5 border-b bg-muted/60 px-4 py-2.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
              <span className="size-2.5 rounded-full bg-foreground/15" />
            </div>
            <Image
              src="/landing/calendario-pc.webp"
              alt="El calendario de Profesio en la compu: la semana con las sesiones de cada día y la próxima sesión a la derecha."
              width={1440}
              height={900}
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="h-auto w-full"
            />
          </div>
          <div className="mx-auto w-56 overflow-hidden rounded-[2rem] border-4 border-foreground/80 bg-card shadow-xl md:absolute md:-right-4 md:-bottom-10 md:w-48 lg:-right-10 lg:w-56">
            <Image
              src="/landing/calendario-celular.webp"
              alt="El calendario de Profesio en el celular: la tira de días de la semana y las sesiones de hoy."
              width={780}
              height={1688}
              priority
              sizes="224px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funciones" className="scroll-mt-20 border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <SectionTitle title="Todo lo de tu consultorio, ordenado" text="Pensada para el día a día de un psicólogo." />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Feature key={f.title} {...f} />
            ))}
          </ul>

          <div className="mt-14 grid items-center gap-8 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h3 className="font-heading text-2xl">La ficha de cada paciente</h3>
              <p className="text-muted-foreground">
                Sus datos, su frecuencia y modalidad, el valor de la sesión, sus próximas y últimas sesiones y sus
                anotaciones, en una sola pantalla. Desde ahí le agendás una sesión o le escribís por WhatsApp.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card shadow-lg shadow-foreground/5">
              <Image
                src="/landing/paciente.webp"
                alt="La ficha de un paciente ficticio en Profesio, con sus horarios y sus sesiones."
                width={1440}
                height={900}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Privacidad y seguridad */}
      <section id="seguridad" className="scroll-mt-20 border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <SectionTitle
            title="Privacidad y seguridad"
            text="Trabajás con información sensible. Profesio está hecha para cuidarla."
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY.map((f) => (
              <Feature key={f.title} {...f} />
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Más detalles en la{" "}
            <Link href="/privacidad" className="underline underline-offset-4">
              Política de privacidad
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Cómo empezar */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <SectionTitle title="Cómo empezar" text="En pocos minutos tenés tu agenda funcionando." />
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-3 rounded-xl border bg-card p-6">
                <span className="flex size-9 items-center justify-center rounded-full border-[1.5px] border-primary-border bg-primary font-heading text-lg text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="font-heading text-lg">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Precio */}
      <section id="precio" className="scroll-mt-20 border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center md:px-6 md:py-20">
          <SectionTitle title="Precio" />
          <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-primary-border/40 bg-card p-8 shadow-sm">
            <p className="font-heading text-3xl">Gratis durante la beta</p>
            <p className="text-muted-foreground">Estamos en beta: usá Profesio gratis mientras la mejoramos con vos.</p>
            {loggedIn ? (
              <Link href={APP_HOME} className={buttonVariants()}>
                Ir a mi agenda
              </Link>
            ) : (
              <Link href="/app/registro" className={buttonVariants()}>
                Probala gratis
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="scroll-mt-20 border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-20">
          <SectionTitle title="Preguntas frecuentes" />
          <Faq />
        </div>
      </section>
    </>
  );
}

function SectionTitle({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mb-10 flex flex-col items-center gap-2 text-center">
      <h2 className="font-heading text-3xl font-medium text-balance md:text-4xl">{title}</h2>
      {text && <p className="max-w-xl text-pretty text-muted-foreground">{text}</p>}
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="font-heading text-lg leading-snug">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </li>
  );
}
