"use server";

// Cada opción de Configuración se guarda sola, en cuanto se cambia.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isTheme } from "@/lib/theme";
import { isFontSize } from "@/lib/font-size";
import { isCalendarView } from "@/lib/calendar-views";
import { isSessionLength } from "@/lib/schedule";
import { isModality } from "@/lib/modality";
import { isTimeZone } from "@/lib/timezones";
import { parseFee } from "@/lib/format";
import { isSummaryTime, parseReminder } from "@/lib/notifications";
import { isIdleTimeout } from "@/lib/idle";
import { writeIdleCookies } from "@/lib/idle-cookies";
import type { Database } from "@/lib/database.types";

export type SaveResult = { error?: string };

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

async function saveProfile(changes: ProfileUpdate, revalidate = true): Promise<SaveResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { error: "Tu sesión expiró. Volvé a ingresar." };

  const { error } = await supabase.from("profiles").update(changes).eq("id", userId);
  if (error) return { error: "No se pudo guardar. Volvé a intentar." };

  // El layout carga la duración y el valor por defecto; el calendario, la vista inicial.
  if (revalidate) revalidatePath("/", "layout");
  return {};
}

export async function updateTheme(theme: string): Promise<SaveResult> {
  if (!isTheme(theme)) return { error: "Elegí uno de los modos." };
  // Sin revalidar: el tema ya se aplicó en el navegador y ThemeSync podría pisarlo con uno anterior.
  return saveProfile({ theme }, false);
}

export async function updateFontSize(size: string): Promise<SaveResult> {
  if (!isFontSize(size)) return { error: "Elegí uno de los tamaños." };
  // Sin revalidar, como el tema: ya se aplicó en el navegador.
  return saveProfile({ font_size: size }, false);
}

export async function updateCalendarView(view: string): Promise<SaveResult> {
  if (!isCalendarView(view)) return { error: "Elegí una de las vistas." };
  return saveProfile({ calendar_view: view });
}

export async function updateSessionLength(minutes: string): Promise<SaveResult> {
  const value = Number(minutes);
  if (!isSessionLength(value)) return { error: "Elegí una de las duraciones." };
  return saveProfile({ default_session_minutes: value });
}

// Las sesiones futuras y los horarios fijos conservan su hora de reloj en la zona nueva (set_timezone).
export async function updateTimeZone(timeZone: string): Promise<SaveResult> {
  if (!isTimeZone(timeZone)) return { error: "Elegí una zona horaria." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_timezone", { p_timezone: timeZone });
  if (error) return { error: error.code === "P0001" ? error.message : "No se pudo guardar. Volvé a intentar." };

  // El layout carga la zona (la usan el calendario y los selectores de fecha).
  revalidatePath("/", "layout");
  return {};
}

// La que trae preseleccionada el alta de un paciente; no cambia a los pacientes existentes.
export async function updateDefaultModality(modality: string): Promise<SaveResult> {
  if (!isModality(modality)) return { error: "Elegí presencial o virtual." };
  return saveProfile({ default_modality: modality });
}

// Opcional: vacío = sin valor por defecto.
export async function updateDefaultFee(raw: string): Promise<SaveResult> {
  const fee = parseFee(raw);
  if (fee === "invalid") return { error: "Ingresá un monto válido." };
  return saveProfile({ default_session_fee: fee });
}

// ---------------------------------------------------------------------------
// Vacaciones: llevan botón y confirmación (quitan sesiones del calendario).
// ---------------------------------------------------------------------------

const vacationSchema = z.object({ start: z.iso.date(), end: z.iso.date() }).refine((v) => v.end >= v.start);

// Devuelve cuántas sesiones de horarios fijos se quitaron.
export async function addVacation(input: { start: string; end: string }): Promise<SaveResult & { removed?: number }> {
  const parsed = vacationSchema.safeParse(input);
  if (!parsed.success) return { error: "Elegí el primer y el último día de las vacaciones." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_vacation", { p_start: parsed.data.start, p_end: parsed.data.end });
  // Los errores de la base (superposición, sesiones cobradas) ya vienen explicados.
  if (error) return { error: error.code === "P0001" ? error.message : "No se pudieron cargar las vacaciones." };

  // El layout carga las vacaciones (el calendario las pinta).
  revalidatePath("/", "layout");
  return { removed: data };
}

// Devuelve cuántas sesiones de horarios fijos volvieron al calendario.
export async function removeVacation(id: string): Promise<SaveResult & { restored?: number }> {
  if (!z.uuid().safeParse(id).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_vacation", { p_vacation_id: id });
  if (error) return { error: error.code === "P0001" ? error.message : "No se pudieron quitar las vacaciones." };

  revalidatePath("/", "layout");
  return { restored: data };
}

// ---------------------------------------------------------------------------
// Notificaciones: preferencias de la cuenta (valen para todos los dispositivos). Sin revalidar: solo las lee
// el cron y la propia pantalla de Configuración, que ya muestra el valor nuevo.
// ---------------------------------------------------------------------------

export async function updateReminderMinutes(value: string): Promise<SaveResult> {
  const minutes = parseReminder(value);
  if (minutes === "invalid") return { error: "Elegí una de las opciones." };
  return saveProfile({ reminder_minutes: minutes }, false);
}

export async function updateDailySummaryEnabled(enabled: boolean): Promise<SaveResult> {
  return saveProfile({ daily_summary_enabled: enabled === true }, false);
}

export async function updateDailySummaryTime(time: string): Promise<SaveResult> {
  if (!isSummaryTime(time)) return { error: "Elegí uno de los horarios." };
  return saveProfile({ daily_summary_time: time }, false);
}

export async function updateNotificationShowName(show: boolean): Promise<SaveResult> {
  return saveProfile({ notification_show_name: show === true }, false);
}

// ---------------------------------------------------------------------------
// Cuenta: cierre de sesión por inactividad. Además del perfil, las cookies que lee el proxy
// (y el navegador, en todas las pestañas). Sin revalidar: IdleLogout lee la cookie.
// ---------------------------------------------------------------------------

export async function updateIdleTimeout(value: string): Promise<SaveResult> {
  const minutes = Number(value);
  if (!isIdleTimeout(minutes)) return { error: "Elegí una de las opciones." };
  const result = await saveProfile({ idle_timeout_minutes: minutes }, false);
  if (!result.error) await writeIdleCookies(minutes);
  return result;
}
