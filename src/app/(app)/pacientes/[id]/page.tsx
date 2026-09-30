import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleIcon, PencilIcon } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { formatBirthDate, formatFee, formatSchedules, formatSessionLong } from "@/lib/format";
import { toSlots } from "@/lib/schedule";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddSessionButton } from "@/components/calendar/add-session-button";
import { getDefaultFee, getTimeZone } from "../queries";
import { ArchiveButton } from "./archive-button";

export const metadata: Metadata = { title: "Paciente" };

async function getPatient(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("patient_list").select("*").eq("id", id).maybeSingle();
  return data;
}

export default async function PatientPage({ params }: PageProps<"/pacientes/[id]">) {
  const { id } = await params;
  const [patient, timeZone, defaultFee] = await Promise.all([getPatient(id), getTimeZone(), getDefaultFee()]);
  if (!patient) notFound();

  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: upcoming }, { data: past }, { data: notes, count: notesCount }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, starts_at, status")
      .eq("patient_id", id)
      .gt("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(3),
    supabase
      .from("sessions")
      .select("id, starts_at, status")
      .eq("patient_id", id)
      .lte("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(10),
    supabase
      .from("session_book")
      .select("note_id, starts_at, content, note_status", { count: "exact" })
      .eq("patient_id", id)
      .order("starts_at", { ascending: false })
      .limit(1), // solo la más reciente; count trae el total para "Ver todas"
  ]);

  const fullName = `${patient.first_name} ${patient.last_name}`;
  const schedules = toSlots(patient.schedules);
  const hasSchedule = schedules.length > 0;

  const details = [
    { label: "Frecuencia", value: formatSchedules(schedules) },
    { label: "Documento", value: patient.dni },
    { label: "Fecha de nacimiento", value: patient.birth_date && formatBirthDate(patient.birth_date) },
    { label: "Email", value: patient.email, href: patient.email ? `mailto:${patient.email}` : undefined },
    {
      label: "Valor por sesión",
      // Sin valor propio, usa el del perfil.
      value:
        patient.session_fee !== null
          ? formatFee(patient.session_fee)
          : defaultFee !== null && `${formatFee(defaultFee)} (valor del perfil)`,
    },
  ];

  return (
    <>
      {/* Encabezado: nombre, teléfono y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 text-lg">
            <AvatarFallback>{`${patient.first_name?.charAt(0)}${patient.last_name?.charAt(0)}`.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {fullName}
              {!patient.active && <Badge variant="secondary">Archivado</Badge>}
            </h1>
            {patient.phone ? (
              <a
                href={whatsappUrl(patient.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
                title="Abrir chat de WhatsApp"
              >
                <MessageCircleIcon className="size-4" />
                {formatPhone(patient.phone)}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Sin teléfono</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {patient.active && <AddSessionButton patients={[{ id, name: fullName, schedules }]} patientId={id} lockPatient />}
          <Button variant="outline" render={<Link href={`/pacientes/${id}/editar`} />} nativeButton={false}>
            <PencilIcon />
            Editar
          </Button>
          <ArchiveButton patientId={id} active={!!patient.active} hasSchedule={hasSchedule} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              {details.map((d) => (
                <div key={d.label} className="grid grid-cols-[10rem_1fr] gap-2">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  <dd>
                    {!d.value ? (
                      <span className="text-muted-foreground">—</span>
                    ) : d.href ? (
                      <a href={d.href} className="hover:underline">{d.value}</a>
                    ) : (
                      d.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <SessionsCard title="Próximas sesiones" sessions={upcoming ?? []} timeZone={timeZone} empty="No tiene sesiones agendadas." />
          <NotesCard patientId={id} note={notes?.[0] ?? null} total={notesCount ?? 0} timeZone={timeZone} />
          <SessionsCard title="Últimas sesiones" sessions={past ?? []} timeZone={timeZone} empty="Todavía no tuvo sesiones." />
        </div>
      </div>
    </>
  );
}

function SessionsCard({
  title,
  sessions,
  timeZone,
  empty,
}: {
  title: string;
  sessions: { id: string; starts_at: string; status: string }[];
  timeZone: string;
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <span className={s.status === "cancelled" ? "text-muted-foreground line-through" : "first-letter:uppercase"}>
                  {formatSessionLong(s.starts_at, timeZone)}
                </span>
                {s.status === "cancelled" && <Badge variant="outline">Cancelada</Badge>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// La anotación más reciente del paciente, con acceso a la lista completa.
function NotesCard({
  patientId,
  note,
  total,
  timeZone,
}: {
  patientId: string;
  note: { note_id: string | null; starts_at: string | null; content: string | null; note_status: string | null } | null;
  total: number;
  timeZone: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anotaciones</CardTitle>
        {total > 0 && (
          <CardAction>
            <Button variant="link" size="sm" render={<Link href={`/pacientes/${patientId}/anotaciones`} />} nativeButton={false}>
              Ver todas ({total})
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!note ? (
          <p className="text-sm text-muted-foreground">Todavía no hay anotaciones. Se cargan desde cada sesión en el calendario.</p>
        ) : (
          <Link href={`/pacientes/${patientId}/anotaciones#${note.note_id}`} className="group block">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium first-letter:uppercase group-hover:underline">
                {formatSessionLong(note.starts_at!, timeZone)}
              </span>
              {note.note_status === "draft" && <Badge variant="secondary">Borrador</Badge>}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{note.content}</p>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
