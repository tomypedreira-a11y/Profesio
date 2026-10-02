// Imagen para compartir la página promocional (WhatsApp, redes, buscadores). Se genera al compilar.
// Colores de la paleta (globals.css) y el árbol de los íconos (scripts/generate-icons.mjs).
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
const TREE = "#0a4a26"; // verde del logo (el de los íconos)

export default async function Image() {
  // Lora, la de los títulos (licencia OFL, en scripts/fonts).
  const lora = await readFile(join(process.cwd(), "scripts/fonts/Lora-SemiBold.ttf"));
  // El árbol del logo (vectorial, fill="currentColor": se le pone el verde del logo).
  const svg = await readFile(join(process.cwd(), "scripts/logo/arbol.svg"), "utf8");
  const colored = svg.replace("<svg ", `<svg color="${TREE}" `);
  const tree = `data:image/svg+xml;base64,${Buffer.from(colored).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          // Todo tiene que entrar en los 630 px de alto: si no, el título se comprime y se superpone con el texto.
          padding: "48px 96px",
          background: BACKGROUND,
          color: FOREGROUND,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo acepta <img> */}
          <img src={tree} width={91} height={100} alt="" />
          <div style={{ fontFamily: "Lora", fontSize: 56 }}>Profesio</div>
        </div>
        <div style={{ fontFamily: "Lora", fontSize: 84, marginTop: 44, lineHeight: 1.1 }}>Tu nueva agenda, moderna.</div>
        <div style={{ fontSize: 34, marginTop: 28, color: MUTED, maxWidth: 900, lineHeight: 1.35 }}>
          Sesiones, pacientes y anotaciones en un solo lugar, desde la compu o el celular.
        </div>
        <div style={{ display: "flex", marginTop: 48, height: 10, width: 220, borderRadius: 5, background: PRIMARY }} />
      </div>
    ),
    { ...size, fonts: [{ name: "Lora", data: lora, style: "normal", weight: 600 }] },
  );
}
