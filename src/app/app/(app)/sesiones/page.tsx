import type { Metadata } from "next";
import { startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AddSessionButton } from "@/components/calendar/add-session-button";
import { SESSION_COLUMNS, type CalendarSession } from "@/components/calendar/types";
import { lastSession } from "@/components/calendar/queries";
import { fromWall, toWall } from "@/lib/zoned";
import { getPatientOptions, getTimeZone } from "../pacientes/queries";
import { SessionList } from "./session-list";
import "@/components/calendar/calendar.css"; // colores de las sesiones

export const metadata: Metadata = { title: "Sesiones" };

const DAYS_AHEAD = 14;

type Client = Awaited<ReturnType<typeof createClient>>;

// Desde cuándo se muestran las sesiones ya realizadas (instante ISO), o null si no hay ninguna. Se ve el último día
// con sesiones realizadas; si ese día todavía le quedan sesiones (hoy, a mitad del día), también el anterior
// con sesiones: un día completo queda en la lista hasta que se completa el siguiente.
async function pastFrom(supabase: Client, upcoming: CalendarSession[], now: string, timeZone: string) {
  const last = await lastSession(supabase, now);
  if (!last) return null;
  const dayKey = (iso: string) => formatInTimeZone(iso, timeZone, "yyyy-MM-dd");
  const dayStart = (iso: string) => fromWall(startOfDay(toWall(iso, timeZone)), timeZone).toISOString();

  const lastDay = dayStart(last.starts_at);
  const pending = upcoming.some((s) => s.status === "scheduled" && dayKey(s.starts_at) === dayKey(last.starts_at));
  if (!pending) return lastDay;

  const { data: previous } = await supabase
    .from("calendar_sessions")
    .select("starts_at")
    .eq("status", "scheduled")
    .lt("starts_at", lastDay)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return previous?.starts_at ? dayStart(previous.starts_at) : lastDay;
}

// Lista de sesiones agrupadas por día: las próximas y, en gris, las ya realizadas del último día (ver pastFrom).
export default async function SessionsPage() {
  const supabase = await createClient();
  const now = new Date();
  const until = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  // Las próximas no dependen de la zona horaria (el rango es de instantes): las tres consultas a la vez.
  const [timeZone, patients, { data }] = await Promise.all([
    getTimeZone(),
    getPatientOptions(),
    supabase
      .from("calendar_sessions")
      .select(SESSION_COLUMNS)
      .gt("ends_at", now.toISOString())
      .lt("starts_at", until.toISOString())
      .order("starts_at", { ascending: true }),
  ]);
  const upcoming = (data ?? []) as CalendarSession[];

  // Las realizadas (y canceladas) desde ese día hasta ahora.
  const from = await pastFrom(supabase, upcoming, now.toISOString(), timeZone);
  const { data: pastData } = from
    ? await supabase
        .from("calendar_sessions")
        .select(SESSION_COLUMNS)
        .gte("starts_at", from)
        .lte("ends_at", now.toISOString())
        .order("starts_at", { ascending: true })
    : { data: [] };

  const sessions = [...((pastData ?? []) as CalendarSession[]), ...upcoming];
  const nextId = sessions.find((s) => s.status === "scheduled" && s.starts_at > now.toISOString())?.id;

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
        <SessionList
          sessions={sessions}
          nextId={nextId}
          todayKey={formatInTimeZone(now, timeZone, "yyyy-MM-dd")}
          loadedAt={now.getTime()}
          timeZone={timeZone}
        />
      )}
    </>
  );
}
