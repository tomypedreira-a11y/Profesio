// Validación del formulario de paciente. Se usa en el servidor (acciones).
import { z } from "zod";
import { isCountryCode, normalizePhone } from "@/lib/phone";

// Texto opcional: "" → null.
const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

// "DD/MM/AAAA" → "AAAA-MM-DD". Devuelve null si la fecha no existe, es futura o muy antigua.
function parseBirthDate(raw: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const exists = date.getFullYear() === Number(yyyy) && date.getMonth() === Number(mm) - 1 && date.getDate() === Number(dd);
  if (!exists || Number(yyyy) < 1900 || date > new Date()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

// Acepta "25000", "25.000", "25.000,50", "$ 25000".
function parseFee(raw: string): number | null | "invalid" {
  let v = raw.replace(/[$\s]/g, "");
  if (v === "") return null;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : "invalid";
}

export const patientSchema = z
  .object({
    first_name: z.string().trim().min(1, "Ingresá el nombre."),
    last_name: z.string().trim().min(1, "Ingresá el apellido."),
    schedule_type: z.enum(["fixed", "irregular"]),
    weekday: z.string().optional(),
    start_time: z.string().optional(),
    phone_country: z.string().refine(isCountryCode, "País inválido."),
    phone: z.string().trim(),
    dni: optionalText.pipe(
      z.string().regex(/^[0-9A-Za-z.\- ]{5,20}$/, "Revisá el documento.").nullable(),
    ),
    email: optionalText.pipe(z.email("Ingresá un email válido.").nullable()),
    birth_date: z.string().trim(),
    session_fee: z.string(),
  })
  .transform((data, ctx) => {
    // Horario fijo: día y hora obligatorios.
    let weekday: number | null = null;
    let startTime: string | null = null;
    if (data.schedule_type === "fixed") {
      const d = data.weekday ? Number(data.weekday) : NaN; // "" no es domingo (0)
      if (!Number.isInteger(d) || d < 0 || d > 6) {
        ctx.addIssue({ code: "custom", path: ["weekday"], message: "Elegí el día." });
      } else weekday = d;
      if (!data.start_time || !/^\d{2}:\d{2}$/.test(data.start_time)) {
        ctx.addIssue({ code: "custom", path: ["start_time"], message: "Elegí el horario." });
      } else startTime = data.start_time;
    }

    // Teléfono (opcional): se normaliza a formato internacional.
    let phone: string | null = null;
    if (data.phone !== "") {
      phone = isCountryCode(data.phone_country) ? normalizePhone(data.phone, data.phone_country) : null;
      if (!phone) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Revisá el número y el país." });
      }
    }

    // Fecha de nacimiento (opcional), escrita como DD/MM/AAAA.
    let birthDate: string | null = null;
    if (data.birth_date !== "") {
      birthDate = parseBirthDate(data.birth_date);
      if (!birthDate) {
        ctx.addIssue({ code: "custom", path: ["birth_date"], message: "Ingresá una fecha válida (DD/MM/AAAA)." });
      }
    }

    // Valor por sesión (opcional).
    const fee = parseFee(data.session_fee);
    if (fee === "invalid") {
      ctx.addIssue({ code: "custom", path: ["session_fee"], message: "Ingresá un monto válido." });
    }

    // Formato de los parámetros de create_patient / update_patient.
    // undefined = "sin dato" (la base lo guarda como null).
    return {
      p_first_name: data.first_name,
      p_last_name: data.last_name,
      p_phone: phone ?? undefined,
      p_dni: data.dni ?? undefined,
      p_email: data.email ?? undefined,
      p_birth_date: birthDate ?? undefined,
      p_session_fee: typeof fee === "number" ? fee : undefined,
      p_weekday: weekday ?? undefined,
      p_start_time: startTime ?? undefined,
    };
  });
