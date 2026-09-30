"use client";

// Lista de próximas sesiones agrupadas por día. Tocar una abre el mismo panel que en el calendario.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { VideoIcon } from "lucide-react";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SessionSheet } from "@/components/calendar/session-sheet";
import type { CalendarSession } from "@/components/calendar/types";

type SessionListProps = {
  sessions: CalendarSession[];
  nextId: string | undefined;
  todayKey: string; // "yyyy-MM-dd" calculado en el servidor, así coincide al hidratar
  timeZone: string;
};

export function SessionList({ sessions, nextId, todayKey, timeZone }: SessionListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarSession | null>(null);

  // Agrupar por día (en la zona horaria del psicólogo).
  const groups = new Map<string, CalendarSession[]>();
  for (const s of sessions) {
    const key = formatInTimeZone(s.starts_at, timeZone, "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  return (
    <>
      <div className="flex max-w-2xl flex-col gap-6">
        {[...groups.entries()].map(([day, items]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold first-letter:uppercase">
              {day === todayKey ? "Hoy · " : ""}
              {formatInTimeZone(items[0].starts_at, timeZone, "EEEE d 'de' MMMM", { locale: es })}
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((s) => {
                const cancelled = s.status === "cancelled";
                const isNext = s.id === nextId;
                return (
                  <li key={s.id}>
                    {/* Beige un poco más oscuro que el fondo, remarcado en oliva; próxima y cancelada, con sus colores del calendario. */}
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border-[1.5px] px-4 py-3 text-left transition-[filter] hover:brightness-95",
                        cancelled
                          ? "border-(--session-cancelled-border) bg-(--session-cancelled) text-(--session-cancelled-foreground)"
                          : isNext
                            ? "border-(--session-next-border) bg-(--session-next) text-(--session-next-foreground)"
                            : "border-primary-border bg-secondary text-secondary-foreground",
                      )}
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
                      {isNext && <Badge>Próxima</Badge>}
                    </button>
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
