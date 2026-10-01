// Service worker de Profesio (lo registra src/components/pwa/service-worker-register.tsx, solo en producción).
//
// Para qué está: que la app se pueda instalar y que, sin conexión, se vea una pantalla amable (offline.html)
// en lugar del error del navegador. NO es una app offline: sin internet no se ve ni se carga nada.
//
// REGLA: nunca se cachean páginas de la app, respuestas de Supabase ni Server Actions. Son datos clínicos
// (historia clínica, Ley 26.529) y no pueden quedar guardados en el dispositivo. El caché tiene solo
// offline.html y los íconos (archivos públicos, sin datos de nadie). Todo lo demás va directo a la red.

// Al cambiar offline.html o los íconos, subir la versión: el caché anterior se borra al activarse la nueva.
const CACHE = "profesio-v1";
const PRECACHE = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: "reload": se piden a la red, no al caché HTTP del navegador.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      // Una versión nueva se activa enseguida, sin esperar a que se cierren las pestañas: como no guarda
      // páginas de la app, no hay nada viejo que pueda quedar mezclado con lo nuevo.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      // La navegación sale a la red en paralelo con el arranque del service worker (no la demora).
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Los archivos precacheados (offline.html y los íconos: públicos, sin datos): a la red y, si no hay, del caché.
  // Así offline.html muestra el ícono sin conexión.
  if (event.request.method === "GET" && url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(fetch(event.request).catch(async () => (await caches.match(url.pathname)) ?? Response.error()));
    return;
  }

  // Del resto, solo las navegaciones (abrir o recargar una pantalla). Todo lo demás (Supabase, Server Actions,
  // scripts, imágenes) no pasa por acá: sin respondWith, el navegador lo resuelve normalmente, sin caché propio.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        // A la red, siempre. La respuesta no se guarda.
        const preloaded = await event.preloadResponse;
        return preloaded ?? (await fetch(event.request));
      } catch {
        // Sin conexión: la pantalla amable.
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })(),
  );
});

// Próxima etapa: notificaciones (recordatorios de sesión). Acá se van a recibir y mostrar.
// self.addEventListener("push", (event) => {});
// self.addEventListener("notificationclick", (event) => {});
