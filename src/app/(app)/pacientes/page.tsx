import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Pacientes" };

export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Pacientes" description="Tus pacientes y sus fichas." />
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-10 text-sm text-muted-foreground">
        La gestión de pacientes llega en la etapa 3.
      </div>
    </>
  );
}
