// Cierre de sesión por inactividad: cookies y opciones compartidas por el proxy (que lo aplica), las acciones
// (que escriben las cookies al iniciar sesión o cambiar la preferencia) y el navegador (IdleLogout).
// Las cookies no son httpOnly: el navegador actualiza la actividad. Lo único que se puede hacer con eso es
// extender la propia sesión, no la de otro.

export const LAST_ACTIVITY_COOKIE = "profesio_last_activity"; // timestamp en ms
export const IDLE_TIMEOUT_COOKIE = "profesio_idle_timeout"; // minutos

export const DEFAULT_IDLE_MINUTES = 30;

// Sin opción "nunca": con datos clínicos siempre hay límite (la base lo exige con un check).
export const IDLE_TIMEOUTS = [
  { value: "15", label: "15 minutos" },
  { value: "30", label: "30 minutos" },
  { value: "60", label: "1 hora" },
  { value: "120", label: "2 horas" },
  { value: "240", label: "4 horas" },
] as const;

export function isIdleTimeout(minutes: number) {
  return IDLE_TIMEOUTS.some((t) => Number(t.value) === minutes);
}

// Minutos de la cookie; si falta o no es válida, el valor por defecto.
export function parseIdleMinutes(raw: string | undefined) {
  const minutes = Number(raw);
  return isIdleTimeout(minutes) ? minutes : DEFAULT_IDLE_MINUTES;
}

// Persistentes (como las de la sesión de Supabase): si fueran de sesión del navegador, al cerrarlo y volver
// a abrirlo desaparecería la última actividad y no se podría saber cuánto tiempo pasó.
export const IDLE_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 400 * 24 * 60 * 60,
} as const;

// Motivo del cierre, para el mensaje del login.
export const IDLE_LOGOUT_REASON = "inactividad";
