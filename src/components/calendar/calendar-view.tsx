"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import esLocale from "@fullcalendar/core/locales/es";
import type { DatesSetArg, EventClickArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { addDays, format, isSameMonth, startOfWeek } from "date-fns";
import { CalendarPlusIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { shortName, sortName } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { AddSessionDialog } from "./add-session-dialog";
import { NextSessionPanel } from "./next-session-panel";
import { SessionSheet } from "./session-sheet";
import { UnscheduledPanel } from "./unscheduled-panel";
import type { CalendarViewPreference } from "@/lib/calendar-views";
import type { CalendarSession, PatientOption, UnscheduledPatient } from "./types";
import "./calendar.css";

const SESSION_COLUMNS =
  "id, patient_id, series_id, starts_at, ends_at, status, rescheduled_from, first_name, last_name, phone, series_active";

// Horario visible por defecto; se amplía si hay sesiones fuera de este rango.
const DEFAULT_MIN_HOUR = 8;
const DEFAULT_MAX_HOUR = 22;

type ViewKey = "timeGridDay" | "timeGridThreeDay" | "timeGridWeek" | "dayGridMonth";

type CalendarViewProps = {
  timeZone: string;
  patients: PatientOption[];
  initialView: CalendarViewPreference; // vista elegida en el perfil
};

export function CalendarView({ timeZone, patients, initialView }: CalendarViewProps) {
  const supabase = useRef(createClient()).current;
  const calendarRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();

  const [title, setTitle] = useState("");
  const [view, setView] = useState<ViewKey>(initialView);
  const [hours, setHours] = useState({ min: DEFAULT_MIN_HOUR, max: DEFAULT_MAX_HOUR });
  const [selected, setSelected] = useState<{ session: CalendarSession; isNext: boolean } | null>(null);
  const [week, setWeek] = useState<Date | null>(null);
  const [unscheduled, setUnscheduled] = useState<UnscheduledPatient[]>([]);
  // Próxima sesión de todas (undefined mientras carga), para destacarla y mostrarla en el panel.
  const [nextSession, setNextSession] = useState<CalendarSession | null | undefined>(undefined);
  // Panel "Agregar sesión" abierto (con el paciente y la fecha sugeridos, si vienen de "No agendados").
  const [adding, setAdding] = useState<{ patientId?: string; date?: Date } | null>(null);

  const api = () => calendarRef.current?.getApi();

  // En el celular, si la vista inicial es la semana, se muestran 3 días (la semana entera no entra).
  const adjustedForMobile = useRef(false);
  useEffect(() => {
    if (isMobile && !adjustedForMobile.current) {
      adjustedForMobile.current = true;
      if (initialView === "timeGridWeek") api()?.changeView("timeGridThreeDay");
    }
  }, [isMobile, initialView]);

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
        // La próxima sesión (no cancelada) de todas, para destacarla y mostrarla en el panel.
        supabase
          .from("calendar_sessions")
          .select(SESSION_COLUMNS)
          .eq("status", "scheduled")
          .gt("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const list = (sessions ?? []) as CalendarSession[];
      setNextSession((next as CalendarSession | null) ?? null);

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
      // Las horas se rotulan de a 2: el rango arranca y termina en hora par para leer 08, 10, 12…
      min -= min % 2;
      max += max % 2;
      setHours((h) => (h.min === min && h.max === max ? h : { min, max }));

      return list.map((s) => {
        const isNext = s.id === next?.id;
        const classNames = ["session"];
        if (s.status === "cancelled") classNames.push("session-cancelled");
        else if (isNext) classNames.push("session-next");
        if (s.ends_at < now) classNames.push("session-past");
        return {
          id: s.id,
          title: shortName(s),
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
          .sort((a, b) => collator.compare(sortName(a), sortName(b))),
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

  // Estable (sin dependencias) porque el panel de próxima sesión la usa en un efecto.
  const refetchEvents = useCallback(() => calendarRef.current?.getApi().refetchEvents(), []);

  function refresh() {
    refetchEvents();
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
          <div className="ml-auto flex rounded-full border p-0.5 sm:ml-0">
            {viewOptions.map((o) => (
              <Button
                key={o.key}
                size="sm"
                variant={view === o.key ? "default" : "ghost"}
                onClick={() => api()?.changeView(o.key)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <Button onClick={() => setAdding({})}>
            <CalendarPlusIcon />
            Agregar sesión
          </Button>
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin]}
          locale={esLocale}
          initialView={initialView}
          views={{ timeGridThreeDay: { type: "timeGrid", duration: { days: 3 } } }}
          headerToolbar={false}
          height="auto"
          allDaySlot={false}
          nowIndicator
          slotMinTime={pad(hours.min)}
          slotMaxTime={pad(hours.max)}
          slotDuration="01:00:00"
          slotLabelInterval="02:00:00" // grilla compacta: una fila por hora, rótulo cada 2
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
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-[1.5px] border-primary-border bg-primary" /> Sesión</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-(--session-next-border) bg-(--session-next)" /> Próxima sesión</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border bg-muted" /> Realizada</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-(--session-cancelled-border) bg-(--session-cancelled)" /> Cancelada</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4 max-lg:order-first lg:sticky lg:top-4 lg:self-start">
        <NextSessionPanel
          session={nextSession}
          timeZone={timeZone}
          onSelect={(session) => setSelected({ session, isNext: true })}
          onStarted={refetchEvents}
        />
        <UnscheduledPanel
          patients={unscheduled}
          weekLabel={week ? `${format(week, "dd/MM")} al ${format(addDays(week, 6), "dd/MM")}` : ""}
          onSelect={(p) => setAdding({ patientId: p.id, date: week && new Date() < week ? week : undefined })}
        />
      </div>

      <SessionSheet
        session={selected?.session ?? null}
        isNext={selected?.isNext ?? false}
        timeZone={timeZone}
        onOpenChange={(open) => !open && setSelected(null)}
        onChanged={() => {
          setSelected(null);
          refresh();
        }}
      />

      <AddSessionDialog
        open={!!adding}
        onOpenChange={(open) => !open && setAdding(null)}
        patients={patients}
        patientId={adding?.patientId}
        defaultDate={adding?.date}
        showPatientLink={!!adding?.patientId}
        onAdded={refresh}
      />
    </div>
  );
}
