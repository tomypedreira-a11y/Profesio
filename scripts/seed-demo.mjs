// Crea (o recrea) la cuenta demo@miprofesio.com en profesio-dev con datos INVENTADOS, para las capturas de la
// página promocional (scripts/landing-screenshots.mjs). Ningún dato real: nombres, teléfonos y textos son ficticios.
//
// Uso: node scripts/seed-demo.mjs
//
// - SOLO dev: se niega a correr si NEXT_PUBLIC_SUPABASE_URL (de .env.local) no es la de profesio-dev.
// - Usa la secret key de .env.local solo para crear el usuario (ya confirmado). Los datos los carga el propio
//   usuario demo con la clave pública, como la app: pasan por RLS, las funciones y los triggers de siempre.
// - La contraseña del demo no va al repo: se toma de DEMO_PASSWORD en .env.local o se genera y se agrega ahí.
// - Recrear: un usuario con anotaciones finalizadas no se puede borrar (Ley 26.529, trigger de session_notes),
//   así que el demo anterior se "jubila": pasa a un email de example.com y queda bloqueado.
// - Las fechas son relativas a hoy (zona de Buenos Aires): correrlo justo antes de sacar las capturas.
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { addDays, addWeeks, format, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const DEV_PROJECT_REF = "oyxxbgfysapoqiiibfzu";
const DEMO_EMAIL = "demo@miprofesio.com";
const TZ = "America/Argentina/Buenos_Aires";
const ENV_FILE = fileURLToPath(new URL("../.env.local", import.meta.url));

// ---------------------------------------------------------------------------------------------------------------
// Entorno y seguridad
// ---------------------------------------------------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(ENV_FILE, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (new URL(url).hostname !== `${DEV_PROJECT_REF}.supabase.co`) {
  console.error(`Este script solo corre contra profesio-dev (${DEV_PROJECT_REF}). NEXT_PUBLIC_SUPABASE_URL apunta a otro proyecto.`);
  process.exit(1);
}

let password = env.DEMO_PASSWORD;
if (!password) {
  password = randomBytes(18).toString("base64url");
  appendFileSync(ENV_FILE, `\n# Contraseña de demo@miprofesio.com en dev (scripts/seed-demo.mjs)\nDEMO_PASSWORD=${password}\n`);
  console.log("Se generó DEMO_PASSWORD y se guardó en .env.local.");
}

const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------------------------------------------
// Usuario: jubilar el anterior y crear uno nuevo
// ---------------------------------------------------------------------------------------------------------------
const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const previous = list.users.find((u) => u.email === DEMO_EMAIL);
if (previous) {
  const retired = `demo-anterior-${Date.now()}@example.com`;
  const { error } = await admin.auth.admin.updateUserById(previous.id, {
    email: retired,
    email_confirm: true,
    ban_duration: "876000h", // 100 años: no se puede volver a ingresar
  });
  if (error) throw error;
  console.log(`Demo anterior jubilado como ${retired}.`);
}

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email: DEMO_EMAIL,
  password,
  email_confirm: true,
  user_metadata: { first_name: "Ana", last_name: "Ejemplo", timezone: TZ, terms_version: "2026-10-01" },
});
if (createError) throw createError;
console.log(`Usuario ${DEMO_EMAIL} creado.`);

// Desde acá, como el usuario demo (RLS).
const db = createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error: signInError } = await db.auth.signInWithPassword({ email: DEMO_EMAIL, password });
if (signInError) throw signInError;

const check = (result, what) => {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
};

check(
  await db
    .from("profiles")
    .update({ theme: "light", default_session_minutes: 50, default_session_fee: 25000, license_number: "MP 00000 (ficticia)" })
    .eq("id", created.user.id),
  "perfil",
);

// ---------------------------------------------------------------------------------------------------------------
// Pacientes ficticios. weekday: 0 = domingo … 6 = sábado.
// ---------------------------------------------------------------------------------------------------------------
const PATIENTS = [
  { first: "Martina", last: "Ejemplo", modality: "in_person", schedules: [{ weekday: 1, start_time: "09:00" }, { weekday: 4, start_time: "09:00" }] },
  { first: "Julián", last: "Prueba", modality: "virtual", schedules: [{ weekday: 2, start_time: "10:00" }] },
  { first: "Sofía", last: "Ficticia", modality: "in_person", schedules: [{ weekday: 3, start_time: "11:00" }] },
  { first: "Lucas", last: "Inventado", modality: "virtual", schedules: [{ weekday: 4, start_time: "15:00" }] },
  { first: "Valentina", last: "Demo", modality: "in_person", schedules: [{ weekday: 5, start_time: "09:30" }] },
  { first: "Mateo", last: "Ejemplar", modality: "in_person", schedules: [{ weekday: 1, start_time: "17:00" }] },
  { first: "Camila", last: "Muestra", modality: "in_person", fee: 30000, schedules: [{ weekday: 2, start_time: "18:00" }] },
  { first: "Lara", last: "Ficción", modality: "virtual", schedules: [{ weekday: 3, start_time: "18:30" }] },
  { first: "Nicolás", last: "Supuesto", modality: "in_person", schedules: [{ weekday: 5, start_time: "12:00" }] },
  { first: "Bruno", last: "Simulado", modality: "in_person", schedules: [] }, // irregular: sesiones sueltas
];

