// Zonas horarias con nombre (ej. "America/Santiago") para FullCalendar, con Intl del navegador.
// Sin un plugin así, FullCalendar no sabe convertir a una zona que no sea la del dispositivo o UTC.
// Es lo mismo que hacen sus plugins oficiales (luxon, moment-timezone), sin sumar dependencias.
import { createPlugin } from "@fullcalendar/core";
import { NamedTimeZoneImpl } from "@fullcalendar/core/internal";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

// Fecha y hora de reloj de un instante en la zona: [año, mes (0-11), día, hora, minuto, segundo, ms].
function wallArray(timeZone: string, ms: number): number[] {
  const parts: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(new Date(ms))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return [parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, ((ms % 1000) + 1000) % 1000];
}

// Diferencia con UTC (en minutos) en un instante.
function offsetAt(timeZone: string, ms: number) {
  const [y, mo, d, h, mi, s, msec] = wallArray(timeZone, ms);
  return (Date.UTC(y, mo, d, h, mi, s, msec) - ms) / 60_000;
}

class IntlNamedTimeZone extends NamedTimeZoneImpl {
  offsetForArray(a: number[]) {
    // La hora de reloj tomada como UTC se corrige con la diferencia de ese momento; una segunda
    // pasada ajusta los días en que cambia el horario de verano.
    const asUtc = Date.UTC(a[0], a[1], a[2] ?? 1, a[3] ?? 0, a[4] ?? 0, a[5] ?? 0, a[6] ?? 0);
    const first = offsetAt(this.timeZoneName, asUtc);
    return offsetAt(this.timeZoneName, asUtc - first * 60_000);
  }

  timestampToArray(ms: number) {
    return wallArray(this.timeZoneName, ms);
  }
}

export const timeZonePlugin = createPlugin({ name: "profesio-time-zone", namedTimeZonedImpl: IntlNamedTimeZone });
