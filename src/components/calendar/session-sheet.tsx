"use client";

// Panel con la información de una sesión (se abre al tocarla en el calendario).
import Link from "next/link";
import { MapPinIcon, MessageCircleIcon, UserRoundIcon, VideoIcon } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { modalityLabel } from "@/lib/modality";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NoteEditor } from "@/components/notes/note-editor";
import { SessionPayment } from "@/components/payments/session-payment";
import { WhatsAppReminderButton } from "@/components/whatsapp-reminder";
import { SessionActions } from "./session-actions";
import { SessionModality } from "./session-modality";
import type { CalendarSession } from "./types";

type SessionSheetProps = {
  session: CalendarSession | null;
  isNext: boolean;
  timeZone: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  // Al cobrar o deshacer el cobro el panel sigue abierto; el calendario actualiza "No cobrada".
  onPaymentChanged?: () => void;
};

export function SessionSheet({ session, isNext, timeZone, onOpenChange, onChanged, onPaymentChanged }: SessionSheetProps) {
  const fmt = (iso: string, pattern: string) => formatInTimeZone(iso, timeZone, pattern, { locale: es });

  return (
    <Sheet open={!!session} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {session && (
          <>
            <SheetHeader>
              <SheetTitle>
                {session.first_name} {session.last_name}
              </SheetTitle>
              <SheetDescription className="first-letter:uppercase">
                {fmt(session.starts_at, "EEEE d 'de' MMMM")} · {fmt(session.starts_at, "HH:mm")} a {fmt(session.ends_at, "HH:mm")}
              </SheetDescription>
            </SheetHeader>

            {/* Compacto, para que entre sin scrollear (también en el celular). */}
            <div className="flex flex-col gap-3 px-4 pb-6 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {session.status === "cancelled" ? (
                  <Badge variant="destructive">Cancelada</Badge>
                ) : isNext ? (
                  <Badge>Próxima sesión</Badge>
                ) : (
                  <Badge variant="secondary">Agendada</Badge>
                )}
                <Badge variant="outline">{session.series_id ? "Horario fijo" : "Sesión suelta"}</Badge>
                {/* En una cancelada la modalidad solo se informa; en las demás se puede cambiar (abajo). */}
                {session.status === "cancelled" && (
                  <Badge variant="outline">
                    {session.modality === "virtual" ? <VideoIcon /> : <MapPinIcon />}
                    {modalityLabel(session.modality)}
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  render={<Link href={`/app/pacientes/${session.patient_id}`} />}
                  nativeButton={false}
                >
                  <UserRoundIcon />
                  Ver ficha
                </Button>
              </div>

              {session.status !== "cancelled" && (
                <SessionModality key={`modality-${session.id}`} session={session} onChanged={onChanged} />
              )}

              {session.rescheduled_from && (
                <p className="text-muted-foreground">
                  Reprogramada. Horario original: {fmt(session.rescheduled_from, "dd/MM HH:mm")}.
                </p>
              )}

              {/* El teléfono abre el chat vacío; el recordatorio, con el mensaje de Configuración (solo si todavía no empezó). */}
              {session.phone && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <a
                    href={whatsappUrl(session.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    <MessageCircleIcon className="size-4" />
                    {formatPhone(session.phone)}
                  </a>
                  {session.status === "scheduled" && new Date(session.starts_at) > new Date() && (
                    <WhatsAppReminderButton session={session} />
                  )}
                </div>
              )}

              {/* Cobro: en toda sesión; las futuras se pueden cobrar por adelantado y las canceladas también se cobran. */}
              <SessionPayment
                key={`payment-${session.id}`}
                sessionId={session.id}
                timeZone={timeZone}
                onChanged={onPaymentChanged}
              />

              <SessionActions session={session} timeZone={timeZone} onChanged={onChanged} />

              <Separator />

              {/* Una sesión cancelada no se realizó: no lleva anotación (la base también lo impide).
                  key: al abrir otra sesión, el editor arranca de cero.
                  Con prefijo para no chocar con la key del cobro, que es hermano en este mismo contenedor. */}
              {session.status === "cancelled" ? (
                <p className="text-muted-foreground">Las sesiones canceladas no llevan anotación.</p>
              ) : (
                <NoteEditor key={`note-${session.id}`} sessionId={session.id} timeZone={timeZone} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
