// Mientras carga la configuración: las secciones con sus opciones.
import { CardSkeleton } from "@/components/list-skeletons";
import { PageHeaderSkeleton } from "@/components/page-header";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Configuración" />
      <div className="flex max-w-3xl flex-col gap-4">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={3} />
      </div>
    </>
  );
}
