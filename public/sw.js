// Service worker de Profesio (lo registra src/components/pwa/service-worker-register.tsx, solo en producción).
//
// Para qué está: que la app se pueda instalar y que, sin conexión, se vea una pantalla amable (offline.html)
// en lugar del error del navegador. NO es una app offline: sin internet no se ve ni se carga nada.
//
// REGLA: nunca se cachean páginas de la app, respuestas de Supabase ni Server Actions. Son datos clínicos
// (historia clínica, Ley 26.529) y no pueden quedar guardados en el dispositivo. El caché tiene solo
// offline.html y los íconos (archivos públicos, sin datos de nadie). Todo lo demás va directo a la red.

// Al cambiar offline.html o los íconos, subir la versión: el caché anterior se borra al activarse la nueva.
const CACHE = "profesio-v2";
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

// Notificaciones (recordatorio de sesión, resumen del día, prueba). Las envía el servidor (src/lib/push.ts) con
// { title, body, url, tag }: el texto ya viene armado y sin datos clínicos. No se guarda nada.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Profesio", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png", // monocromo: la barra de estado de Android usa solo su silueta
      tag: data.tag, // la misma sesión no se apila dos veces
      data: { url: data.url || "/calendario" },
    }),
  );
});

// Al tocarla: una ventana de Profesio que ya esté abierta va a la pantalla indicada; si no hay, se abre una.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/calendario", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!open) {
        await self.clients.openWindow(url);
        return;
      }
      await open.focus();
      if (open.url === url) return;
      try {
        await open.navigate(url);
      } catch {
        // navigate solo funciona en ventanas que controla este service worker: si no, una nueva.
        await self.clients.openWindow(url);
      }
    })(),
  );
});
