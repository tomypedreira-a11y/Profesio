// Capturas de la app para la página promocional, con la cuenta demo de dev (datos inventados).
//
// Uso:
//   node scripts/seed-demo.mjs                      (datos frescos: las fechas son relativas a hoy)
//   npm run build && npm run start                  (en otra terminal; contra profesio-dev, como .env.local)
//   node scripts/landing-screenshots.mjs
//
// Usa el Edge o el Chrome instalados (playwright-core, sin descargar navegadores). Otro: BROWSER=chrome.
// Guarda en public/landing/*.webp (van en el repo): calendario en la compu, ficha de paciente y calendario en
// el celular, en tema claro. Si cambian los tamaños, actualizar width/height en src/app/(sitio)/page.tsx.
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DEMO_EMAIL = "demo@miprofesio.com";
const OUT = fileURLToPath(new URL("../public/landing/", import.meta.url));

const env = Object.fromEntries(
  readFileSync(fileURLToPath(new URL("../.env.local", import.meta.url)), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);
if (!env.DEMO_PASSWORD) {
  console.error("Falta DEMO_PASSWORD en .env.local: corré primero node scripts/seed-demo.mjs.");
  process.exit(1);
}
try {
  await fetch(`${BASE}/login`);
} catch {
  console.error(`No responde ${BASE}: levantá la app con npm run build && npm run start.`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: process.env.BROWSER === "chrome" ? "chrome" : "msedge" });

async function session(options) {
  const context = await browser.newContext({ locale: "es-AR", timezoneId: "America/Argentina/Buenos_Aires", colorScheme: "light", ...options });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill("#email", DEMO_EMAIL);
  await page.fill("#password", env.DEMO_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/calendario`);
  return { context, page };
}

// Espera a que el calendario cargue sus sesiones y a que terminen las animaciones.
async function settle(page) {
  await page.locator(".fc-event").first().waitFor({ timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
}

async function save(page, name) {
  const png = await page.screenshot({ animations: "disabled" });
  await sharp(png).webp({ quality: 82 }).toFile(`${OUT}${name}.webp`);
  console.log(`public/landing/${name}.webp`);
}

await mkdir(OUT, { recursive: true });

// Compu: calendario (semana) y ficha de un paciente.
{
  const { context, page } = await session({ viewport: { width: 1440, height: 900 } });
  await settle(page);
  await save(page, "calendario-pc");

  await page.goto(`${BASE}/pacientes`);
  await page.getByRole("link", { name: /Martina/ }).first().click();
  await page.waitForURL(/\/pacientes\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await save(page, "paciente");
  await context.close();
}

// Celular: calendario (tira de días).
{
  const { context, page } = await session({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await settle(page);
  await save(page, "calendario-celular");
  await context.close();
}

await browser.close();
