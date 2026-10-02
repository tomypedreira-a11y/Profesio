import { Skeleton } from "@/components/ui/skeleton";

// Título y descripción de cada pantalla.
export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

// El mismo encabezado mientras carga la pantalla (loading.tsx): con el título real, que ya se conoce, o en gris.
export function PageHeaderSkeleton({ title, description = true }: { title?: string; description?: boolean }) {
  return (
    <div className="space-y-1">
      {title ? (
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      ) : (
        <Skeleton className="h-8 w-48" />
      )}
      {description && <Skeleton className="my-0.5 h-4 w-40" />}
    </div>
  );
}
