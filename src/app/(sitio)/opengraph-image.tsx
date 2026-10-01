// Imagen para compartir la página promocional (WhatsApp, redes, buscadores). Se genera al compilar.
// Colores de la paleta (globals.css) y la "P" provisoria de los íconos (scripts/generate-icons.mjs).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Profesio · Tu nueva agenda, moderna.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#faf3e5"; // beige (--background del tema claro)
const FOREGROUND = "#3b3026"; // marrón (--foreground)
const MUTED = "#7a6a58"; // --muted-foreground
const PRIMARY = "#9ccd9c"; // verde salvia (--primary)
const PRIMARY_DARK = "#122d19";

export default async function Image() {
  // Lora, la de los títulos (licencia OFL, la misma que usa el script de íconos).
  const lora = await readFile(join(process.cwd(), "scripts/fonts/Lora-SemiBold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: BACKGROUND,
          color: FOREGROUND,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
              background: PRIMARY,
              color: PRIMARY_DARK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Lora",
              fontSize: 64,
            }}
          >
            P
          </div>
          <div style={{ fontFamily: "Lora", fontSize: 56 }}>Profesio</div>
        </div>
        <div style={{ fontFamily: "Lora", fontSize: 84, marginTop: 56, lineHeight: 1.1 }}>Tu nueva agenda, moderna.</div>
        <div style={{ fontSize: 34, marginTop: 28, color: MUTED, maxWidth: 900, lineHeight: 1.35 }}>
          Sesiones, pacientes y anotaciones en un solo lugar, desde la compu o el celular.
        </div>
        <div style={{ display: "flex", marginTop: 48, height: 10, width: 220, borderRadius: 5, background: PRIMARY }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Lora", data: lora, style: "normal", weight: 600 }] },
  );
}
