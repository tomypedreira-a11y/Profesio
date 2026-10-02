"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type FullCalendar from "@fullcalendar/react";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { addDays, differenceInCalendarDays, format, isSameMonth, parseISO, startOfWeek } from "date-fns";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TreePalmIcon,
  UserRoundSearchIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { shortName, sortName } from "@/lib/format";
import { dayKey, findVacation, isVacationDay } from "@/lib/vacations";
import { fromWall, todayIn, toWall } from "@/lib/zoned";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVacations } from "@/components/vacations-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddSessionDialog } from "./add-session-dialog";
import { NextSessionPanel } from "./next-session-panel";
import { SessionSheet } from "./session-sheet";
import { UnscheduledPanel, UnscheduledSheet } from "./unscheduled-panel";
import { WeekStrip } from "./week-strip";
import { CalendarGridSkeleton } from "./calendar-skeleton";
import { nextSession as fetchNextSession, sessionsInRange, weekBookings, type InitialCalendarData, type WeekBookings } from "./queries";
import type { CalendarViewPreference } from "@/lib/calendar-views";
import type { CalendarSession, PatientOption, UnscheduledPatient } from "./types";
import "./calendar.css";

// FullCalendar llega aparte y solo en el navegador (import dinámico): mientras tanto se ve el esqueleto de la
// grilla, y el resto de la pantalla ya responde. La descarga empieza apenas se carga este archivo en el navegador
// (no recién después de hidratar la página, que la demoraba).
const loadGrid = () => import("./calendar-grid");
if (typeof window !== "undefined") void loadGrid();
const CalendarGrid = dynamic(loadGrid, { ssr: false });

// Pasado este tiempo, lo que cargó el servidor ya no se usa (ej. al volver atrás, Next muestra la pantalla
// guardada): se vuelve a pedir.
const INITIAL_DATA_MAX_AGE_MS = 60_000;

// Horario visible por defecto; se amplía si hay sesiones fuera de este rango.
const DEFAULT_MIN_HOUR = 8;
const DEFAULT_MAX_HOUR = 22;

type ViewKey = "timeGridDay" | "timeGridWeek" | "timeGridWeekMobile" | "listWeek" | "dayGridMonth";

// Semana en el celular (la semana entera no entra): se ve un día, elegido en la tira de días,
// y las flechas avanzan de a una semana. En la pantalla aparte del celular, la semana es una lista
// por día (en 7 columnas angostas no entraban los nombres), con inicio y fin de cada sesión.
const CUSTOM_VIEWS = {
  timeGridWeekMobile: { type: "timeGrid", duration: { days: 1 }, dateIncrement: { weeks: 1 }, dayHeaders: false },
  listWeek: { displayEventEnd: true },
};

type CalendarViewProps = {
  timeZone: string; // la del perfil: el calendario la usa aunque el dispositivo esté en otra
  patients?: PatientOption[]; // para "Agregar sesión" (solo en la pantalla principal)
  initialView: CalendarViewPreference; // vista elegida en el perfil
  // "browse": pantalla aparte (/calendario/vistas) para mirar cualquier vista desde el celular,
  // sin paneles ni tira de días. Lo que se elige ahí no cambia la pantalla principal.
  mode?: "main" | "browse";
  // Sesiones del rango inicial (y "No agendados" de esta semana), cargadas por la página en el servidor:
  // al abrir no se vuelven a pedir. Las semanas siguientes se piden desde el navegador.
  initialData?: InitialCalendarData;
};

// En el celular la pantalla principal muestra siempre la semana como tira de días (sin importar
// la vista del perfil); las otras vistas se miran en /calendario/vistas. En PC la semana es la grilla de 7 días.
// En la pantalla aparte, la semana es la lista en el celular y la grilla en PC.
function viewFor(type: string, isMobile: boolean, browse: boolean): ViewKey {
  if (browse) {
    if (isMobile && type === "timeGridWeek") return "listWeek";
    if (!isMobile && type === "listWeek") return "timeGridWeek";
  } else if (isMobile) return "timeGridWeekMobile";
  else if (type === "timeGridWeekMobile") return "timeGridWeek";
  return type as ViewKey;
}

// "No agendados": los irregulares sin sesión esa semana, por apellido.
function unscheduledFrom({ irregular, booked }: WeekBookings) {
  const bookedIds = new Set(booked.map((b) => b.patient_id));
  const collator = new Intl.Collator("es");
  return irregular.filter((p) => !bookedIds.has(p.id)).sort((a, b) => collator.compare(sortName(a), sortName(b)));
}

