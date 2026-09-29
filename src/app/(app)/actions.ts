"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formValues, type FormState } from "@/lib/form-state";
import { isTheme } from "@/lib/theme";
import { isSessionLength } from "@/lib/schedule";
import { parseFee } from "@/lib/format";
import { isCalendarView } from "@/lib/calendar-views";

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Ingresá tu nombre."),
  last_name: z.string().trim().min(1, "Ingresá tu apellido."),
  license_number: z.string().trim().max(50, "La matrícula es demasiado larga."),
  default_session_minutes: z.coerce.number().refine(isSessionLength, "Elegí una de las duraciones."),
  calendar_view: z.string().refine(isCalendarView, "Elegí una de las vistas."),
  // Opcional: vacío = sin valor por defecto.
  default_session_fee: z.string().transform((raw, ctx) => {
    const fee = parseFee(raw);
    if (fee === "invalid") {
      ctx.addIssue({ code: "custom", message: "Ingresá un monto válido." });
      return z.NEVER;
    }
    return fee;
  }),
});

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub };
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { supabase, userId } = await currentUserId();
  if (!userId) return { error: "Tu sesión expiró. Volvé a ingresar.", values };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      license_number: parsed.data.license_number || null,
      default_session_minutes: parsed.data.default_session_minutes,
      default_session_fee: parsed.data.default_session_fee,
      calendar_view: parsed.data.calendar_view,
    })
    .eq("id", userId);

  if (error) return { error: "No se pudo guardar el perfil. Volvé a intentar.", values };

  revalidatePath("/", "layout"); // actualiza el nombre en el panel lateral y la duración de las sesiones
  return { success: "Perfil actualizado.", values };
}

export async function updateTheme(theme: string) {
  if (!isTheme(theme)) return;
  const { supabase, userId } = await currentUserId();
  if (!userId) return;
  await supabase.from("profiles").update({ theme }).eq("id", userId);
}
