// Pantalla de inicio de la app (con sesión): el calendario. La app vive bajo /app (el scope de la PWA);
// "/" es la página promocional pública.
// Es el destino después de ingresar (login, código de verificación, links de los mails) y el inicio de la PWA.
export const APP_HOME = "/app/calendario";

// ¿La ruta es de la app? Sus preferencias de pantalla (tema, tamaño de letra) se aplican solo ahí: el sitio
// público ("/", /ayuda, los legales) se ve siempre en claro y con la letra normal.
export function isAppPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/app/");
}
