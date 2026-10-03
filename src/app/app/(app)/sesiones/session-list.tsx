"use client";

// Lista de sesiones agrupadas por día, con la sesión en curso arriba (como en el calendario): las próximas y, en
// gris, las ya realizadas del último día con sesiones (las elige la página).
// Tocar una abre el mismo panel que en el calendario.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { VideoIcon } from "lucide-react";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SessionSheet } from "@/components/calendar/session-sheet";
import { CurrentSessionPanel } from "@/components/calendar/next-session-panel";
import { WhatsAppReminderButton } from "@/components/whatsapp-message";
import type { CalendarSession } from "@/components/calendar/types";

type SessionListProps = {
  sessions: CalendarSession[];
  nextId: string | undefined;
  todayKey: string; // "yyyy-MM-dd" calculado en el servidor, así coincide al hidratar
  loadedAt: number; // ms, la hora del servidor: la sesión en curso arranca calculada con ella (igual al hidratar)
  timeZone: string;
};

export function SessionList({ sessions, nextId, todayKey, loadedAt, timeZone }: SessionListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarSession | null>(null);
  // Para saber cuál está en curso y cuáles ya se realizaron: cada 15 s, así la tarjeta aparece poco después de que
  // empieza la sesión.
  const [now, setNow] = useState(loadedAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const current =
    sessions.find(
      (s) => s.status === "scheduled" && Date.parse(s.starts_at) <= now && now < Date.parse(s.ends_at),
    ) ?? null;
  // Al terminar, se vuelve a pedir la lista: si se completó el día, deja de mostrarse el anterior.
  const refresh = useCallback(() => router.refresh(), [router]);

  const yesterdayKey = format(addDays(parseISO(todayKey), -1), "yyyy-MM-dd");

  // Agrupar por día (en la zona horaria del psicólogo).
  const groups = new Map<string, CalendarSession[]>();
  for (const s of sessions) {
    const key = formatInTimeZone(s.starts_at, timeZone, "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  return (
    <>
      <div className="flex max-w-2xl flex-col gap-6">
        <CurrentSessionPanel session={current} timeZone={timeZone} onSelect={setSelected} onEnded={refresh} />
        {[...groups.entries()].map(([day, items]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold first-letter:uppercase">
              {day === todayKey ? "Hoy · " : day === yesterdayKey ? "Ayer · " : ""}
              {formatInTimeZone(items[0].starts_at, timeZone, "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((s) => {
                const cancelled = s.status === "cancelled";
                const isNext = s.id === nextId;
                const inProgress = s.id === current?.id;
                const done = !cancelled && Date.parse(s.ends_at) <= now;
                // Solo las que no empezaron: en curso, la tarjeta de arriba ofrece escribirle si no llegó.
                const reminder = !cancelled && !inProgress && !done && !!s.phone;
                return (
                  // La tarjeta es el <li>: adentro, la fila (abre el panel) y el recordatorio, que es un link y no puede
                  // ir dentro de otro elemento interactivo. Si no entra al lado (celular), baja a una segunda línea.
                  // Beige un poco más oscuro que el fondo, remarcado en oliva; próxima, cancelada y realizada (gris), con sus
                  // colores del calendario.
                  <li
                    key={s.id}
                    className={cn(
                      "flex flex-wrap items-center rounded-lg border-[1.5px] transition-[filter] has-[>button:hover]:brightness-95",
                      cancelled
                        ? "border-(--session-cancelled-border) bg-(--session-cancelled) text-(--session-cancelled-foreground)"
                        : done
                          ? "border-border bg-muted text-muted-foreground"
                          : isNext
                            ? "border-(--session-next-border) bg-(--session-next) text-(--session-next-foreground)"
                            : "border-primary-border bg-secondary text-secondary-foreground",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className="flex min-w-0 grow basis-72 items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={cn("w-24 shrink-0 text-sm tabular-nums opacity-75", cancelled && "line-through")}>
                        {formatInTimeZone(s.starts_at, timeZone, "HH:mm")} – {formatInTimeZone(s.ends_at, timeZone, "HH:mm")}
                      </span>
                      <span className={cn("flex-1 truncate font-medium", cancelled && "line-through")}>
                        {s.first_name} {s.last_name}
                      </span>
                      {s.modality === "virtual" && (
                        <Badge variant="outline">
                          <VideoIcon />
                          Virtual
                        </Badge>
                      )}
                      {cancelled && <Badge variant="outline">Cancelada</Badge>}
                      {done && <Badge variant="outline">{s.waived_at ? "Realizada · sin cargo" : "Realizada"}</Badge>}
                      {inProgress && <Badge>En curso</Badge>}
                      {isNext && <Badge>Próxima</Badge>}
                    </button>
                    {reminder && <WhatsAppReminderButton session={s} className="mr-3 mb-3 ml-auto sm:mb-0" />}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <SessionSheet
        session={selected}
        isNext={selected?.id === nextId}
        timeZone={timeZone}
        onOpenChange={(open) => !open && setSelected(null)}
        onChanged={() => {
          // Como en el calendario: al reprogramar o cancelar se cierra el panel y se actualiza la lista.
          setSelected(null);
          router.refresh();
        }}
      />
    </>
  );
}
