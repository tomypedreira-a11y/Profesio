"use client";

// Recordatorio de una sesión por WhatsApp: abre el chat del paciente con el mensaje de Configuración ya
// completado. No se envía solo: el psicólogo lo revisa y lo manda desde su WhatsApp.
import { MessageCircleIcon } from "lucide-react";
import { whatsappUrl } from "@/lib/phone";
import { reminderText } from "@/lib/whatsapp";
import { useReminderTemplate, useTimeZone } from "@/components/profile-defaults-provider";
import { Button } from "@/components/ui/button";

type ReminderSession = { first_name: string; phone: string | null; starts_at: string };

// Botón con texto (panel de la sesión, al lado del teléfono) o solo el ícono (listas).
export function WhatsAppReminderButton({
  session,
  iconOnly = false,
  className,
}: {
  session: ReminderSession;
  iconOnly?: boolean;
  className?: string;
}) {
  const template = useReminderTemplate();
  const timeZone = useTimeZone();
  if (!session.phone) return null;
  const href = whatsappUrl(session.phone, reminderText(template, session, timeZone));
  const label = `Enviar recordatorio por WhatsApp a ${session.first_name}`;

  return (
    <Button
      variant={iconOnly ? "ghost" : "outline"}
      size={iconOnly ? "icon" : "sm"}
      className={className}
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
    >
      <MessageCircleIcon />
      {!iconOnly && "Enviar recordatorio"}
    </Button>
  );
}
