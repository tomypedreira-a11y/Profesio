// Fechas en la zona horaria del perfil (profiles.timezone), no en la del dispositivo: si el psicólogo
// viaja o tiene el celular en otra zona, la agenda sigue en el horario de su país.
//
// Convención en el navegador: un día u horario "de reloj" se representa con un Date cuyos campos
// locales (año, mes, día, hora) son los de la zona del perfil, como los que devuelve el selector de
// fechas. Así funcionan directo con date-fns (format, addDays, startOfWeek…). Para hablar con
// FullCalendar o con la base se pasa al instante real con fromWall; al revés, con toWall.
import { startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const toWall = (instant: Date | string | number, timeZone: string) => toZonedTime(instant, timeZone);

export const fromWall = (wall: Date, timeZone: string) => fromZonedTime(wall, timeZone);

// Hoy a las 00:00, en la zona del perfil.
export const todayIn = (timeZone: string) => startOfDay(toZonedTime(new Date(), timeZone));
