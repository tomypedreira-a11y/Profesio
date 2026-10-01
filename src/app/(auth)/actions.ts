"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isTimeZone } from "@/lib/timezones";
import { createClient } from "@/lib/supabase/server";
import { formValues, type FormState } from "@/lib/form-state";
import { authErrorMessage, newPasswordSchema, passwordErrorMessage, passwordSchema } from "@/lib/auth";
import { clearIdleCookies, startIdleTracking } from "@/lib/idle-cookies";
import { IDLE_LOGOUT_REASON } from "@/lib/idle";
import { mfaErrorMessage, totpCodeSchema, verifyTotp } from "@/lib/mfa";
import { safeNextPath } from "@/lib/safe-path";
import { APP_HOME } from "@/lib/routes";
import { TERMS_VERSION } from "@/lib/legal";

const loginSchema = z.object({
  email: z.email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

const signupSchema = z.object({
  first_name: z.string().trim().min(1, "Ingresá tu nombre."),
  last_name: z.string().trim().min(1, "Ingresá tu apellido."),
  email: z.email("Ingresá un email válido."),
  password: passwordSchema,
  // La del navegador (campo oculto). Si no llega o no es válida, el perfil queda en la zona por defecto.
  timezone: z.string().optional().transform((tz) => (isTimeZone(tz) ? tz : undefined)),
  // Casilla obligatoria. La aceptación (versión y fecha) la guarda handle_new_user en el perfil.
  terms: z.literal("accepted", { error: "Para crear la cuenta, aceptá los Términos y la Política de privacidad." }),
});

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

  await startIdleTracking(supabase);

  // Con la verificación en dos pasos activada, falta el código.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/login/verificar");
  }

  redirect(APP_HOME);
}

// Segundo paso del login: el código de la app. Con dos dispositivos registrados, vale el de cualquiera.
export async function verifyLoginCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = totpCodeSchema.safeParse(formData.get("code") ?? "");
  if (!parsed.success) {
    return { fieldErrors: { code: [parsed.error.issues[0].message] } };
  }

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError || factors.totp.length === 0) {
    return { error: "Tu sesión expiró. Volvé a ingresar." };
  }

  let failure: string | undefined;
  for (const factor of factors.totp) {
    const { error } = await verifyTotp(supabase, factor.id, parsed.data);
    failure = error?.code ?? (error ? "unknown" : undefined);
    if (!failure || failure === "over_request_rate_limit") break;
  }
  if (failure) {
    return { error: mfaErrorMessage(failure) };
  }

  // Ahora sí se puede leer el perfil: arranca el conteo con el límite elegido.
  await startIdleTracking(supabase);
  redirect(safeNextPath(String(formData.get("next") ?? "")));
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
      data: { first_name, last_name, timezone, terms_version: TERMS_VERSION },
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

// ---------------------------------------------------------------------------
// Recuperar la contraseña
// ---------------------------------------------------------------------------

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = z.object({ email: z.email("Ingresá un email válido.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  // El resultado no se muestra: siempre el mismo mensaje, para no revelar qué emails tienen cuenta.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/nueva-contrasena`,
  });

  return { success: "Si existe una cuenta con ese email, te enviamos un link para crear una contraseña nueva." };
}

// Con la sesión que abrió el link de recuperación.
export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: passwordErrorMessage(error.code) };
  }
  return { success: "Contraseña actualizada." };
}

// ---------------------------------------------------------------------------
// Cerrar sesión
// ---------------------------------------------------------------------------

// Solo esta sesión. Desde el navegador se llama con signOutThisDevice (lib/sign-out.ts), que antes
// guarda lo pendiente y desuscribe las notificaciones de este dispositivo.
export async function logout(reason?: string) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  await clearIdleCookies();
  redirect(reason === IDLE_LOGOUT_REASON ? `/login?motivo=${IDLE_LOGOUT_REASON}` : "/login");
}
