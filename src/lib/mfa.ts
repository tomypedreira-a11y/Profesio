// Verificación en dos pasos (TOTP): validación del código y mensajes, compartidos por el login y Configuración.
import { z } from "zod";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// Dos dispositivos: el celular y uno de respaldo por si se pierde.
export const MAX_MFA_FACTORS = 2;

// Se aceptan espacios ("123 456", como lo muestran algunas apps).
export const totpCodeSchema = z
  .string()
  .transform((code) => code.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Ingresá los 6 números del código."));

export function mfaErrorMessage(code: string | undefined): string {
  switch (code) {
    case "mfa_verification_failed":
    case "mfa_challenge_expired":
      return "El código no es correcto o ya venció. Probá con el que muestra ahora la app.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y volvé a probar.";
    case "mfa_factor_name_conflict":
      return "Ya tenés un dispositivo con ese nombre. Elegí otro.";
    case "too_many_enrolled_mfa_factors":
      return `Podés registrar hasta ${MAX_MFA_FACTORS} dispositivos.`;
    case "mfa_totp_enroll_not_enabled":
    case "mfa_totp_verify_not_enabled":
      return "La verificación en dos pasos no está habilitada. Escribinos para activarla.";
    case "insufficient_aal":
      return "Por seguridad, cerrá sesión y volvé a ingresar con tu código antes de hacer este cambio.";
    default:
      return "Algo salió mal. Volvé a intentar en unos minutos.";
  }
}

// Verifica un código contra un factor (challenge + verify). Si sale bien, la sesión pasa a aal2.
export async function verifyTotp(supabase: ServerClient, factorId: string, code: string) {
  const { data: challenge, error } = await supabase.auth.mfa.challenge({ factorId });
  if (error) return { error };
  const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  return { error: verifyError };
}
