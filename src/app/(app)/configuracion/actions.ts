"use server";

// Cada opción de Configuración se guarda sola, en cuanto se cambia.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isTheme } from "@/lib/theme";
import { isFontSize } from "@/lib/font-size";
import { isCalendarView } from "@/lib/calendar-views";
import { isSessionLength } from "@/lib/schedule";
import { parseFee } from "@/lib/format";
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

// Opcional: vacío = sin valor por defecto.
export async function updateDefaultFee(raw: string): Promise<SaveResult> {
  const fee = parseFee(raw);
  if (fee === "invalid") return { error: "Ingresá un monto válido." };
  return saveProfile({ default_session_fee: fee });
}
