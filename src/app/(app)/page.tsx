import { PageHeader } from "@/components/page-header";

// Vista principal. El calendario llega en la etapa 4.
export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendario" description="Tus sesiones por día, semana y mes." />
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-10 text-sm text-muted-foreground">
        Acá va a estar el calendario (etapa 4).
      </div>
    </>
  );
}
