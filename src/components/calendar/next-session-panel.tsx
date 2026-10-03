"use client";

// Tarjetas de la sesión en curso, la próxima y la última (calendario; la en curso, también en Sesiones), con el
// mismo diseño:
// - última: la última realizada, en gris (como las realizadas del calendario), para consultarla o anotarla;
// - en curso: paciente, horario y un cronómetro desde el inicio; mientras dura, "¿El paciente aún no llegó?";
// - próxima: paciente, fecha ("Hoy" o "Mañana" si corresponde) y cuánto falta (se actualiza cada medio minuto;
//   así "Mañana" pasa a "Hoy" a la medianoche).
import { useEffect, useState, type ReactNode } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ClockIcon, HistoryIcon, TimerIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatElapsed, formatSessionRelative, formatTimeAgo, formatTimeUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WhatsAppLateButton, WhatsAppReminderButton } from "@/components/whatsapp-message";
import type { CalendarSession } from "./types";

// La hora actual, actualizada cada `ms`.
function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

type NextSessionPanelProps = {
  // undefined = cargando; null = no hay ninguna sesión futura.
  session: CalendarSession | null | undefined;
  timeZone: string;
  onSelect: (session: CalendarSession) => void;
  // Se llama cuando la sesión empieza, para buscar la siguiente.
  onStarted: () => void;
};

export function NextSessionPanel({ session, timeZone, onSelect, onStarted }: NextSessionPanelProps) {
  const now = useNow(30_000);
  const msLeft = session ? new Date(session.starts_at).getTime() - now : null;
  const started = msLeft !== null && msLeft <= 0;

  useEffect(() => {
    if (started) onStarted();
  }, [started, onStarted]);

  return (
    <Card size="sm" className="py-0">
      {session === undefined ? (
        <Skeleton className="m-2 h-8 lg:h-10" />
      ) : session === null ? (
        <p className="px-3 py-2 text-sm text-muted-foreground lg:py-3">
          <span className="font-medium text-foreground">Próxima sesión:</span> no hay sesiones agendadas.
        </p>
      ) : (
        <SessionCardContent
          tone="next"
          session={session}
          title="Ver próxima sesión"
          prefix="Próxima: "
          detail={formatSessionRelative(session.starts_at, timeZone, now)}
          pill={
            <>
              <ClockIcon className="size-3" />
              {formatTimeUntil(msLeft ?? 0)}
            </>
          }
          onSelect={onSelect}
          // Recordatorio sin abrir el panel de la sesión.
          action={<WhatsAppReminderButton session={session} className="w-full" />}
        />
      )}
    </Card>
  );
}

type CurrentSessionPanelProps = {
  // null = no hay ninguna en curso (no se muestra nada).
  session: CalendarSession | null;
  timeZone: string;
  onSelect: (session: CalendarSession) => void;
  // Se llama cuando la sesión termina, para dejar de mostrarla.
  onEnded: () => void;
};

export function CurrentSessionPanel({ session, timeZone, onSelect, onEnded }: CurrentSessionPanelProps) {
  const now = useNow(1_000); // cronómetro: cada segundo
  const ended = !!session && new Date(session.ends_at).getTime() <= now;

  useEffect(() => {
    if (ended) onEnded();
  }, [ended, onEnded]);

  if (!session || ended) return null;
  const time = (iso: string) => formatInTimeZone(iso, timeZone, "HH:mm");

  // Verde (--session-current, calendar.css) para que destaque sobre las demás tarjetas.
  return (
    <Card
      size="sm"
      className="bg-(--session-current) py-0 text-(--session-current-foreground) ring-[1.5px] ring-(--session-current-border)"
    >
      <SessionCardContent
        tone="current"
        session={session}
        title="Ver sesión en curso"
        prefix="En curso: "
        detail={`${time(session.starts_at)} a ${time(session.ends_at)}`}
        pill={
          <>
            <TimerIcon className="size-3" />
            <span suppressHydrationWarning className="tabular-nums">{formatElapsed(now - new Date(session.starts_at).getTime())}</span>
          </>
        }
        pillTitle="Tiempo desde el inicio de la sesión"
        onSelect={onSelect}
        action={<WhatsAppLateButton session={session} className="w-full" />}
      />
    </Card>
  );
}

