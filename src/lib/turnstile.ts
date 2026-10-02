// Captcha (Cloudflare Turnstile) del login, el registro, la recuperación y el cambio de contraseña.
// Lo verifica Supabase Auth (captchaToken): la secret key está solo en Supabase. Sin la clave pública (ej. contra
// el Supabase local, que no pide captcha), el widget no se muestra y los formularios no lo exigen.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

// Nombre del campo oculto con el token que llega a la Server Action.
export const CAPTCHA_FIELD = "captchaToken";

export function captchaToken(formData: FormData) {
  const token = formData.get(CAPTCHA_FIELD);
  return typeof token === "string" && token ? token : undefined;
}
