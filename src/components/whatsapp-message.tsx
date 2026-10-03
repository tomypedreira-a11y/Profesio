"use client";

// Mensajes de una sesión por WhatsApp (recordatorio y "el paciente aún no llegó"): abren el chat del paciente con
// el mensaje ya escrito (lib/whatsapp.ts). No se envían solos: el psicólogo los revisa y los manda desde su WhatsApp.
import { MessageCircleIcon, UserRoundSearchIcon, type LucideIcon } from "lucide-react";
import { whatsappUrl } from "@/lib/phone";
import { lateText, reminderText } from "@/lib/whatsapp";
import { useTimeZone } from "@/components/profile-defaults-provider";
import { Button } from "@/components/ui/button";

export function WhatsAppMessageButton({
  phone,
  message,
  label,
  icon: Icon = MessageCircleIcon,
  className,
}: {
  phone: string;
  // Arma el texto en la zona del perfil.
  message: (timeZone: string) => string;
  label: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const timeZone = useTimeZone();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      nativeButton={false}
      render={
        <a
          href={whatsappUrl(phone, message(timeZone))}
          target="_blank"
          rel="noopener noreferrer"
          // El texto depende de cuánto falta ("hoy", "en un rato"): se arma de nuevo al tocar, por si la
          // pantalla quedó abierta un buen rato (y así no importa si difiere de lo que armó el servidor).
          onClick={(e) => {
            e.currentTarget.href = whatsappUrl(phone, message(timeZone));
          }}
          suppressHydrationWarning
        />
      }
    >
      <Icon />
      {label}
    </Button>
  );
}

type ReminderSession = { first_name: string; phone: string | null; starts_at: string };

// "Enviar recordatorio": panel de la sesión, lista de Sesiones y próxima sesión del calendario.
export function WhatsAppReminderButton({ session, className }: { session: ReminderSession; className?: string }) {
  if (!session.phone) return null;
  return (
    <WhatsAppMessageButton
      phone={session.phone}
      message={(timeZone) => reminderText(session, timeZone)}
      label="Enviar recordatorio"
      className={className}
    />
  );
}

// Durante la sesión en curso: el paciente no llegó (o no se conectó) y se le escribe.
export function WhatsAppLateButton({
  session,
  className,
}: {
  session: ReminderSession & { modality: string };
  className?: string;
}) {
  if (!session.phone) return null;
  return (
    <WhatsAppMessageButton
      phone={session.phone}
      message={(timeZone) => lateText(session, timeZone)}
      label={session.modality === "virtual" ? "¿El paciente aún no se conectó?" : "¿El paciente aún no llegó?"}
      icon={UserRoundSearchIcon}
      className={className}
    />
  );
}