type LastSessionPanelProps = {
  // null = todavía no hay ninguna realizada; undefined = cargando (en los dos casos no se muestra nada).
  session: CalendarSession | null | undefined;
  timeZone: string;
  onSelect: (session: CalendarSession) => void;
};

export function LastSessionPanel({ session, timeZone, onSelect }: LastSessionPanelProps) {
  const now = useNow(60_000);
  if (!session) return null;

  return (
    <Card size="sm" className="bg-muted py-0 text-muted-foreground">
      <SessionCardContent
        tone="past"
        session={session}
        title="Ver última sesión"
        prefix="Última: "
        detail={formatSessionRelative(session.starts_at, timeZone, now)}
        pill={
          <>
            <HistoryIcon className="size-3" />
            {formatTimeAgo(now - new Date(session.ends_at).getTime())}
          </>
        }
        pillTitle="Hace cuánto terminó"
        onSelect={onSelect}
        action={null}
      />
    </Card>
  );
}

// En el celular va debajo del calendario, sin avatar: nombre y fecha en dos líneas, y a la derecha
// el tiempo (en una sola línea, con letra grande, la fecha y el tiempo tapaban el nombre).
// En PC, en la columna angosta de la derecha, lleva avatar y el tiempo pasa abajo del nombre.
// Colores de cada tarjeta: la próxima, sobre el fondo de tarjeta con detalles en amarillo; la en curso, toda verde;
// la última, gris.
const TONES = {
  past: {
    button: "hover:bg-black/5 dark:hover:bg-white/5",
    avatar: "bg-card text-muted-foreground",
    detail: "",
    pill: "border-border bg-card text-muted-foreground",
  },
  next: {
    button: "hover:bg-accent",
    avatar: "bg-(--session-next) text-(--session-next-foreground)",
    detail: "text-muted-foreground",
    pill: "border-(--session-next-border) bg-(--session-next) text-(--session-next-foreground)",
  },
  current: {
    button: "hover:bg-black/5 dark:hover:bg-white/10",
    avatar: "bg-card text-(--session-current-foreground) dark:text-card-foreground",
    detail: "opacity-80",
    pill: "border-(--session-current-border) bg-card text-(--session-current-foreground) dark:text-card-foreground",
  },
};

function SessionCardContent({
  tone,
  session,
  title,
  prefix,
  detail,
  pill,
  pillTitle,
  onSelect,
  action,
}: {
  tone: keyof typeof TONES;
  session: CalendarSession;
  title: string;
  prefix: string; // antes del detalle, solo en PC
  detail: string;
  pill: ReactNode;
  pillTitle?: string;
  onSelect: (session: CalendarSession) => void;
  action: ReactNode; // botón de WhatsApp (no se muestra si el paciente no tiene teléfono); null = ninguno
}) {
  const colors = TONES[tone];
  return (
    <>
      <button
        type="button"
        onClick={() => onSelect(session)}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2 text-left transition-colors lg:grid-cols-[auto_minmax(0,1fr)]",
          colors.button,
        )}
        title={title}
      >
        <Avatar className="size-9 max-lg:hidden lg:row-span-2">
          <AvatarFallback className={cn("text-xs", colors.avatar)}>
            {`${session.first_name.charAt(0)}${session.last_name.charAt(0)}`.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="grid min-w-0">
          <span className="truncate text-sm font-medium">
            {session.first_name} {session.last_name}
          </span>
          {/* "Hoy"/"Mañana" dependen de la hora: como el tiempo (abajo), puede diferir del servidor. */}
          <span suppressHydrationWarning className={cn("truncate text-xs", colors.detail)}>
            <span className="max-lg:hidden">{prefix}</span>
            {detail}
          </span>
        </div>
        {/* La sesión puede venir del servidor: si entre el servidor y el navegador cambió el minuto (o el segundo),
            el texto difiere (suppressHydrationWarning); se corrige solo en la próxima actualización. */}
        <span
          suppressHydrationWarning
          title={pillTitle}
          className={cn(
            "flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap lg:col-start-2",
            colors.pill,
          )}
        >
          {pill}
        </span>
      </button>
      {/* Fuera del botón: es un link (no se anidan). */}
      {action && session.phone && <div className="px-3 pb-2">{action}</div>}
    </>
  );
}
