// Mientras cargan las próximas sesiones: encabezado y la lista agrupada por día.
import { SessionRowSkeleton } from "@/components/list-skeletons";
import { PageHeaderSkeleton } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeaderSkeleton title="Sesiones" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <div className="flex max-w-2xl flex-col gap-6">
        {[2, 2, 1].map((rows, day) => (
          <div key={day} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-44" />
            {Array.from({ length: rows }, (_, i) => (
              <SessionRowSkeleton key={i} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
