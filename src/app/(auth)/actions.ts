"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isTimeZone } from "@/lib/timezones";
import { createClient } from "@/lib/supabase/server";
import { formValues, type FormState } from "@/lib/form-state";

const loginSchema = z.object({
  email: z.email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

const signupSchema = z.object({
  first_name: z.string().trim().min(1, "Ingresá tu nombre."),
  last_name: z.string().trim().min(1, "Ingresá tu apellido."),
  email: z.email("Ingresá un email válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  // La del navegador (campo oculto). Si no llega o no es válida, el perfil queda en la zona por defecto.
  timezone: z.string().optional().transform((tz) => (isTimeZone(tz) ? tz : undefined)),
});

// Traduce los errores de Supabase Auth a mensajes para el usuario.
function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam).";
    case "user_already_exists":
      return "Ya existe una cuenta con ese email.";
    case "weak_password":
      return "La contraseña es demasiado débil. Probá con una más larga.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y volvé a probar.";
    default:
      return "Algo salió mal. Volvé a intentar en unos minutos.";
  }
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: authErrorMessage(error.code), values };
  }

  redirect("/");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { email, password, first_name, last_name, timezone } = parsed.data;
  const origin = (await headers()).get("origin") ?? "";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Los usa el trigger handle_new_user para completar el perfil.
      data: { first_name, last_name, timezone },
      // A dónde lleva el link del mail de confirmación.
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });
  if (error) {
    return { error: authErrorMessage(error.code), values };
  }

  return {
    success: `Te enviamos un mail a ${email}. Abrí el link para confirmar tu cuenta.`,
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
