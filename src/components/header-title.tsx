"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Título del encabezado, con brillos al azar: al abrir la app en el calendario, un saludo según la hora
// del dispositivo ("¡Buenas tardes, Ana!"); después de pasar a otra pantalla, "Profesio".

type Period = "morning" | "afternoon" | "night";

const GREETINGS: Record<Period, string> = {
  morning: "Buenos días",
  afternoon: "Buenas tardes",
  night: "Buenas noches",
};

// Días de 6 a 12, tardes de 12 a 20, noches de 20 a 6.
function currentPeriod(): Period {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 20) return "afternoon";
  return "night";
}

// Se revisa la hora cada minuto por si la app queda abierta.
function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
}

// Solo caracteres que se ven en casi todos los dispositivos (otros salen como cuadraditos en Android).
const SPARKLES = [
  "₊ ⊹₊ ⊹",
  "✧˖°.",
  "⋆｡°✩",
  "˚₊‧✦‧₊˚",
  "⊹˚₊ ✧",
  "⋆⁺₊⋆ ☆ ⋆⁺₊⋆",
  "✶ ⋆ ˚｡",
  "₊˚✧ ‧₊˚",
];

type HeaderTitleProps = { firstName: string; className?: string };

export function HeaderTitle(props: HeaderTitleProps) {
  // El layout no se vuelve a montar al navegar: este estado dura mientras la app está abierta.
  const pathname = usePathname();
  const [openedAt] = useState(pathname);
  const [navigated, setNavigated] = useState(false);
  if (!navigated && pathname !== openedAt) setNavigated(true);

  // key: en cada pantalla se monta de nuevo, así los brillos cambian.
  return <TitleText key={pathname} greet={openedAt === "/" && !navigated} {...props} />;
}

function TitleText({ greet, firstName, className }: HeaderTitleProps & { greet: boolean }) {
  // null en el servidor y al hidratar: la hora y el azar solo se conocen en el navegador.
  const period = useSyncExternalStore(subscribe, currentPeriod, () => null);
  const [sparkles] = useState(() => SPARKLES[Math.floor(Math.random() * SPARKLES.length)]);

  const name = firstName.trim();
  const salutation = period ? GREETINGS[period] : "Hola";
  const text = !greet ? "Profesio" : name ? `¡${salutation}, ${name}!` : `¡${salutation}!`;
  // El saludo aparece recién en el navegador (sin salto: el encabezado tiene alto fijo); "Profesio", desde el servidor.
  const visible = !greet || period !== null;

  return (
    <span
      className={cn("truncate transition-opacity duration-300", visible ? "opacity-100" : "opacity-0", className)}
      aria-hidden={visible ? undefined : true}
    >
      {text}
      {period && (
        <span aria-hidden className="ml-2 text-primary/70">
          {sparkles}
        </span>
      )}
    </span>
  );
}