const patients = [];
for (const [i, p] of PATIENTS.entries()) {
  const id = check(
    await db.rpc("create_patient_with_schedules", {
      p_first_name: p.first,
      p_last_name: p.last,
      // Teléfonos inventados (rango 5555 de ejemplo) y emails de example.com.
      p_phone: `+54911555501${String(i).padStart(2, "0")}`,
      p_email: `${p.first.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")}@example.com`,
      p_session_fee: p.fee ?? null,
      p_schedules: p.schedules,
      p_modality: p.modality,
    }),
    `paciente ${p.first}`,
  );
  patients.push({ ...p, id });
}
console.log(`${patients.length} pacientes ficticios.`);

// ---------------------------------------------------------------------------------------------------------------
// Sesiones pasadas (las de los horarios fijos se generan desde hoy): 3 semanas atrás y lo que ya pasó de esta.
// ---------------------------------------------------------------------------------------------------------------
const now = new Date();
const todayWall = new Date(`${formatInTimeZone(now, TZ, "yyyy-MM-dd")}T00:00:00`);
const monday = startOfWeek(todayWall, { weekStartsOn: 1 });
const at = (day, time) => fromZonedTime(`${format(day, "yyyy-MM-dd")}T${time}:00`, TZ);

const past = []; // { id, patient, startsAt }
for (const p of patients) {
  for (const s of p.schedules) {
    for (let w = -3; w <= 0; w++) {
      const day = addDays(addWeeks(monday, w), (s.weekday + 6) % 7);
      const startsAt = at(day, s.start_time);
      if (startsAt >= now) continue;
      const result = await db.from("sessions").insert({ patient_id: p.id, starts_at: startsAt.toISOString() }).select("id").single();
      if (result.error?.code === "23P01") continue; // ya generada por el horario fijo
      past.push({ id: check(result, "sesión pasada").id, patient: p, startsAt });
    }
  }
}

// Bruno (irregular): una sesión suelta hace dos semanas y otra esta semana, el miércoles a las 16.
const bruno = patients.find((p) => p.first === "Bruno");
for (const day of [addDays(addWeeks(monday, -2), 2), addDays(monday, 2)]) {
  const startsAt = at(day, "16:00");
  const id = check(
    await db.rpc("schedule_session", { p_patient_id: bruno.id, p_date: format(day, "yyyy-MM-dd"), p_time: "16:00" }),
    "sesión suelta",
  );
  if (startsAt < now) past.push({ id, patient: bruno, startsAt });
}
past.sort((a, b) => a.startsAt - b.startsAt);
console.log(`${past.length} sesiones pasadas.`);

// ---------------------------------------------------------------------------------------------------------------
// Canceladas: una pasada y dos futuras.
// ---------------------------------------------------------------------------------------------------------------
const future = check(
  await db.from("sessions").select("id, patient_id, starts_at").gt("starts_at", now.toISOString()).eq("status", "scheduled").order("starts_at").limit(30),
  "sesiones futuras",
);
const cancelled = [past[Math.floor(past.length / 2)].id, future[3]?.id, future[9]?.id].filter(Boolean);
for (const id of cancelled) check(await db.from("sessions").update({ status: "cancelled" }).eq("id", id), "cancelar");
console.log(`${cancelled.length} sesiones canceladas.`);

// ---------------------------------------------------------------------------------------------------------------
// Anotaciones (texto genérico y ficticio): finalizadas las de las semanas anteriores, borrador la más reciente.
// ---------------------------------------------------------------------------------------------------------------
const NOTE_TEXTS = [
  "Texto de demostración. Sesión de seguimiento: se retomaron los temas de la semana anterior y se acordaron objetivos para las próximas sesiones.",
  "Texto de demostración. Se trabajó sobre la organización de la rutina diaria. Buena disposición durante la sesión.",
  "Texto de demostración. Se revisaron los avances desde el último encuentro. Se propone continuar con la misma frecuencia.",
];
const held = past.filter((s) => !cancelled.includes(s.id));
let notes = 0;
for (const [i, s] of held.entries()) {
  if (i % 3 === 2) continue; // no todas tienen anotación
  const isLast = i >= held.length - 2;
  check(
    await db.from("session_notes").insert({ session_id: s.id, content: NOTE_TEXTS[i % NOTE_TEXTS.length], status: isLast ? "draft" : "final" }),
    "anotación",
  );
  notes++;
}
console.log(`${notes} anotaciones.`);

// ---------------------------------------------------------------------------------------------------------------
// Cobros: casi todas las realizadas (las últimas, sin cobrar: aparecen en "Adeudan") y una futura por adelantado.
// ---------------------------------------------------------------------------------------------------------------
const toPay = held.slice(0, -4);
const cash = toPay.filter((_, i) => i % 2 === 0).map((s) => s.id);
const transfer = toPay.filter((_, i) => i % 2 === 1).map((s) => s.id);
check(await db.rpc("mark_sessions_paid", { p_session_ids: cash, p_method: "cash" }), "cobros en efectivo");
check(await db.rpc("mark_sessions_paid", { p_session_ids: transfer, p_method: "transfer" }), "cobros por transferencia");
if (future[0]) check(await db.rpc("mark_sessions_paid", { p_session_ids: [future[0].id], p_method: "transfer" }), "cobro adelantado");
console.log(`${toPay.length + (future[0] ? 1 : 0)} sesiones cobradas.`);

await db.auth.signOut({ scope: "local" });
console.log(`Listo. Ingresá como ${DEMO_EMAIL} con DEMO_PASSWORD (.env.local).`);
