// Esqueletos del calendario: la grilla (mientras carga FullCalendar, ver calendar-grid.tsx) y la pantalla entera
// (calendario/loading.tsx). Tienen las medidas de la grilla real (calendar.css) para que no salte al aparecer.
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// De 8 a 22, el horario visible por defecto (una fila por hora, rótulo cada 2).
const HOURS = 14;

export function CalendarGridSkeleton({ view }: { view: string }) {
  if (view === "dayGridMonth") return <MonthGridSkeleton />;
  // La semana de PC tiene 7 columnas y filas más altas; en el celular (y en la vista Día) es una sola columna.
  const week = view === "timeGridWeek";
  const columns = week ? "grid-cols-[3rem_minmax(0,1fr)] md:grid-cols-[3rem_repeat(7,minmax(0,1fr))]" : "grid-cols-[3rem_minmax(0,1fr)]";
  return (
    <div aria-hidden className="overflow-hidden rounded-sm border">
      <div className={cn("grid border-b", columns, week && "max-md:hidden")}>
        <div />
        {Array.from({ length: week ? 7 : 1 }, (_, i) => (
          <div key={i} className={cn("flex justify-center border-l py-2.5", i > 0 && "max-md:hidden")}>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
      {Array.from({ length: HOURS }, (_, row) => (
        <div key={row} className={cn("grid", columns, row > 0 && "border-t", week ? "h-8 md:h-[3.25rem]" : "h-8")}>
          <div className="flex justify-center pt-1.5">{row % 2 === 0 && <Skeleton className="h-3 w-8" />}</div>
          {Array.from({ length: week ? 7 : 1 }, (_, i) => (
            <div key={i} className={cn("border-l", i > 0 && "max-md:hidden")} />
          ))}
        </div>
      ))}
    </div>
  );
}

function MonthGridSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-sm border">
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={cn("flex justify-center py-2.5", i > 0 && "border-l")}>
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} className={cn("grid h-16 grid-cols-7 md:h-24", row > 0 && "border-t")}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={cn("flex justify-end p-1.5", i > 0 && "border-l")}>
              <Skeleton className="h-3 w-4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// La pantalla del calendario mientras llegan los datos: la misma disposición que calendar-view.tsx.
export function CalendarPageSkeleton({ view = "timeGridWeek", browse = false }: { view?: string; browse?: boolean }) {
  return (
    <div className={cn("grid gap-4", !browse && "lg:grid-cols-[minmax(0,1fr)_16rem]")}>
      <div className="flex min-w-0 flex-col gap-3">
        {/* Barra: flechas y "Hoy", vistas, título y "Agregar sesión" (en el celular el título va arriba) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-9 w-16 rounded-full" />
          </div>
          {!browse && <Skeleton className="ml-auto size-9 rounded-full md:hidden" />}
          <Skeleton className={cn("h-9 w-44 rounded-full", browse ? "ml-auto" : "max-md:hidden")} />
          <div className={cn("order-first flex w-full items-center", !browse && "md:order-none md:w-auto md:flex-1")}>
            <Skeleton className="h-7 w-52" />
          </div>
          {!browse && (
            <div className="flex w-full gap-2 md:w-auto">
              <Skeleton className="h-9 flex-1 rounded-full md:w-40 md:flex-none" />
              <Skeleton className="h-9 flex-1 rounded-full md:hidden" />
            </div>
          )}
        </div>
        {/* Tira de días del celular */}
        {!browse && (
          <div className="grid grid-cols-7 gap-1 md:hidden">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        )}
        <CalendarGridSkeleton view={view} />
      </div>

      {/* Próxima sesión y "No agendados" (en PC, columna a la derecha; en el celular, debajo) */}
      {!browse && (
        <div className="flex min-w-0 flex-col gap-4 lg:self-start">
          <Card size="sm" className="py-0">
            <div className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="size-9 rounded-full max-lg:hidden" />
              <div className="grid flex-1 gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </Card>
          <Card className="gap-3 px-4 max-md:hidden">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </Card>
        </div>
      )}
    </div>
  );
}
