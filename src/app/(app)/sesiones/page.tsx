import type { Metadata } from "next";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { AddSessionButton } from "@/components/calendar/add-session-button";
import { getPatientOptions, getTimeZone } from "../pacientes/queries";
import "@/components/calendar/calendar.css"; // colores de las sesiones

export const metadata: Metadata = { title: "Sesiones" };

const DAYS_AHEAD = 14;

// Lista de próximas sesiones, agrupadas por día.
export default async function SessionsPage() {
  const supabase = await createClient();
  const [timeZone, patients] = await Promise.all([getTimeZone(), getPatientOptions()]);
  const now = new Date();
  const until = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("calendar_sessions")
    .select("id, patient_id, starts_at, ends_at, status, first_name, last_name")
    .gt("ends_at", now.toISOString())
    .lt("starts_at", until.toISOString())
    .order("starts_at", { ascending: true });

  const sessions = data ?? [];
  const nextId = sessions.find((s) => s.status === "scheduled" && s.starts_at! > now.toISOString())?.id;

  // Agrupar por día (en la zona horaria del psicólogo).
  const groups = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = formatInTimeZone(s.starts_at!, timeZone, "yyyy-MM-dd");
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const todayKey = formatInTimeZone(now, timeZone, "yyyy-MM-dd");

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Sesiones" description={`Próximos ${DAYS_AHEAD} días`} />
        <AddSessionButton patients={patients} />
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No hay sesiones en los próximos {DAYS_AHEAD} días.
        </p>
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold first-letter:uppercase">
                {day === todayKey ? "Hoy · " : ""}
                {formatInTimeZone(items[0].starts_at!, timeZone, "EEEE d 'de' MMMM", { locale: es })}
              </h2>
              <ul className="divide-y rounded-lg border">
                {items.map((s) => {
                  const cancelled = s.status === "cancelled";
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/pacientes/${s.patient_id}`}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                          s.id === nextId && "border-l-4 border-l-(--session-next)",
                        )}
                      >
                        <span className={cn("w-24 shrink-0 text-sm tabular-nums text-muted-foreground", cancelled && "line-through")}>
                          {formatInTimeZone(s.starts_at!, timeZone, "HH:mm")} – {formatInTimeZone(s.ends_at!, timeZone, "HH:mm")}
                        </span>
                        <span className={cn("flex-1 truncate font-medium", cancelled && "text-muted-foreground line-through")}>
                          {s.first_name} {s.last_name}
                        </span>
                        {cancelled && <Badge variant="outline">Cancelada</Badge>}
                        {s.id === nextId && <Badge>Próxima</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
