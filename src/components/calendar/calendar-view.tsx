"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import type { DatesSetArg, EventClickArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { addDays, format, isSameMonth, startOfWeek } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ScheduleSessionDialog } from "./schedule-session-dialog";
import { SessionSheet } from "./session-sheet";
import { UnscheduledPanel } from "./unscheduled-panel";
import type { CalendarSession, UnscheduledPatient } from "./types";
import "./calendar.css";

const SESSION_COLUMNS = "id, patient_id, series_id, starts_at, ends_at, status, rescheduled_from, first_name, last_name, phone";

// Horario visible por defecto; se amplía si hay sesiones fuera de este rango.
const DEFAULT_MIN_HOUR = 8;
const DEFAULT_MAX_HOUR = 22;

type ViewKey = "timeGridDay" | "timeGridThreeDay" | "timeGridWeek" | "dayGridMonth";

export function CalendarView({ timeZone }: { timeZone: string }) {
  const supabase = useRef(createClient()).current;
  const calendarRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();

  const [title, setTitle] = useState("");
  const [view, setView] = useState<ViewKey>("timeGridWeek");
  const [hours, setHours] = useState({ min: DEFAULT_MIN_HOUR, max: DEFAULT_MAX_HOUR });
  const [selected, setSelected] = useState<{ session: CalendarSession; isNext: boolean } | null>(null);
  const [week, setWeek] = useState<Date | null>(null);
  const [unscheduled, setUnscheduled] = useState<UnscheduledPatient[]>([]);
  const [toSchedule, setToSchedule] = useState<UnscheduledPatient | null>(null);

  const api = () => calendarRef.current?.getApi();

  // En el celular, la vista inicial muestra 3 días en lugar de la semana completa.
  const adjustedForMobile = useRef(false);
  useEffect(() => {
    if (isMobile && !adjustedForMobile.current) {
      adjustedForMobile.current = true;
      api()?.changeView("timeGridThreeDay");
    }
  }, [isMobile]);

  // Carga las sesiones del rango visible. FullCalendar la llama al cambiar de fecha o vista.
  const fetchEvents = useCallback(
    async (info: EventSourceFuncArg): Promise<EventInput[]> => {
      const now = new Date().toISOString();
      const [{ data: sessions }, { data: next }] = await Promise.all([
        supabase
          .from("calendar_sessions")
          .select(SESSION_COLUMNS)
          .gte("starts_at", info.start.toISOString())
          .lt("starts_at", info.end.toISOString()),
        // La próxima sesión (no cancelada) de todas, para destacarla.
        supabase
          .from("sessions")
          .select("id")
          .eq("status", "scheduled")
          .gt("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const list = (sessions ?? []) as CalendarSession[];

      // Ampliar el horario visible si alguna sesión cae fuera de 8 a 22.
      let min = DEFAULT_MIN_HOUR;
      let max = DEFAULT_MAX_HOUR;
      for (const s of list) {
        const start = new Date(s.starts_at);
        const end = new Date(s.ends_at);
        min = Math.min(min, start.getHours());
        // Si la sesión termina después de medianoche, se muestra hasta las 24.
        const endHour = end.getDate() !== start.getDate() ? 24 : end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
        max = Math.max(max, endHour);
      }
      setHours((h) => (h.min === min && h.max === max ? h : { min, max }));

      return list.map((s) => {
        const isNext = s.id === next?.id;
        const classNames = ["session"];
        if (s.status === "cancelled") classNames.push("session-cancelled");
        else if (isNext) classNames.push("session-next");
        if (s.ends_at < now) classNames.push("session-past");
        return {
          id: s.id,
          title: `${s.first_name} ${s.last_name.charAt(0)}.`,
          start: s.starts_at,
          end: s.ends_at,
          classNames,
          extendedProps: { session: s, isNext },
        };
      });
    },
    [supabase],
  );

  // Pacientes irregulares activos sin sesión (no cancelada) en la semana indicada.
  const loadUnscheduled = useCallback(
    async (weekStart: Date) => {
      const weekEnd = addDays(weekStart, 7);
      const [{ data: irregular }, { data: booked }] = await Promise.all([
        supabase.from("patient_list").select("id, first_name, last_name").eq("active", true).is("weekday", null),
        supabase
          .from("sessions")
          .select("patient_id")
          .eq("status", "scheduled")
          .gte("starts_at", weekStart.toISOString())
          .lt("starts_at", weekEnd.toISOString()),
      ]);
      const bookedIds = new Set((booked ?? []).map((b) => b.patient_id));
      const collator = new Intl.Collator("es");
      setUnscheduled(
        ((irregular ?? []) as UnscheduledPatient[])
          .filter((p) => !bookedIds.has(p.id))
          .sort((a, b) => collator.compare(a.last_name, b.last_name)),
      );
    },
    [supabase],
  );

  // Al cambiar de fecha o vista: actualizar el título y la semana de "No agendados".
  function handleDatesSet(arg: DatesSetArg) {
    setTitle(arg.view.title);
    setView(arg.view.type as ViewKey);

    // En la vista mensual se usa la semana actual (si es el mes que se ve) o la primera del mes.
    const today = new Date();
    const reference =
      arg.view.type === "dayGridMonth"
        ? isSameMonth(today, arg.view.currentStart) ? today : arg.view.currentStart
        : arg.view.currentStart;
    const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
    if (!week || weekStart.getTime() !== week.getTime()) {
      setWeek(weekStart);
      void loadUnscheduled(weekStart);
    }
  }

  function handleEventClick(arg: EventClickArg) {
    const { session, isNext } = arg.event.extendedProps as { session: CalendarSession; isNext: boolean };
    setSelected({ session, isNext });
  }

  function refresh() {
    api()?.refetchEvents();
    if (week) void loadUnscheduled(week);
  }

  const viewOptions: { key: ViewKey; label: string }[] = [
    { key: "timeGridDay", label: "Día" },
    ...(isMobile ? [{ key: "timeGridThreeDay" as ViewKey, label: "3 días" }] : []),
    { key: "timeGridWeek", label: "Semana" },
    { key: "dayGridMonth", label: "Mes" },
  ];

  const pad = (h: number) => `${String(h).padStart(2, "0")}:00:00`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex min-w-0 flex-col gap-3">
        {/* Barra superior: navegación, título y vistas */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => api()?.prev()} aria-label="Anterior">
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon" onClick={() => api()?.next()} aria-label="Siguiente">
              <ChevronRightIcon />
            </Button>
            <Button variant="outline" onClick={() => api()?.today()}>
              Hoy
            </Button>
          </div>
          <h2 className="order-first w-full text-lg font-semibold first-letter:uppercase sm:order-none sm:w-auto sm:flex-1">{title}</h2>
          <div className="ml-auto flex rounded-lg border p-0.5 sm:ml-0">
            {viewOptions.map((o) => (
              <Button
                key={o.key}
                size="sm"
                variant={view === o.key ? "secondary" : "ghost"}
                onClick={() => api()?.changeView(o.key)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin]}
          locale={esLocale}
          initialView="timeGridWeek"
          views={{ timeGridThreeDay: { type: "timeGrid", duration: { days: 3 } } }}
          headerToolbar={false}
          height="auto"
          allDaySlot={false}
          nowIndicator
          slotMinTime={pad(hours.min)}
          slotMaxTime={pad(hours.max)}
          slotDuration="00:30:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          dayHeaderFormat={view === "dayGridMonth" ? { weekday: "short" } : { weekday: "short", day: "numeric" }}
          eventDisplay="block"
          nextDayThreshold="06:00:00" // una sesión que termina de madrugada cuenta como del día anterior
          dayMaxEvents={3}
          events={fetchEvents}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
        />

        {/* Referencia de colores */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-primary" /> Sesión</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-(--session-next)" /> Próxima sesión</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border bg-muted" /> Cancelada</span>
        </div>
      </div>

      <div className="max-lg:order-first">
        <UnscheduledPanel
          patients={unscheduled}
          weekLabel={week ? `${format(week, "dd/MM")} al ${format(addDays(week, 6), "dd/MM")}` : ""}
          onSelect={setToSchedule}
        />
      </div>

      <SessionSheet
        session={selected?.session ?? null}
        isNext={selected?.isNext ?? false}
        timeZone={timeZone}
        onOpenChange={(open) => !open && setSelected(null)}
      />

      <ScheduleSessionDialog
        patient={toSchedule ? { id: toSchedule.id, name: `${toSchedule.first_name} ${toSchedule.last_name}` } : null}
        defaultDate={week && new Date() < week ? week : undefined}
        onOpenChange={(open) => !open && setToSchedule(null)}
        onScheduled={refresh}
      />
    </div>
  );
}
