// Mientras carga el formulario para editar al paciente (sin esto se vería el esqueleto de la ficha).
import { FormSkeleton } from "@/components/list-skeletons";
import { PageHeaderSkeleton } from "@/components/page-header";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FormSkeleton fields={6} />
    </>
  );
}
