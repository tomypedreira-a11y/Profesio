import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AddSessionButton } from "@/components/calendar/add-session-button";
import { SESSION_COLUMNS, type CalendarSession } from "@/components/calendar/types";
import { getPatientOptions, getTimeZone } from "../pacientes/queries";
import { SessionList } from "./session-list";
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
    .select(SESSION_COLUMNS)
    .gt("ends_at", now.toISOString())
    .lt("starts_at", until.toISOString())
    .order("starts_at", { ascending: true });

  const sessions = (data ?? []) as CalendarSession[];
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
          timeZone={timeZone}
        />
      )}
    </>
  );
}
