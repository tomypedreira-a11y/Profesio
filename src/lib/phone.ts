// Teléfonos: se guardan en formato internacional (E.164), ej: +5491123456789.
// Así sirven directo para el link de WhatsApp y para importar contactos.
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export const DEFAULT_COUNTRY: CountryCode = "AR";

// Lista de países para el selector: Argentina primero, el resto por nombre.
export function countryOptions() {
  const names = new Intl.DisplayNames(["es"], { type: "region" });
  const all = getCountries().map((code) => ({
    code,
    label: `${names.of(code) ?? code} (+${getCountryCallingCode(code)})`,
  }));
  all.sort((a, b) => a.label.localeCompare(b.label, "es"));
  const ar = all.find((c) => c.code === DEFAULT_COUNTRY)!;
  return [ar, ...all.filter((c) => c.code !== DEFAULT_COUNTRY)];
}

export function isCountryCode(value: string): value is CountryCode {
  return (getCountries() as string[]).includes(value);
}

// Convierte lo que escribió el usuario a E.164. Devuelve null si no es válido.
// Acepta cualquier formato: "11 2345-6789", "011 15 2345-6789", "+54 9 11 ...".
export function normalizePhone(input: string, country: CountryCode): string | null {
  const parsed = parsePhoneNumberFromString(input, country);
  if (!parsed || !parsed.isValid()) return null;
  let e164 = parsed.number as string;

  // Argentina: WhatsApp necesita el 9 de celular (+54 9 ...). Si no se escribió el 15
  // ni el 9, el número se interpreta como fijo; asumimos que es un celular.
  if (e164.startsWith("+54") && !e164.startsWith("+549")) {
    const mobile = parsePhoneNumberFromString(`+549${e164.slice(3)}`);
    if (mobile?.isValid()) e164 = mobile.number as string;
  }
  return e164;
}

// "+5491123456789" → "+54 9 11 2345-6789" (formato legible).
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

// Separa un teléfono guardado en país + número, para el formulario de edición.
export function splitPhone(e164: string | null | undefined): { country: CountryCode; national: string } {
  const parsed = e164 ? parsePhoneNumberFromString(e164) : undefined;
  if (!parsed) return { country: DEFAULT_COUNTRY, national: "" };
  return { country: parsed.country ?? DEFAULT_COUNTRY, national: parsed.formatNational() };
}

// Link directo a un chat de WhatsApp. Con `text`, el chat abre con ese mensaje escrito (sin enviar).
export function whatsappUrl(e164: string, text?: string): string {
  const url = `https://wa.me/${e164.replace(/\D/g, "")}`;
  return text ? `${url}?text=${encodeURIComponent(text)}` : url;
}
