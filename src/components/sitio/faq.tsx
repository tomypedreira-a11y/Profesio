"use client";

// Preguntas frecuentes (página promocional y /ayuda). Respuestas cortas y verdaderas: cada una describe
// lo que la app hace hoy. Si cambia una funcionalidad, revisar acá.
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CONTACT_EMAIL } from "@/lib/legal";

const mail = (
  <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium">
    {CONTACT_EMAIL}
  </a>
);

const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Necesito instalar algo?",
    a: (
      <p>
        No. Profesio funciona en el navegador de tu compu o tu celular: entrás a miprofesio.com con tu email y
        contraseña. Si querés, la podés instalar como app para abrirla desde el escritorio o la pantalla de inicio,
        sin pasar por ninguna tienda de aplicaciones.
      </p>
    ),
  },
  {
    q: "¿Funciona en iPhone y Android?",
    a: (
      <p>
        Sí. En Android se instala desde Chrome; en iPhone y iPad, desde Safari, con «Agregar a pantalla de inicio»
        (<Link href="/ayuda#instalar">ver cómo</Link>). En iPhone, los recordatorios de sesión llegan solo con la app
        instalada.
      </p>
    ),
  },
  {
    q: "¿Mis datos están seguros?",
    a: (
      <>
        <p>
          Cuidamos tus datos con varias capas: la conexión está cifrada, las reglas de acceso están en la base de
          datos (cada cuenta ve solo lo suyo), podés activar la verificación en dos pasos y la sesión se cierra sola
          si queda sin usar.
        </p>
        <p>
          Los datos se guardan en servidores de Supabase en São Paulo, Brasil. Los detalles están en la{" "}
          <Link href="/privacidad">Política de privacidad</Link>.
        </p>
      </>
    ),
  },
  {
    q: "¿Quién puede ver mis anotaciones?",
    a: (
      <p>
        Se ven desde tu cuenta. Otros psicólogos que usan Profesio no pueden ver tus pacientes ni tus anotaciones, y
        la app no tiene forma de compartirlas. El equipo de Profesio no las usa para nada más que hacer funcionar el
        servicio (lo explica la <Link href="/privacidad">Política de privacidad</Link>).
      </p>
    ),
  },
  {
    q: "¿Puedo usarla en varias compus?",
    a: (
      <p>
        Sí: ingresás con tu cuenta en cada una y ves la misma agenda. Las notificaciones se activan en cada
        dispositivo por separado. Si usaste una compu compartida, en Configuración podés cerrar la sesión en todos
        los dispositivos.
      </p>
    ),
  },
  {
    q: "¿Qué pasa si pierdo el celular con la verificación en dos pasos?",
    a: (
      <p>
        Si registraste un segundo dispositivo (te lo recomendamos), ingresás con el código de ese. Si no, escribinos
        a {mail}: después de verificar que sos vos, te quitamos la verificación para que puedas ingresar y volver a
        activarla.
      </p>
    ),
  },
  {
    q: "¿Cuánto cuesta?",
    a: <p>Nada: Profesio es gratis durante la beta.</p>,
  },
];

export function Faq() {
  return (
    <Accordion className="rounded-xl border bg-card px-4 md:px-6">
      {QUESTIONS.map(({ q, a }) => (
        <AccordionItem key={q} value={q}>
          <AccordionTrigger className="py-4 text-base">{q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
