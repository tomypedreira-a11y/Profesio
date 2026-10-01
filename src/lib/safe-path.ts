// Destino después de un link o de la verificación: solo rutas internas ("/algo", no "//otro-sitio.com"
// ni "/\otro-sitio.com", que el navegador trata como otro dominio). Evita usar el link para mandar a otro sitio.
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
