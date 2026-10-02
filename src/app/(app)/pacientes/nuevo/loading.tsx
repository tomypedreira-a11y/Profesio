// Mientras carga el formulario de paciente nuevo (sin esto se vería el esqueleto de la lista de pacientes).
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
