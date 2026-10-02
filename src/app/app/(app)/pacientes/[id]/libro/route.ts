// Descarga del libro de sesiones de un paciente en PDF (copia de la historia clínica, Ley 26.529).
// Lee con la sesión del usuario (RLS, como siempre); el proxy ya exigió sesión, inactividad y código MFA.
// Entran solo las anotaciones finalizadas (la versión vigente de cada sesión), nunca los borradores.
// El PDF se arma en memoria y se entrega: no se guarda en ningún lado y se pide que nadie lo guarde (no-store).
// Cada descarga queda en audit_log (log_patient_export); si no se puede registrar, no se entrega.
import type { NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { z } from "zod";
import { createClient, getProfile } from "@/lib/supabase/server";
import { fullName } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { modalityLabel } from "@/lib/modality";
import { DEFAULT_TIME_ZONE } from "@/lib/timezones";
import { renderSessionBook, type SessionBookEntry } from "@/lib/pdf/session-book";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request: NextRequest, ctx: RouteContext<"/app/pacientes/[id]/libro">) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response("No encontrado", { status: 404, headers: NO_STORE });

  const supabase = await createClient();
  // Todo a la vez: si el paciente es de otro psicólogo, las RLS vacían las anotaciones y el 404 lo descarta.
  const [profile, { data: patient }, { data: notes, error: notesError }] = await Promise.all([
    getProfile(),
    supabase
      .from("patients")
      .select("first_name, last_name, dni, birth_date, phone, email, modality")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("session_notes")
      .select("session_id, content, version, finalized_at, sessions!inner(starts_at, modality, patient_id)")
      .eq("status", "final")
      .eq("sessions.patient_id", id),
  ]);
  if (!profile) return new Response("Sesión vencida", { status: 401, headers: NO_STORE });
  if (!patient) return new Response("No encontrado", { status: 404, headers: NO_STORE });
  if (notesError) return new Response("Error", { status: 500, headers: NO_STORE });

  const timeZone = profile.timezone ?? DEFAULT_TIME_ZONE;
  const at = (iso: string, pattern: string) => formatInTimeZone(iso, timeZone, pattern, { locale: es });

  // La versión vigente de cada sesión: la finalizada más nueva (una corrección en borrador no cuenta).
  const current = new Map<string, NonNullable<typeof notes>[number]>();
  for (const note of notes ?? []) {
    const previous = current.get(note.session_id);
    if (!previous || note.version > previous.version) current.set(note.session_id, note);
  }

  const entries: SessionBookEntry[] = [...current.values()]
    .sort((a, b) => a.sessions.starts_at.localeCompare(b.sessions.starts_at))
    .map((note) => {
      const date = at(note.sessions.starts_at, "EEEE d 'de' MMMM 'de' yyyy · HH:mm");
      return {
        date: date.charAt(0).toUpperCase() + date.slice(1),
        details: [
          // La sesión guarda su modalidad si se cambió; si no, es la del paciente.
          modalityLabel(note.sessions.modality ?? patient.modality),
          note.version > 1 && note.finalized_at ? `Corregida el ${at(note.finalized_at, "dd/MM/yyyy")}` : "",
        ].filter(Boolean),
        content: note.content,
      };
    });

  const birthDate = patient.birth_date?.split("-").reverse().join("/");
  const details = [
    { label: "Nombre", value: patient.first_name },
    { label: "Apellido", value: patient.last_name },
    { label: "DNI", value: patient.dni },
    { label: "Fecha de nacimiento", value: birthDate },
    { label: "Teléfono", value: formatPhone(patient.phone) },
    { label: "Email", value: patient.email },
  ].filter((d): d is { label: string; value: string } => Boolean(d.value));

  const now = new Date().toISOString();
  const pdf = await renderSessionBook({
    professional: { name: fullName(profile), license: profile.license_number?.trim() || null },
    patient: { name: fullName(patient), details },
    entries,
    generatedAt: at(now, "dd/MM/yyyy HH:mm"),
  });

  // Recién con el PDF listo: si no se puede registrar, no se entrega.
  const { error: logError } = await supabase.rpc("log_patient_export", { p_patient_id: id });
  if (logError) return new Response("Error", { status: 500, headers: NO_STORE });

  return new Response(new Uint8Array(pdf), {
    headers: {
      ...NO_STORE,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName(patient, at(now, "yyyy-MM-dd"))}"`,
    },
  });
}

// libro-apellido-nombre-AAAA-MM-DD.pdf, sin tildes ni espacios (sin apellido: libro-nombre-…).
function fileName(patient: { first_name: string; last_name: string }, date: string) {
  const slug = [patient.last_name, patient.first_name]
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `libro-${slug || "paciente"}-${date}.pdf`;
}
