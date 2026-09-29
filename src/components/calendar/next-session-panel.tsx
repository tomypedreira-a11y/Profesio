"use client";

// Tarjeta con la próxima sesión: paciente, fecha y cuánto falta (se actualiza cada minuto).
import { useEffect, useState } from "react";
import { ClockIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Próxima sesión</CardTitle>
      </CardHeader>
      <CardContent>
        {session === undefined ? (
          <Skeleton className="h-12 w-full" />
        ) : session === null ? (
          <p className="text-sm text-muted-foreground">No hay sesiones agendadas.</p>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(session)}
            className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
            title="Ver sesión"
          >
            <Avatar className="size-9">
              <AvatarFallback className="bg-(--session-next) text-xs text-(--session-next-foreground)">
                {`${session.first_name.charAt(0)}${session.last_name.charAt(0)}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 gap-1">
              <span className="truncate text-sm font-medium">
                {session.first_name} {session.last_name}
              </span>
              <span className="truncate text-xs text-muted-foreground first-letter:uppercase">
                {formatSessionShort(session.starts_at, timeZone)}
              </span>
              <span className="flex w-fit items-center gap-1 rounded-full border border-(--session-next-border) bg-(--session-next) px-2 py-0.5 text-xs font-medium text-(--session-next-foreground)">
                <ClockIcon className="size-3" />
                {formatTimeUntil(msLeft ?? 0)}
              </span>
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
}
