// Consultas del calendario, las mismas desde el servidor (la carga inicial, calendario/page.tsx) y desde el
// navegador (al cambiar de semana o después de un cambio): reciben el cliente de Supabase que corresponda.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SESSION_COLUMNS, type CalendarSession, type UnscheduledPatient } from "./types";

type Client = SupabaseClient<Database>;

// Sesiones que empiezan en el rango [start, end) (instantes ISO).
export async function sessionsInRange(supabase: Client, start: string, end: string): Promise<CalendarSession[]> {
  const { data } = await supabase
    .from("calendar_sessions")
    .select(SESSION_COLUMNS)
    .gte("starts_at", start)
    .lt("starts_at", end);
  return (data ?? []) as CalendarSession[];
}

// La próxima sesión (no cancelada) de todas, para destacarla y mostrarla en el panel.
export async function nextSession(supabase: Client, now: string): Promise<CalendarSession | null> {
  const { data } = await supabase
    .from("calendar_sessions")
    .select(SESSION_COLUMNS)
    .eq("status", "scheduled")
    .gt("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as CalendarSession | null) ?? null;
}

// Para "No agendados" y la tira de días: pacientes irregulares activos y sesiones (no canceladas) de la semana.
export async function weekBookings(supabase: Client, start: string, end: string) {
  const [{ data: irregular }, { data: booked }] = await Promise.all([
    supabase.from("patient_list").select("id, first_name, last_name").eq("active", true).is("weekday", null),
    supabase
      .from("sessions")
      .select("patient_id, starts_at")
      .eq("status", "scheduled")
      .gte("starts_at", start)
      .lt("starts_at", end),
  ]);
  return { irregular: (irregular ?? []) as UnscheduledPatient[], booked: booked ?? [] };
}

export type WeekBookings = Awaited<ReturnType<typeof weekBookings>>;

// Lo que la página carga en el servidor para que el calendario se vea con sus sesiones sin esperar al navegador.
export type InitialCalendarData = {
  loadedAt: number; // ms: si el navegador la muestra mucho después (ej. al volver atrás), se vuelve a pedir
  start: string; // rango de sesiones cargado [start, end), instantes ISO
  end: string;
  sessions: CalendarSession[];
  next: CalendarSession | null;
  week?: { start: string } & WeekBookings; // start: lunes de la semana, "yyyy-MM-dd" de reloj
};
