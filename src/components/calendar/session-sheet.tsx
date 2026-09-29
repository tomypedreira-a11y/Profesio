"use client";

// Panel con la información de una sesión (se abre al tocarla en el calendario).
import Link from "next/link";
import { MessageCircleIcon, UserRoundIcon } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NoteEditor } from "@/components/notes/note-editor";
import { SessionPayment } from "@/components/payments/session-payment";
import { SessionActions } from "./session-actions";
import type { CalendarSession } from "./types";

type SessionSheetProps = {
  session: CalendarSession | null;
  isNext: boolean;
  timeZone: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

export function SessionSheet({ session, isNext, timeZone, onOpenChange, onChanged }: SessionSheetProps) {
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

            <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
              <div className="flex flex-wrap gap-2">
                {session.status === "cancelled" ? (
                  <Badge variant="destructive">Cancelada</Badge>
                ) : isNext ? (
                  <Badge>Próxima sesión</Badge>
                ) : (
                  <Badge variant="secondary">Agendada</Badge>
                )}
                <Badge variant="outline">{session.series_id ? "Horario fijo" : "Sesión suelta"}</Badge>
              </div>

              {session.rescheduled_from && (
                <p className="text-muted-foreground">
                  Reprogramada. Horario original: {fmt(session.rescheduled_from, "dd/MM HH:mm")}.
                </p>
              )}

              {session.phone && (
                <a
                  href={whatsappUrl(session.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <MessageCircleIcon className="size-4" />
                  {formatPhone(session.phone)}
                </a>
              )}

              {/* Cobro: solo en sesiones realizadas (ya empezaron y no se cancelaron) */}
              {session.status === "scheduled" && new Date(session.starts_at) <= new Date() && (
                <SessionPayment key={session.id} sessionId={session.id} timeZone={timeZone} />
              )}

              <SessionActions session={session} timeZone={timeZone} onChanged={onChanged} />

              <Button variant="outline" render={<Link href={`/pacientes/${session.patient_id}`} />} nativeButton={false}>
                <UserRoundIcon />
                Ver ficha del paciente
              </Button>

              <Separator />

              {/* key: al abrir otra sesión, el editor arranca de cero */}
              <NoteEditor key={session.id} sessionId={session.id} timeZone={timeZone} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
