// Genera los íconos de la PWA, el favicon y el ícono de la pestaña.
// Diseño provisorio (hasta que haya logo): fondo verde salvia y una "P" en Lora, verde oscuro, centrada.
//
// Uso: node scripts/generate-icons.mjs
// Los archivos generados se commitean. Para el logo final, cambiar glyph() (o dibujar el logo ahí) y volver a correrlo.
//
// La "P" se dibuja grande con la fuente del repo (scripts/fonts, licencia OFL), se recorta al borde exacto de la letra
// y se centra en cada ícono por su contorno real (no por la caja de la línea de texto).
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BACKGROUND = "#9ccd9c"; // verde salvia (--primary del tema claro)
const FOREGROUND = "#122d19"; // verde oscuro
const FONT_FILE = fileURLToPath(new URL("./fonts/Lora-SemiBold.ttf", import.meta.url));
const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

// La "P" en alta resolución, recortada a su contorno (fondo transparente).
async function glyph(color = FOREGROUND) {
  const rendered = await sharp({
    text: {
      text: `<span foreground="${color}">P</span>`,
      fontfile: FONT_FILE,
      font: "Lora SemiBold",
      dpi: 9600,
      rgba: true,
    },
  })
    .png()
    .toBuffer();
  return sharp(rendered).trim().png().toBuffer();
}

// Un ícono cuadrado: fondo (con esquinas redondeadas o a sangre) y la "P" de `glyphHeight` (fracción del lado).
async function icon(letter, size, { rounded, glyphHeight }) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BACKGROUND}"/></svg>`,
  );
  const height = Math.round(size * glyphHeight);
  const { data, info } = await sharp(letter).resize({ height }).png().toBuffer({ resolveWithObject: true });
  const composed = sharp(background).composite([
    { input: data, left: Math.round((size - info.width) / 2), top: Math.round((size - info.height) / 2) },
  ]);
  // A sangre no hay nada transparente: sin canal alfa (iOS lo pide para el apple-touch-icon).
  return (rounded ? composed : composed.removeAlpha()).png({ compressionLevel: 9 }).toBuffer();
}

// Archivo .ico con varias medidas, cada una como PNG adentro (lo leen todos los navegadores actuales).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: ícono
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // ancho (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // alto
    entry.writeUInt16LE(1, 4); // planos de color
    entry.writeUInt16LE(32, 6); // bits por píxel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const letter = await glyph();
await mkdir(root("public/icons"), { recursive: true });

// Íconos de la app (manifest): con esquinas redondeadas y la "P" a ~60% del alto.
await writeFile(root("public/icons/icon-192.png"), await icon(letter, 192, { rounded: true, glyphHeight: 0.6 }));
await writeFile(root("public/icons/icon-512.png"), await icon(letter, 512, { rounded: true, glyphHeight: 0.6 }));

// Maskable: el sistema lo recorta con su propia forma (círculo, gota…). Fondo a sangre y la "P" dentro de la
// zona segura (el círculo del 80% central): a la mitad del alto, su contorno queda holgado adentro.
await writeFile(
  root("public/icons/icon-maskable-512.png"),
  await icon(letter, 512, { rounded: false, glyphHeight: 0.5 }),
);

// iPhone/iPad: sin transparencia ni esquinas (iOS les pone las suyas).
await writeFile(root("public/icons/apple-touch-icon.png"), await icon(letter, 180, { rounded: false, glyphHeight: 0.6 }));

// Pestaña del navegador: favicon.ico (16, 32 y 48) e icon.png (64). En tamaños chicos la "P" va un poco más grande.
const favicons = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await icon(letter, size, { rounded: true, glyphHeight: 0.68 }) })),
);
await writeFile(root("src/app/favicon.ico"), ico(favicons));
await writeFile(root("src/app/icon.png"), await icon(letter, 64, { rounded: true, glyphHeight: 0.64 }));

// Badge de las notificaciones: Android lo muestra en la barra de estado usando solo la silueta (el canal alfa),
// así que va la "P" blanca sobre fondo transparente, sin el cuadrado verde.
const badgeSize = 96;
const badgeGlyph = await sharp(await glyph("#ffffff")).resize({ height: Math.round(badgeSize * 0.78) }).png().toBuffer({
  resolveWithObject: true,
});
await sharp({ create: { width: badgeSize, height: badgeSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    {
      input: badgeGlyph.data,
      left: Math.round((badgeSize - badgeGlyph.info.width) / 2),
      top: Math.round((badgeSize - badgeGlyph.info.height) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(root("public/icons/badge-96.png"));

console.log("Íconos generados en public/icons/ y src/app/ (favicon.ico, icon.png).");
