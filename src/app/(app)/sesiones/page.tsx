import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Sesiones" };

export default function SessionsPage() {
  return (
    <>
      <PageHeader title="Sesiones" description="Sesiones sueltas y recurrentes." />
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-10 text-sm text-muted-foreground">
        La gestión de sesiones llega en la etapa 4.
      </div>
    </>
  );
}
