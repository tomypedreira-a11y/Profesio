"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formValues, type FormState } from "@/lib/form-state";

// Las preferencias (tema, calendario, sesiones) se guardan desde Configuración: ver configuracion/actions.ts.
const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Ingresá tu nombre."),
  last_name: z.string().trim().min(1, "Ingresá tu apellido."),
  license_number: z.string().trim().max(50, "La matrícula es demasiado larga."),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { error: "Tu sesión expiró. Volvé a ingresar.", values };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      license_number: parsed.data.license_number || null,
    })
    .eq("id", userId);

  if (error) return { error: "No se pudo guardar el perfil. Volvé a intentar.", values };

  revalidatePath("/", "layout"); // actualiza el nombre en el panel lateral
  return { success: "Perfil actualizado.", values };
}
