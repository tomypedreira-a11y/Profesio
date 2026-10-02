"use client";

// Configuración > Notificaciones.
// - Este dispositivo: activar o desactivar (cada navegador se suscribe por separado) y una notificación de prueba.
// - Preferencias de la cuenta (valen para todos los dispositivos): recordatorio, resumen del día y nombre del paciente.
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { BellIcon, BellOffIcon, CircleCheckIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { pushSupported, readyRegistration, vapidKeyBytes } from "@/lib/push-client";
import { REMINDER_OPTIONS, reminderValue, SUMMARY_TIMES, summaryTimeValue } from "@/lib/notifications";
import {
  updateDailySummaryEnabled,
  updateDailySummaryTime,
  updateNotificationShowName,
  updateReminderMinutes,
} from "./actions";
import { deleteSubscription, saveSubscription, sendTestNotification } from "./notification-actions";
import { PreferenceSelect } from "./preference-select";
import { PreferenceSwitch } from "./preference-switch";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type NotificationPreferences = {
  reminderMinutes: number | null;
  dailySummaryEnabled: boolean;
  dailySummaryTime: string;
  showName: boolean;
};

// Estado de las notificaciones en este dispositivo.
type DeviceState =
  | { status: "loading" }
  | { status: "unsupported" } // el navegador no tiene notificaciones push
  | { status: "needs-install" } // iPhone/iPad: solo con la app instalada
  | { status: "unavailable" } // sin service worker (ej. npm run dev) o sin claves en el servidor
  | { status: "blocked" } // el permiso está bloqueado en el navegador
  | { status: "off" }
  | { status: "on"; subscription: PushSubscription };

export function NotificationSettings({ preferences }: { preferences: NotificationPreferences }) {
  return (
    <>
      <Field>
        <FieldLabel>En este dispositivo</FieldLabel>
        <DeviceNotifications />
      </Field>
      <Field>
        <FieldLabel htmlFor="reminder_minutes">Recordatorio de cada sesión</FieldLabel>
        <PreferenceSelect
          id="reminder_minutes"
          value={reminderValue(preferences.reminderMinutes)}
          items={REMINDER_OPTIONS}
          save={updateReminderMinutes}
        />
        <FieldDescription>Llega a todos los dispositivos donde activaste las notificaciones.</FieldDescription>
      </Field>
      <DailySummary enabled={preferences.dailySummaryEnabled} time={preferences.dailySummaryTime} />
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="notification_show_name">Mostrar el nombre del paciente en las notificaciones</FieldLabel>
          <FieldDescription>
            Las notificaciones se ven en la pantalla bloqueada. Si lo activás, el recordatorio dice el nombre y la
            inicial del apellido (por ejemplo, &ldquo;Juan P.&rdquo;).
          </FieldDescription>
        </FieldContent>
        <PreferenceSwitch id="notification_show_name" checked={preferences.showName} save={updateNotificationShowName} />
      </Field>
    </>
  );
}

function DailySummary({ enabled: savedEnabled, time }: { enabled: boolean; time: string }) {
  const [enabled, setEnabled] = useState(savedEnabled);
  return (
    <>
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="daily_summary_enabled">Resumen del día</FieldLabel>
          <FieldDescription>Cuántas sesiones tenés y a qué hora es la primera. Solo los días con sesiones.</FieldDescription>
        </FieldContent>
        <PreferenceSwitch
          id="daily_summary_enabled"
          checked={savedEnabled}
          save={updateDailySummaryEnabled}
          onChange={setEnabled}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="daily_summary_time">Hora del resumen</FieldLabel>
        <PreferenceSelect
          id="daily_summary_time"
          value={summaryTimeValue(time)}
          items={SUMMARY_TIMES}
          save={updateDailySummaryTime}
          disabled={!enabled}
        />
      </Field>
    </>
  );
}

function DeviceNotifications() {
  const install = useInstallPrompt();
  const [state, setState] = useState<DeviceState>({ status: "loading" });
  const [pending, startTransition] = useTransition();

  // Qué se puede hacer en este navegador. Si ya está suscripto, se vuelve a guardar la suscripción (por si se
  // borró en el servidor, por ejemplo porque venció): así queda sincronizada.
  useEffect(() => {
    if (!install.ready) return;
    let cancelled = false;
    (async () => {
      const iosWithoutApp = install.isIOS && !install.isInstalled;
      let next: DeviceState;
      if (iosWithoutApp) next = { status: "needs-install" };
      else if (!pushSupported()) next = { status: "unsupported" };
      else if (!VAPID_PUBLIC_KEY) next = { status: "unavailable" };
      else {
        const registration = await readyRegistration();
        if (!registration) next = { status: "unavailable" };
        else if (Notification.permission === "denied") next = { status: "blocked" };
        else {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription && Notification.permission === "granted") {
            const result = await saveSubscription(subscription.toJSON());
            next = result.error || result.conflict ? { status: "off" } : { status: "on", subscription };
          } else next = { status: "off" };
        }
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [install.ready, install.isIOS, install.isInstalled]);

  function activate() {
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission === "denied") return setState({ status: "blocked" });
      if (permission !== "granted") return; // cerró el cartel sin elegir

      const registration = await readyRegistration();
      if (!registration) return setState({ status: "unavailable" });
      const subscribe = () =>
        registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(VAPID_PUBLIC_KEY) });

      try {
        let subscription = await subscribe();
        let result = await saveSubscription(subscription.toJSON());
        // El navegador seguía suscripto a otra cuenta: una suscripción nueva (otro endpoint) para esta.
        if (result.conflict) {
          await subscription.unsubscribe();
          subscription = await subscribe();
          result = await saveSubscription(subscription.toJSON());
        }
        if (result.error || result.conflict) {
          toast.error(result.error ?? "No se pudieron activar las notificaciones. Volvé a intentar.");
          return;
        }
        setState({ status: "on", subscription });
        toast.success("Notificaciones activadas en este dispositivo.");
      } catch {
        toast.error("El navegador no pudo activar las notificaciones. Volvé a intentar.");
      }
    });
  }

  function deactivate(subscription: PushSubscription) {
    startTransition(async () => {
      const result = await deleteSubscription(subscription.endpoint);
      if (result.error) return void toast.error(result.error);
      await subscription.unsubscribe().catch(() => {});
      setState({ status: "off" });
      toast.success("Notificaciones desactivadas en este dispositivo.");
    });
  }

  function sendTest(subscription: PushSubscription) {
    startTransition(async () => {
      const result = await sendTestNotification(subscription.endpoint);
      if (result.error) toast.error(result.error);
      else toast.success("Listo: en unos segundos te llega la notificación de prueba.");
    });
  }

  switch (state.status) {
    case "loading":
      return <Skeleton className="h-9 w-64" />;
    case "unsupported":
      return <Note>Este navegador no permite notificaciones. Probá con Chrome, Edge, Firefox o Safari.</Note>;
    case "needs-install":
      return (
        <Note>
          En iPhone, las notificaciones funcionan con la app instalada.{" "}
          <Link href="#instalar" className="font-medium text-foreground underline underline-offset-4">
            Cómo instalarla
          </Link>
        </Note>
      );
    case "unavailable":
      return (
        <Note>
          Las notificaciones no están disponibles en este momento (necesitan la app publicada, no la de desarrollo).
        </Note>
      );
    case "blocked":
      return (
        <Note>
          Bloqueaste las notificaciones de Profesio en este navegador. Para habilitarlas, tocá el candado o el ícono de
          configuración junto a la dirección, permití las notificaciones y recargá la página. Si usás la app instalada,
          buscala en la configuración de notificaciones del dispositivo.
        </Note>
      );
    case "off":
      return (
        <div className="flex flex-col items-start gap-2">
          <Note>Recibí los recordatorios de sesión y el resumen del día en este dispositivo.</Note>
          <Button onClick={activate} disabled={pending}>
            <BellIcon />
            {pending ? "Activando…" : "Activar en este dispositivo"}
          </Button>
        </div>
      );
    case "on":
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="flex items-center gap-2 text-sm">
            <CircleCheckIcon className="size-4 text-primary-border" />
            Activadas en este dispositivo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => sendTest(state.subscription)} disabled={pending}>
              <SendIcon />
              Enviar notificación de prueba
            </Button>
            <Button variant="outline" onClick={() => deactivate(state.subscription)} disabled={pending}>
              <BellOffIcon />
              Desactivar
            </Button>
          </div>
        </div>
      );
  }
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
