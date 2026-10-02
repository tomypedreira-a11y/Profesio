"use client";

// FullCalendar con sus plugins, en un archivo aparte para cargarlo con import dinámico (calendar-view.tsx):
// es lo más pesado de la app, y así no frena la carga del resto (barra, paneles, menú) mientras llega.
import { useLayoutEffect, useState, type Ref } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { CalendarOptions } from "@fullcalendar/core";
import { timeZonePlugin } from "./time-zone-plugin";

const PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, timeZonePlugin];

type CalendarGridProps = Omit<CalendarOptions, "plugins" | "locale"> & {
  calendarRef: Ref<FullCalendar>;
  // Se llama apenas está montado (antes de pintar), para sacar el esqueleto sin que se vean los dos.
  onReady: () => void;
};

export default function CalendarGrid({ calendarRef, onReady, ...options }: CalendarGridProps) {
  // La vista inicial es la del primer render: después las cambia calendar-view.tsx (changeView).
  const [initialView] = useState(options.initialView);
  useLayoutEffect(() => onReady(), [onReady]);
  return <FullCalendar ref={calendarRef} plugins={PLUGINS} locale={esLocale} {...options} initialView={initialView} />;
}
