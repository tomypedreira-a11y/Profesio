import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PatientList } from "../patient-list";
import { getPatients, getTimeZone } from "../queries";

export const metadata: Metadata = { title: "Pacientes archivados" };

export default async function ArchivedPatientsPage() {
  const [patients, timeZone] = await Promise.all([getPatients(false), getTimeZone()]);

  return (
    <>
      <PageHeader
        title="Pacientes archivados"
        description="Conservan todo su historial. Podés reactivarlos desde su ficha."
      />
      {patients.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay pacientes archivados.</p>
      ) : (
        <PatientList patients={patients} timeZone={timeZone} showSort={false} />
      )}
    </>
  );
}
