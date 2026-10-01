"use client";

// Instalar Profesio como app (PWA).
// - Chrome, Edge y Android avisan que se puede instalar con `beforeinstallprompt`: se guarda el evento y se
//   abre el cuadro de instalación desde nuestro botón (promptInstall), sin el cartel automático del navegador.
// - Safari de iPhone/iPad no tiene ese evento: se instala a mano (Compartir > Agregar a pantalla de inicio).
// El navegador avisa una sola vez, al cargar la página, así que el estado es del módulo (compartido por todas las
// pantallas) y lo empieza a escuchar el layout raíz con listenForInstallPrompt.
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

// No está en los tipos del DOM (no es estándar).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = {
  ready: boolean; // false en el servidor y hasta hidratar: todavía no se sabe nada del navegador
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
};

const SERVER_STATE: InstallState = { ready: false, canInstall: false, isInstalled: false, isIOS: false };

let deferred: BeforeInstallPromptEvent | null = null;
let installedNow = false; // se instaló en esta visita (appinstalled)
let state = SERVER_STATE;
const subscribers = new Set<() => void>();
let listening = false;

// Abierta como app instalada (y no en una pestaña del navegador).
function runningInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPhone, iPod o iPad (el iPad con iPadOS se presenta como una Mac, pero con pantalla táctil).
function detectIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function update() {
  const isInstalled = installedNow || runningInstalled();
  state = { ready: true, canInstall: !isInstalled && deferred !== null, isInstalled, isIOS: detectIOS() };
  subscribers.forEach((notify) => notify());
}

// Empieza a escuchar al navegador (una sola vez por página).
export function listenForInstallPrompt() {
  if (listening || typeof window === "undefined") return;
  listening = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // sin el cartel del navegador: se instala desde Configuración o el menú
    deferred = event as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    update();
    toast.success("¡Profesio quedó instalada!");
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", update);
  update();
}

function subscribe(notify: () => void) {
  listenForInstallPrompt();
  subscribers.add(notify);
  return () => subscribers.delete(notify);
}

// Abre el cuadro de instalación del navegador. El evento sirve una sola vez: después se descarta.
async function promptInstall() {
  const event = deferred;
  if (!event) return;
  deferred = null;
  await event.prompt();
  await event.userChoice; // si la acepta, llega appinstalled
  update();
}

export function useInstallPrompt() {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
  return { ...current, promptInstall };
}
