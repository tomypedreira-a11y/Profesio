// Zonas horarias para elegir en Configuración, por país. Los países con más de un huso se eligen por
// ciudad. Los valores son nombres IANA (los que guarda profiles.timezone y valida la base).
export const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

export const TIME_ZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Argentina" },
  { value: "America/La_Paz", label: "Bolivia" },
  { value: "America/Sao_Paulo", label: "Brasil (São Paulo, Río de Janeiro)" },
  { value: "America/Manaus", label: "Brasil (Manaos)" },
  { value: "America/Santiago", label: "Chile" },
  { value: "America/Bogota", label: "Colombia" },
  { value: "America/Costa_Rica", label: "Costa Rica" },
  { value: "America/Havana", label: "Cuba" },
  { value: "America/Guayaquil", label: "Ecuador" },
  { value: "America/El_Salvador", label: "El Salvador" },
  { value: "Europe/Madrid", label: "España" },
  { value: "Atlantic/Canary", label: "España (Canarias)" },
  { value: "America/New_York", label: "Estados Unidos (Nueva York, Miami)" },
  { value: "America/Chicago", label: "Estados Unidos (Chicago, Houston)" },
  { value: "America/Denver", label: "Estados Unidos (Denver)" },
  { value: "America/Los_Angeles", label: "Estados Unidos (Los Ángeles)" },
  { value: "America/Guatemala", label: "Guatemala" },
  { value: "America/Tegucigalpa", label: "Honduras" },
  { value: "Europe/Rome", label: "Italia" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Cancun", label: "México (Cancún)" },
  { value: "America/Tijuana", label: "México (Tijuana)" },
  { value: "America/Managua", label: "Nicaragua" },
  { value: "America/Panama", label: "Panamá" },
  { value: "America/Asuncion", label: "Paraguay" },
  { value: "America/Lima", label: "Perú" },
  { value: "America/Puerto_Rico", label: "Puerto Rico" },
  { value: "America/Santo_Domingo", label: "República Dominicana" },
  { value: "America/Montevideo", label: "Uruguay" },
  { value: "America/Caracas", label: "Venezuela" },
] as const;

// Para mostrar la zona guardada aunque no esté en la lista (ej. la detectó el navegador al registrarse).
export function timeZoneItems(current: string) {
  const known = TIME_ZONES.some((z) => z.value === current);
  return known ? [...TIME_ZONES] : [...TIME_ZONES, { value: current, label: current.replaceAll("_", " ") }];
}

// Nombres IANA válidos en este entorno (Node o navegador).
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value === "") return false;
  try {
    new Intl.DateTimeFormat("es", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
