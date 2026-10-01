"use client";

// Cierre de sesión por inactividad, del lado del navegador. El límite lo hace cumplir el proxy (ver lib/idle.ts):
// esto avisa un minuto antes, cierra prolijo (guarda el borrador de una anotación y desuscribe las notificaciones
// de este dispositivo) y anota la actividad que no llega al servidor (escribir, desplazarse, tocar la pantalla).
// Las pestañas comparten la actividad porque comparten la cookie.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  IDLE_COOKIE_OPTIONS,
  IDLE_LOGOUT_REASON,
  IDLE_TIMEOUT_COOKIE,
  LAST_ACTIVITY_COOKIE,
  parseIdleMinutes,
} from "@/lib/idle";
import { signOutThisDevice } from "@/lib/sign-out";

const CHECK_EVERY = 15_000;
const WARN_BEFORE = 60_000;
// La actividad se anota como mucho una vez por minuto.
const WRITE_EVERY = 60_000;
// Se cierra unos segundos antes que el límite del servidor, para que el cierre todavía tenga sesión
// (guardar el borrador, borrar la suscripción). Si llegara después, el proxy lo cortaría a mitad de camino.
const MARGIN = 5_000;

function readCookie(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie.split("; ").find((c) => c.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

function writeLastActivity(time: number) {
  const { path, sameSite, secure, maxAge } = IDLE_COOKIE_OPTIONS;
  document.cookie =
    `${LAST_ACTIVITY_COOKIE}=${time}; path=${path}; max-age=${maxAge}; samesite=${sameSite}` + (secure ? "; secure" : "");
}

function readLastActivity() {
  const time = Number(readCookie(LAST_ACTIVITY_COOKIE));
  return time > 0 ? time : null;
}

// timeoutMinutes: el del perfil, por si falta la cookie (la cookie manda: se actualiza al cambiar la preferencia).
export function IdleLogout({ timeoutMinutes }: { timeoutMinutes: number }) {
  // Segundos que faltan, mientras se muestra el aviso; null = sin aviso.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [closing, startClosing] = useTransition();
  const closingRef = useRef(false);
  const warningRef = useRef(false);

  // Milisegundos hasta cerrar la sesión (desde la última actividad de cualquier pestaña o del servidor).
  const remaining = useCallback(() => {
    const last = readLastActivity();
    if (last === null) return Infinity;
    const minutes = parseIdleMinutes(readCookie(IDLE_TIMEOUT_COOKIE) ?? String(timeoutMinutes));
    return last + minutes * 60_000 - MARGIN - Date.now();
  }, [timeoutMinutes]);

  const signOut = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    startClosing(async () => {
      try {
        await signOutThisDevice(IDLE_LOGOUT_REASON);
      } catch (error) {
        unstable_rethrow(error); // la redirección al login
        closingRef.current = false; // sin conexión: se reintenta en la próxima revisión
      }
    });
  }, []);

  const check = useCallback(() => {
    if (closingRef.current) return;
    const left = remaining();
    if (left <= 0) return signOut();
    warningRef.current = left <= WARN_BEFORE;
    setSecondsLeft(warningRef.current ? Math.ceil(left / 1000) : null);
  }, [remaining, signOut]);

  const recordActivity = useCallback(
    (force = false) => {
      if (closingRef.current) return;
      // Si ya venció (ej. el celular estuvo bloqueado), volver no la extiende.
      if (remaining() <= 0) return signOut();
      const last = readLastActivity();
      if (!force && last !== null && Date.now() - last < WRITE_EVERY) return;
      writeLastActivity(Date.now());
    },
    [remaining, signOut],
  );

  // Actividad: con el aviso abierto no cuenta (hay que elegir "Seguir usando").
  useEffect(() => {
    const onActivity = () => !warningRef.current && recordActivity();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      check(); // primero: si venció mientras no se veía, se cierra
      onActivity();
    };
    const options = { capture: true, passive: true }; // capture: también el scroll de paneles internos
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, options));
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity, options));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [check, recordActivity]);

  // Revisión periódica; con el aviso abierto, cada segundo (cuenta regresiva).
  const warning = secondsLeft !== null;
  useEffect(() => {
    if (readLastActivity() === null) writeLastActivity(Date.now());
    const id = setInterval(check, warning ? 1000 : CHECK_EVERY);
    return () => clearInterval(id);
  }, [check, warning]);

  function keepUsing() {
    warningRef.current = false;
    setSecondsLeft(null);
    recordActivity(true);
  }

  return (
    <AlertDialog open={warning || closing} onOpenChange={(open) => !open && !closing && keepUsing()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Seguís ahí?</AlertDialogTitle>
          <AlertDialogDescription aria-live="polite">
            {closing
              ? "Cerrando la sesión…"
              : `Por seguridad, tu sesión se va a cerrar en ${secondsLeft} ${secondsLeft === 1 ? "segundo" : "segundos"} por inactividad.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={keepUsing} disabled={closing}>
            Seguir usando
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
