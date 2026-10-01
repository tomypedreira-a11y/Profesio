// Mensajes de los errores de Supabase Auth y validación de contraseñas (login, registro, recuperación y Configuración).
import { z } from "zod";

// Traduce los errores de Supabase Auth a mensajes para el usuario.
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam).";
    case "user_already_exists":
      return "Ya existe una cuenta con ese email.";
    // En prod está activado "Prevent use of leaked passwords": el mínimo de largo ya lo valida Zod antes.
    case "weak_password":
      return "Esa contraseña es muy común o apareció en filtraciones de datos. Elegí otra.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y volvé a probar.";
    default:
      return "Algo salió mal. Volvé a intentar en unos minutos.";
  }
}

// Al guardar una contraseña nueva (recuperación o cambio desde Configuración).
export function passwordErrorMessage(code: string | undefined): string {
  switch (code) {
    case "same_password":
      return "La contraseña nueva tiene que ser distinta de la anterior.";
    case "reauthentication_needed":
    case "insufficient_aal":
      return "Por seguridad, cerrá sesión y volvé a ingresar antes de cambiar la contraseña.";
    default:
      return authErrorMessage(code);
  }
}

export const passwordSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.");

// Contraseña nueva, escrita dos veces.
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden." });
