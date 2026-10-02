// Mientras carga la lista de pacientes (también los archivados): encabezado, búsqueda y filas como contactos.
import { PatientRowSkeleton } from "@/components/list-skeletons";
import { PageHeaderSkeleton } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeaderSkeleton title="Pacientes" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-full rounded-full sm:w-56" />
        </div>
        <div className="flex flex-col gap-2">
          {[2, 1, 3].map((rows, group) => (
            <div key={group} className="flex flex-col gap-2">
              <Skeleton className="mx-1 mt-2 mb-1 size-3" />
              {Array.from({ length: rows }, (_, i) => (
                <PatientRowSkeleton key={i} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
