import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatSessionLong } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { NoteDialogButton } from "@/components/notes/note-dialog-button";
import { getTimeZone } from "../../queries";

export const metadata: Metadata = { title: "Informes" };

// Libro de sesiones: todos los informes del paciente, del más reciente al más antiguo.
export default async function PatientNotesPage({ params }: PageProps<"/pacientes/[id]/informes">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: patient }, { data: notes }, timeZone] = await Promise.all([
    supabase.from("patients").select("first_name, last_name").eq("id", id).maybeSingle(),
    supabase
      .from("session_book")
      .select("note_id, session_id, starts_at, content, note_status, version")
      .eq("patient_id", id)
      .order("starts_at", { ascending: false }),
    getTimeZone(),
  ]);
  if (!patient) notFound();

  return (
    <>
      <Button variant="ghost" size="sm" className="self-start" render={<Link href={`/pacientes/${id}`} />} nativeButton={false}>
        <ArrowLeftIcon />
        {patient.first_name} {patient.last_name}
      </Button>
      <PageHeader title="Informes" description={`${notes?.length ?? 0} informes de sesión`} />

      {!notes?.length ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Todavía no hay informes. Se cargan desde cada sesión en el calendario.
        </p>
      ) : (
        <div className="flex max-w-3xl flex-col gap-4">
          {notes.map((n) => {
            const label = formatSessionLong(n.starts_at!, timeZone);
            return (
              <Card key={n.note_id} id={n.note_id!} className="scroll-mt-4">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base first-letter:uppercase">{label}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {n.note_status === "final" ? <Badge>Finalizado</Badge> : <Badge variant="secondary">Borrador</Badge>}
                    {n.version! > 1 && <Badge variant="outline">Corregido</Badge>}
                    <NoteDialogButton
                      sessionId={n.session_id!}
                      timeZone={timeZone}
                      sessionLabel={label}
                      label={n.note_status === "final" ? "Corregir" : "Editar"}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
