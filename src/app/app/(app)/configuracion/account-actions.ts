"use server";

// Seguridad de la cuenta: cambiar la contraseña, verificación en dos pasos (MFA con TOTP) y cerrar sesión
// en todos los dispositivos. A diferencia de las demás opciones de Configuración, llevan botón y confirmación.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import { authErrorMessage, newPasswordSchema, passwordErrorMessage } from "@/lib/auth";
import { clearIdleCookies } from "@/lib/idle-cookies";
import { MAX_MFA_FACTORS, mfaErrorMessage, totpCodeSchema, verifyTotp } from "@/lib/mfa";

const SESSION_EXPIRED = "Tu sesión expiró. Volvé a ingresar.";

// ---------------------------------------------------------------------------
// Cambiar la contraseña
// ---------------------------------------------------------------------------

const changePasswordSchema = z
  .object({ current: z.string().min(1, "Ingresá tu contraseña actual.") })
  .and(newPasswordSchema);

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  if (!email) return { error: SESSION_EXPIRED };

  // La contraseña actual se verifica iniciando sesión con un cliente aparte, que no toca las cookies:
  // con el cliente de esta sesión, signInWithPassword la reemplazaría por una nueva (aal1, sin el código).
  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error: currentError } = await verifier.auth.signInWithPassword({ email, password: parsed.data.current });
  if (currentError) {
    return currentError.code === "invalid_credentials"
      ? { fieldErrors: { current: ["La contraseña actual no es correcta."] } }
      : { error: authErrorMessage(currentError.code) };
  }
  await verifier.auth.signOut({ scope: "local" }); // no deja abierta esa sesión de verificación

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: passwordErrorMessage(error.code) };
  return { success: "Contraseña actualizada." };
}

// ---------------------------------------------------------------------------
// Verificación en dos pasos
// ---------------------------------------------------------------------------

export type EnrollResult = { error?: string; factorId?: string; qrCode?: string; secret?: string };

const factorIdSchema = z.uuid();

// Crea un factor sin verificar y devuelve el QR y el código para cargarlo a mano.
export async function startMfaEnrollment(friendlyName: string): Promise<EnrollResult> {
  const name = z.string().trim().min(1).max(40).safeParse(friendlyName);
  if (!name.success) return { error: "Ponele un nombre al dispositivo (ej. «Celular»)." };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: SESSION_EXPIRED };
  if (factors.totp.length >= MAX_MFA_FACTORS) {
    return { error: `Podés registrar hasta ${MAX_MFA_FACTORS} dispositivos.` };
  }

  // Activaciones que quedaron a medias (ej. se cerró la pestaña con el QR abierto): se descartan.
  for (const factor of factors.all.filter((f) => f.status === "unverified")) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: name.data,
    issuer: "Profesio", // el nombre que muestra la app de códigos
  });
  if (error) return { error: mfaErrorMessage(error.code) };
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

// Primer código del dispositivo nuevo. Si es correcto, el factor queda verificado, esta sesión pasa a aal2
// y Supabase cierra las sesiones de los otros dispositivos (van a tener que ingresar con el código).
export async function confirmMfaEnrollment(factorId: string, code: string): Promise<{ error?: string }> {
  const parsedCode = totpCodeSchema.safeParse(code);
  if (!parsedCode.success) return { error: parsedCode.error.issues[0].message };
  if (!factorIdSchema.safeParse(factorId).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { error } = await verifyTotp(supabase, factorId, parsedCode.data);
  if (error) return { error: mfaErrorMessage(error.code) };

  revalidatePath("/app/configuracion");
  return {};
}

// Se cerró la activación sin ingresar el código: se borra el factor. Solo uno sin verificar
// (quitar uno verificado es removeMfaFactor, que puede pedir un código).
export async function cancelMfaEnrollment(factorId: string): Promise<void> {
  if (!factorIdSchema.safeParse(factorId).success) return;
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.all.find((f) => f.id === factorId);
  if (factor?.status === "unverified") await supabase.auth.mfa.unenroll({ factorId });
}

// Quita un dispositivo. Para quitar el último (y así desactivar la verificación) pide un código válido.
export async function removeMfaFactor(factorId: string, code?: string): Promise<{ error?: string }> {
  if (!factorIdSchema.safeParse(factorId).success) return { error: "Datos inválidos." };

  const supabase = await createClient();
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: SESSION_EXPIRED };
  if (!factors.totp.some((f) => f.id === factorId)) return { error: "Ese dispositivo ya no está registrado." };

  if (factors.totp.length === 1) {
    const parsedCode = totpCodeSchema.safeParse(code ?? "");
    if (!parsedCode.success) return { error: parsedCode.error.issues[0].message };
    const { error } = await verifyTotp(supabase, factorId, parsedCode.data);
    if (error) return { error: mfaErrorMessage(error.code) };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: mfaErrorMessage(error.code) };

  revalidatePath("/app/configuracion");
  return {};
}

// ---------------------------------------------------------------------------
// Cerrar sesión en todos los dispositivos (ej. se perdió el celular o se usó una compu compartida).
// Desde el navegador se llama con signOutAllDevices (lib/sign-out.ts).
// ---------------------------------------------------------------------------

export async function signOutEverywhere() {
  const supabase = await createClient();
  // Las notificaciones tampoco siguen llegando a los otros dispositivos (un celular perdido mostraría
  // los recordatorios en la pantalla bloqueada). Cada uno puede volver a activarlas al ingresar.
  await supabase.from("push_subscriptions").delete().not("id", "is", null);
  await supabase.auth.signOut({ scope: "global" });
  await clearIdleCookies();
  redirect("/app/login");
}