// Sesiones no canceladas de cada día de la semana (su lunes, de reloj), para la tira del celular.
function countsFrom({ booked }: WeekBookings, weekStart: Date, timeZone: string) {
  const counts = Array<number>(7).fill(0);
  for (const b of booked) counts[differenceInCalendarDays(toWall(b.starts_at, timeZone), weekStart)]++;
  return counts;
}

export function CalendarView({ timeZone, patients = [], initialView, mode = "main", initialData }: CalendarViewProps) {
  const browse = mode === "browse";
  const supabase = useRef(createClient()).current;
  const calendarRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();
  const vacations = useVacations();
  // Pantalla aparte en el celular: semana en lista y mes con un punto por sesión.
  const compact = browse && isMobile;
  // Lo que cargó el servidor: lo usa la primera carga de la grilla (y "No agendados", desde el principio).
  // Se descarta al salir de ese rango o al volver a pedir (después de un cambio).
  const initialRef = useRef(initialData ?? null);
  const initialWeek = initialData?.week;

  const [title, setTitle] = useState("");
  const [view, setView] = useState<ViewKey>(initialView);
  // FullCalendar ya montado (hasta entonces, el esqueleto de la grilla).
  const [ready, setReady] = useState(false);
  const [hours, setHours] = useState({ min: DEFAULT_MIN_HOUR, max: DEFAULT_MAX_HOUR });
  const [selected, setSelected] = useState<{ session: CalendarSession; isNext: boolean } | null>(null);
  // Días "de reloj" en la zona del perfil (ver lib/zoned.ts): primer día visible (el elegido en la tira)
  // y lunes de la semana de "No agendados".
  const [day, setDay] = useState<Date | null>(null);
  const [week, setWeek] = useState<Date | null>(() => (initialWeek ? parseISO(initialWeek.start) : null));
  const weekRef = useRef<Date | null>(week);
  const [unscheduled, setUnscheduled] = useState<UnscheduledPatient[]>(() =>
    initialWeek ? unscheduledFrom(initialWeek) : [],
  );
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  // Sesiones no canceladas de cada día de la semana, para la tira del celular (null mientras carga).
  const [weekCounts, setWeekCounts] = useState<number[] | null>(() =>
    initialWeek ? countsFrom(initialWeek, parseISO(initialWeek.start), timeZone) : null,
  );
  // Próxima sesión de todas (undefined mientras carga), para destacarla y mostrarla en el panel.
  const [nextSession, setNextSession] = useState<CalendarSession | null | undefined>(initialData?.next);
  // Panel "Agregar sesión" abierto (con el paciente y la fecha sugeridos, si vienen de "No agendados").
  const [adding, setAdding] = useState<{ patientId?: string; date?: Date } | null>(null);

  const api = () => calendarRef.current?.getApi();
  const handleReady = useCallback(() => setReady(true), []);

  // Al cambiar el tamaño de pantalla (la vista con la que arranca ya la elige viewFor).
  // El cambio va en una microtarea: FullCalendar re-renderiza con flushSync, y React no lo permite
  // dentro de un efecto ("flushSync was called from inside a lifecycle method").
  useEffect(() => {
    queueMicrotask(() => {
      const calendar = calendarRef.current?.getApi();
      if (!calendar) return;
      const type = viewFor(calendar.view.type, isMobile, browse);
      if (type !== calendar.view.type) calendar.changeView(type);
    });
  }, [isMobile, browse, ready]);

  // Carga las sesiones del rango visible. FullCalendar la llama al cambiar de fecha o vista.
  const fetchEvents = useCallback(
    async (info: EventSourceFuncArg): Promise<EventInput[]> => {
      const now = new Date().toISOString();
      // El rango inicial ya lo cargó el servidor. Fuera de ese rango (otra semana u otra vista más amplia),
      // se pide y lo del servidor deja de usarse.
      const initial = initialRef.current;
      const fromServer =
        initial !== null &&
        Date.parse(initial.start) <= info.start.getTime() &&
        info.end.getTime() <= Date.parse(initial.end);
      if (!fromServer) initialRef.current = null;
      const [sessions, next] = fromServer
        ? [
            initial.sessions.filter((s) => {
              const t = Date.parse(s.starts_at);
              return t >= info.start.getTime() && t < info.end.getTime();
            }),
            initial.next,
          ]
        : await Promise.all([
            sessionsInRange(supabase, info.start.toISOString(), info.end.toISOString()),
            fetchNextSession(supabase, now),
          ]);

      // En vacaciones no se muestra ningún paciente de horario fijo: las agendadas ya se quitaron
      // al cargarlas, y las canceladas (que se conservan) se ocultan.
      const list = sessions.filter(
        (s) => !(s.series_id && s.status === "cancelled" && isVacationDay(vacations, toWall(s.starts_at, timeZone))),
      );
      setNextSession(next);

      // Ampliar el horario visible si alguna sesión cae fuera de 8 a 22.
      let min = DEFAULT_MIN_HOUR;
      let max = DEFAULT_MAX_HOUR;
      for (const s of list) {
        const start = toWall(s.starts_at, timeZone);
        const end = toWall(s.ends_at, timeZone);
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
    [supabase, vacations, timeZone],
  );

  // La lista solo muestra los días con eventos: sin esto, un día de vacaciones sin sesiones no aparecería.
  // Cada período va como un evento de día entero, solo en la lista (en las grillas ya se pinta el día).
  const vacationEvents = useMemo<EventInput[]>(
    () =>
      vacations.map((v) => ({
        id: `vacation-${v.id}`,
        title: "Vacaciones",
        start: v.start_date,
        end: dayKey(addDays(parseISO(v.end_date), 1)), // el fin de un evento de día entero no se incluye
        allDay: true,
        classNames: ["vacation-marker"],
        extendedProps: { vacation: true },
      })),
    [vacations],
  );

  // Todas las fuentes de eventos van juntas en eventSources: FullCalendar toma esa lista como completa
  // y quita las que no estén (si las sesiones fueran aparte, por "events", se borraban al cambiar de vista
  // y el calendario quedaba vacío). Cada fuente conserva su identidad, así no se recarga de más.
  const eventSources = useMemo(
    () => (view === "listWeek" ? [fetchEvents, vacationEvents] : [fetchEvents]),
    [view, fetchEvents, vacationEvents],
  );

  // De la semana indicada (su lunes, de reloj): pacientes irregulares activos sin sesión (no cancelada)
  // y sesiones por día. La semana inicial ya vino del servidor (estado inicial de arriba).
  const loadWeek = useCallback(
    async (weekStart: Date) => {
      const bookings = await weekBookings(
        supabase,
        fromWall(weekStart, timeZone).toISOString(),
        fromWall(addDays(weekStart, 7), timeZone).toISOString(),
      );
      // Si mientras tanto se pasó a otra semana, esta respuesta ya no sirve.
      if (weekRef.current?.getTime() !== weekStart.getTime()) return;
      setWeekCounts(countsFrom(bookings, weekStart, timeZone));
      setUnscheduled(unscheduledFrom(bookings));
    },
    [supabase, timeZone],
  );

  // Estable (sin dependencias) porque el panel de próxima sesión la usa en un efecto. Lo que cargó el servidor
  // ya no sirve: después de un cambio (o cuando empieza la próxima sesión) se pide de nuevo.
  const refetchEvents = useCallback(() => {
    initialRef.current = null;
    calendarRef.current?.getApi().refetchEvents();
  }, []);

  // Si los datos del servidor son viejos (ej. al volver atrás, Next muestra la pantalla que tenía guardada),
  // se vuelven a pedir apenas se monta.
  useEffect(() => {
    if (!initialData || Date.now() - initialData.loadedAt < INITIAL_DATA_MAX_AGE_MS) return;
    refetchEvents();
    if (weekRef.current) void loadWeek(weekRef.current);
  }, [initialData, refetchEvents, loadWeek]);

  // Al cambiar de fecha o vista: actualizar el título y la semana de "No agendados".
  // FullCalendar da instantes; acá se pasan a días de reloj de la zona del perfil.
  function handleDatesSet(arg: DatesSetArg) {
    const type = arg.view.type as ViewKey;
    const start = toWall(arg.view.currentStart, timeZone);
    setView(type);
    setDay(start);

    // En la vista mensual se usa la semana actual (si es el mes que se ve) o la primera del mes.
    const today = todayIn(timeZone);
    const reference = type === "dayGridMonth" ? (isSameMonth(today, start) ? today : start) : start;
    const weekStart = startOfWeek(reference, { weekStartsOn: 1 });

    // La semana del celular muestra un solo día, pero el título es el de la semana.
    setTitle(
      type === "timeGridWeekMobile"
        ? arg.view.calendar.formatRange(fromWall(weekStart, timeZone), fromWall(addDays(weekStart, 6), timeZone), {
            year: "numeric",
            month: "short",
            day: "numeric",
            separator: " – ",
          })
        : arg.view.title,
    );

    // "No agendados" y la tira de días son solo de la pantalla principal.
    if (!browse && (!week || weekStart.getTime() !== week.getTime())) {
      weekRef.current = weekStart;
      setWeek(weekStart);
      setWeekCounts(null);
      void loadWeek(weekStart);
    }
  }

  // Cada sesión: la hora y el nombre como texto corrido ("13:00 Juan Sebastian G."). Así siempre se ven
  // la hora y el comienzo del nombre, y si la sesión tiene más alto el nombre sigue en la línea de abajo.
  function renderSession(arg: EventContentArg) {
    if (arg.event.extendedProps.vacation) {
      return (
        <span className="flex items-center gap-1.5 font-medium">
          <TreePalmIcon className="size-4 text-(--vacation-border)" />
          {arg.event.title}
        </span>
      );
    }
    // En la lista la hora tiene su propia columna; en el mes compacto la sesión es solo un punto.
    // Después del nombre, la modalidad: (v) virtual o (p) presencial.
    const { session } = arg.event.extendedProps as { session: CalendarSession };
    const virtual = session.modality === "virtual";
    const modality = (
      <>
        {" "}
        <span className="session-modality" title={virtual ? "Virtual" : "Presencial"}>
          {virtual ? "(v)" : "(p)"}
        </span>
      </>
    );
    if (arg.view.type === "listWeek") return <span className="session-name">{arg.event.title}{modality}</span>;
    if (compact && arg.view.type === "dayGridMonth") return <span className="sr-only">{arg.event.title}</span>;
    return (
      <div className="session-content">
        {arg.timeText && <span className="session-time">{arg.timeText}</span>}
        <span className="session-name">{arg.event.title}{modality}</span>
      </div>
    );
  }

  // Mes compacto: tocar un día (también sobre sus puntos) lo abre en la vista Día.
  function handleDateClick(arg: DateClickArg) {
    if (compact && arg.view.type === "dayGridMonth") openDay(arg.date);
  }

  // El número del día (en el mes) y su nombre (en la lista) llevan al mismo lugar que tocar el día.
  // Sin esto, FullCalendar elige por su cuenta una vista de un día, que no siempre es la vista Día.
  function openDay(date: Date) {
    api()?.changeView("timeGridDay", date);
  }

  function handleEventClick(arg: EventClickArg) {
    if (arg.event.extendedProps.vacation) return;
    // En el mes compacto los puntos no abren la sesión: se entra por el día.
    if (compact && arg.view.type === "dayGridMonth") {
      arg.jsEvent.preventDefault();
      return;
    }
    const { session, isNext } = arg.event.extendedProps as { session: CalendarSession; isNext: boolean };
    setSelected({ session, isNext });
  }

  function refresh() {
    refetchEvents();
    if (week) void loadWeek(week);
  }

  const viewOptions: { key: ViewKey; label: string }[] = [
    { key: "timeGridDay", label: "Día" },
    { key: compact ? "listWeek" : "timeGridWeek", label: "Semana" },
    { key: "dayGridMonth", label: "Mes" },
  ];

  const weekLabel = week ? `${format(week, "dd/MM")} al ${format(addDays(week, 6), "dd/MM")}` : "";
  const scheduleUnscheduled = (p: UnscheduledPatient) =>
    setAdding({ patientId: p.id, date: week && todayIn(timeZone) < week ? week : undefined });

  const pad = (h: number) => `${String(h).padStart(2, "0")}:00:00`;
  // Días de vacaciones: su columna (o su casilla, en el mes) y su encabezado se pintan.
  // El primero y el último llevan el borde de ese lado, así se ve dónde empieza y termina el período.
  const vacationClass = (arg: { date: Date }) => {
    const date = toWall(arg.date, timeZone);
    const vacation = findVacation(vacations, date);
    if (!vacation) return [];
    const day = dayKey(date);
    return [
      "vacation-day",
      ...(day === vacation.start_date ? ["vacation-start"] : []),
      ...(day === vacation.end_date ? ["vacation-end"] : []),
    ];
  };
  // En el mes, el encabezado es el día de la semana (no una fecha): no se pinta.
  const vacationHeaderClass = (arg: { date: Date; view: { type: string } }) =>
    arg.view.type === "dayGridMonth" ? [] : vacationClass(arg);

  return (
    <div className={cn("grid gap-4", !browse && "lg:grid-cols-[minmax(0,1fr)_16rem]")}>
      <div className="flex min-w-0 flex-col gap-3">
        {/* Barra superior: navegación, vistas y título (en celular el título va arriba) */}
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
          {/* En el celular las vistas no se cambian acá: el botón abre la pantalla aparte. */}
          {!browse && (
            <Button
              variant="outline"
              size="icon"
              className="ml-auto md:hidden"
              render={<Link href="/calendario/vistas" />}
              nativeButton={false}
              aria-label="Ver día, semana o mes"
            >
              <CalendarDaysIcon />
            </Button>
          )}
          <div className={cn("flex rounded-full border p-0.5", browse ? "ml-auto" : "max-md:hidden")}>
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
          <div
            className={cn(
              "order-first flex w-full items-center gap-1",
              !browse && "md:order-none md:w-auto md:flex-1",
            )}
          >
            {/* Para volver al calendario está la flecha del encabezado, como en las demás pantallas. */}
            <h2 className="text-lg font-semibold first-letter:uppercase">{title}</h2>
          </div>
          {!browse && (
            <div className="flex w-full gap-2 md:w-auto">
              <Button className="flex-1" onClick={() => setAdding({})}>
                <CalendarPlusIcon />
                Agregar sesión
              </Button>
              {/* En el celular "No agendados" no ocupa lugar arriba: se abre desde acá. */}
              <Button variant="outline" className="flex-1 md:hidden" onClick={() => setShowUnscheduled(true)}>
                <UserRoundSearchIcon />
                Sin agendar
                {unscheduled.length > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                    {unscheduled.length}
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>

        {view === "timeGridWeekMobile" && week && day && (
          <WeekStrip
            weekStart={week}
            selected={day}
            counts={weekCounts}
            today={todayIn(timeZone)}
            isVacation={(d) => isVacationDay(vacations, d)}
            onSelect={(d) => api()?.gotoDate(fromWall(d, timeZone))}
          />
        )}

        <div className={cn(compact && "calendar-compact")}>
          {!ready && <CalendarGridSkeleton view={view} />}
          <CalendarGrid
            calendarRef={calendarRef}
            onReady={handleReady}
            timeZone={timeZone}
            // Cuando monta ya se sabe si es un celular: arranca en la vista que corresponde, sin cambiarla después
            // (así no pide dos veces las sesiones).
            initialView={viewFor(initialView, isMobile, browse)}
            views={CUSTOM_VIEWS}
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
            displayEventEnd={false} // solo la hora de inicio: deja más lugar para el nombre
            eventContent={renderSession}
            dayCellClassNames={vacationClass}
            dayHeaderClassNames={vacationHeaderClass}
            dayHeaderFormat={view === "dayGridMonth" ? { weekday: "short" } : { weekday: "short", day: "numeric" }}
            eventDisplay="block"
            nextDayThreshold="06:00:00" // una sesión que termina de madrugada cuenta como del día anterior
            dayMaxEvents={compact ? false : 3}
            navLinks={compact} // en la lista, el nombre del día abre ese día; en el mes, su número
            navLinkDayClick={openDay}
            noEventsText="No hay sesiones en estos días."
            eventSources={eventSources}
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
          />
        </div>

        {/* Referencia de colores */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border-[1.5px] border-primary-border bg-primary" /> Sesión</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-(--session-next-border) bg-(--session-next)" /> Próxima sesión</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border bg-muted" /> Realizada</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-(--session-cancelled-border) bg-(--session-cancelled)" /> Cancelada</span>
          <span>(p) Presencial · (v) Virtual</span>
          {vacations.length > 0 && (
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm border border-(--vacation-border) bg-(--vacation)" /> Vacaciones</span>
          )}
        </div>
      </div>

      {/* En PC, columna a la derecha; en el celular, debajo del calendario. */}
      {!browse && (
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <NextSessionPanel
            session={nextSession}
            timeZone={timeZone}
            onSelect={(session) => setSelected({ session, isNext: true })}
            onStarted={refetchEvents}
          />
          <div className="max-md:hidden">
            <UnscheduledPanel patients={unscheduled} weekLabel={weekLabel} onSelect={scheduleUnscheduled} />
          </div>
        </div>
      )}

      {!browse && (
        <UnscheduledSheet
          open={showUnscheduled}
          onOpenChange={setShowUnscheduled}
          patients={unscheduled}
          weekLabel={weekLabel}
          onSelect={scheduleUnscheduled}
        />
      )}

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

      {!browse && (
        <AddSessionDialog
          open={!!adding}
          onOpenChange={(open) => !open && setAdding(null)}
          patients={patients}
          patientId={adding?.patientId}
          defaultDate={adding?.date}
          showPatientLink={!!adding?.patientId}
          onAdded={refresh}
        />
      )}
    </div>
  );
}
