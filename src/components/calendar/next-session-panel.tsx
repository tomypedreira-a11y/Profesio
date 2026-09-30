"use client";

// Tarjeta con la próxima sesión: paciente, fecha y cuánto falta (se actualiza cada minuto).
import { useEffect, useState } from "react";
import { ClockIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatSessionShort, formatTimeUntil } from "@/lib/format";
import type { CalendarSession } from "./types";

type NextSessionPanelProps = {
  // undefined = cargando; null = no hay ninguna sesión futura.
  session: CalendarSession | null | undefined;
  timeZone: string;
  onSelect: (session: CalendarSession) => void;
  // Se llama cuando la sesión empieza, para buscar la siguiente.
  onStarted: () => void;
};

export function NextSessionPanel({ session, timeZone, onSelect, onStarted }: NextSessionPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const msLeft = session ? new Date(session.starts_at).getTime() - now : null;
  const started = msLeft !== null && msLeft <= 0;

  useEffect(() => {
    if (started) onStarted();
  }, [started, onStarted]);

  // En el celular va debajo del calendario y ocupa una sola línea, sin avatar, para dejarle lugar.
  // En PC, en la columna angosta de la derecha, lleva avatar y el tiempo que falta pasa abajo del nombre.
  return (
    <Card size="sm" className="py-0">
      {session === undefined ? (
        <Skeleton className="m-2 h-5 lg:h-10" />
      ) : session === null ? (
        <p className="px-3 py-2 text-sm text-muted-foreground lg:py-3">
          <span className="font-medium text-foreground">Próxima sesión:</span> no hay sesiones agendadas.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(session)}
          className="flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-accent lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-x-3 lg:gap-y-1"
          title="Ver próxima sesión"
        >
          <Avatar className="size-9 max-lg:hidden lg:row-span-2">
            <AvatarFallback className="bg-(--session-next) text-xs text-(--session-next-foreground)">
              {`${session.first_name.charAt(0)}${session.last_name.charAt(0)}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 items-baseline gap-2 lg:grid lg:gap-0">
            <span className="truncate text-sm font-medium">
              {session.first_name} {session.last_name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground lg:truncate">
              <span className="max-lg:hidden">Próxima: </span>
              {formatSessionShort(session.starts_at, timeZone)}
            </span>
          </div>
          <span className="flex w-fit shrink-0 items-center gap-1 rounded-full border border-(--session-next-border) bg-(--session-next) px-2 py-0.5 text-xs font-medium whitespace-nowrap text-(--session-next-foreground) lg:col-start-2">
            <ClockIcon className="size-3" />
            {formatTimeUntil(msLeft ?? 0)}
          </span>
        </button>
      )}
    </Card>
  );
}
