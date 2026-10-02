// Mientras cargan las anotaciones del paciente: una tarjeta por anotación (fecha, estado y texto).
import { PageHeaderSkeleton } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Anotaciones" />
      <div className="flex max-w-3xl flex-col gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
