import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PatientList } from "./patient-list";
import { countArchived, getPatients, getTimeZone } from "./queries";

export const metadata: Metadata = { title: "Pacientes" };

export default async function PatientsPage() {
  const [patients, archived, timeZone] = await Promise.all([getPatients(true), countArchived(), getTimeZone()]);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Pacientes" description={`${patients.length} activos`} />
        <Button render={<Link href="/pacientes/nuevo" />} nativeButton={false}>
          <PlusIcon />
          Nuevo paciente
        </Button>
      </div>

      {patients.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">Todavía no cargaste pacientes.</p>
          <Button render={<Link href="/pacientes/nuevo" />} nativeButton={false} variant="outline">
            <PlusIcon />
            Agregar el primero
          </Button>
        </div>
      ) : (
        <PatientList patients={patients} timeZone={timeZone} />
      )}

      {archived > 0 && (
        <Button variant="ghost" className="self-center" render={<Link href="/pacientes/archivados" />} nativeButton={false}>
          <ArchiveIcon />
          Ver archivados ({archived})
        </Button>
      )}
    </>
  );
}
