// Genera los íconos de la PWA, el favicon, el ícono de la pestaña y la marca que muestra la interfaz.
// Diseño: el árbol del logo de Profesio, verde oscuro, sobre el beige claro de la app.
//
// Uso: node scripts/generate-icons.mjs
// Los archivos generados se commitean. Si cambia el logo, reemplazar scripts/logo/arbol.svg y volver a correrlo.
//
// scripts/logo/arbol.svg es el árbol de scripts/logo/profesio-logo.png vectorizado (potrace, sobre la imagen
// agrandada 8 veces), sin el texto y con fill="currentColor". En tamaños chicos las hojas sueltas se pierden
// (quedan como un verde pálido), así que ahí se usa una silueta engrosada: la copa se lee como una sola mancha.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BACKGROUND = "#faf3e5"; // beige (--background del tema claro)
const FOREGROUND = "#0a4a26"; // verde del logo
const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const SVG = await readFile(root("scripts/logo/arbol.svg"), "utf8");

// El árbol en alta resolución, con fondo transparente. `bold` (0 = tal cual) engrosa la silueta: desenfoca el
// árbol y lo vuelve a binarizar con un umbral alto, así los huecos entre las hojas se cierran.
async function tree(color = FOREGROUND, bold = 0) {
  const svg = Buffer.from(SVG.replace("<svg ", `<svg color="${color}" `));
  const height = 1200;
  if (!bold) return sharp(svg).resize({ height }).png().toBuffer();
  // La máscara sale del contorno (canal alfa), así sirve para cualquier color, también el blanco del badge.
  const flat = await sharp(svg).resize({ height }).extractChannel("alpha").negate().png().toBuffer();
  const blurred = await sharp(flat).blur(bold).png().toBuffer();
  const mask = await sharp(blurred).threshold(245).negate().extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const { width } = mask.info;
  return sharp({ create: { width, height, channels: 3, background: color } })
    .joinChannel(mask.data, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

// Un ícono cuadrado: fondo (con esquinas redondeadas, a sangre o transparente) y el árbol de `treeHeight`
// (fracción del lado), centrado.
async function icon(art, size, { rounded = false, transparent = false, treeHeight }) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  const fill = transparent ? "none" : BACKGROUND;
  const background = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${fill}"/></svg>`,
  );
  const height = Math.round(size * treeHeight);
  const { data, info } = await sharp(art).resize({ height }).png().toBuffer({ resolveWithObject: true });
  const composed = sharp(background).composite([
    { input: data, left: Math.round((size - info.width) / 2), top: Math.round((size - info.height) / 2) },
  ]);
  // A sangre no hay nada transparente: sin canal alfa (iOS lo pide para el apple-touch-icon).
  return (rounded || transparent ? composed : composed.removeAlpha()).png({ compressionLevel: 9 }).toBuffer();
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

const detailed = await tree();
const solid = await tree(FOREGROUND, 16); // favicon: copa compacta
await mkdir(root("public/icons"), { recursive: true });

// Íconos de la app (manifest): con esquinas redondeadas y el árbol a ~74% del alto.
await writeFile(root("public/icons/icon-192.png"), await icon(detailed, 192, { rounded: true, treeHeight: 0.74 }));
await writeFile(root("public/icons/icon-512.png"), await icon(detailed, 512, { rounded: true, treeHeight: 0.74 }));

// Maskable: el sistema lo recorta con su propia forma (círculo, gota…). Fondo a sangre y el árbol dentro de la
// zona segura (el círculo del 80% central): al 60% del alto, la copa redonda y las raíces quedan adentro.
await writeFile(root("public/icons/icon-maskable-512.png"), await icon(detailed, 512, { treeHeight: 0.6 }));

// iPhone/iPad: sin transparencia ni esquinas (iOS les pone las suyas).
await writeFile(root("public/icons/apple-touch-icon.png"), await icon(detailed, 180, { treeHeight: 0.74 }));

// Pestaña del navegador: favicon.ico (16, 32 y 48) e icon.png (64), con la silueta engrosada y más grande.
const favicons = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await icon(solid, size, { rounded: true, treeHeight: 0.86 }) })),
);
await writeFile(root("src/app/favicon.ico"), ico(favicons));
await writeFile(root("src/app/icon.png"), await icon(await tree(FOREGROUND, 8), 64, { rounded: true, treeHeight: 0.84 }));

// Marca de la interfaz (panel lateral, encabezado del sitio, login): se muestra a 32 px, así que va a 96 (pantallas
// 3x) con la silueta apenas engrosada. Sin fondo: el recuadro beige lo pone el componente (components/logo.tsx).
await writeFile(
  root("public/icons/logo-mark.png"),
  await icon(await tree(FOREGROUND, 4), 96, { transparent: true, treeHeight: 1 }),
);

// Badge de las notificaciones: Android lo muestra en la barra de estado usando solo la silueta (el canal alfa),
// así que va el árbol blanco, engrosado, sobre fondo transparente.
await writeFile(
  root("public/icons/badge-96.png"),
  await icon(await tree("#ffffff", 20), 96, { transparent: true, treeHeight: 0.86 }),
);

// El árbol tal cual (vectorial), para el fondo de las pantallas de ingreso (components/auth-art.tsx): se usa como
// máscara y lo pinta el color del tema.
await writeFile(root("public/decor/logo-tree.svg"), SVG);

console.log("Íconos generados en public/icons/, public/decor/logo-tree.svg y src/app/ (favicon.ico, icon.png).");
