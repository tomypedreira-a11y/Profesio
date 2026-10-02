// Partes de los esqueletos de carga (loading.tsx) que se repiten entre pantallas: filas de lista y tarjetas.
// Tienen el alto de las reales, así la pantalla no salta cuando llegan los datos.
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Fila de la lista de pacientes: avatar, nombre y teléfono.
export function PatientRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border-[1.5px] px-4 py-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    </div>
  );
}

// Fila de la lista de sesiones: horario y nombre.
export function SessionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border-[1.5px] px-4 py-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-5 w-40" />
    </div>
  );
}

// Tarjeta con título y renglones (datos, listas cortas, anotaciones).
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={cn("h-5", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </CardContent>
    </Card>
  );
}

// Formulario en una tarjeta: rótulos y campos.
export function FormSkeleton({ fields = 3, className }: { fields?: number; className?: string }) {
  return (
    <Card className={cn("max-w-2xl", className)}>
      <CardContent className="space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-36 rounded-full" />
      </CardContent>
    </Card>
  );
}
