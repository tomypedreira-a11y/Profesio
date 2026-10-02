// Mientras cargan los datos profesionales: el formulario (nombre y apellido, matrícula).
import { FormSkeleton } from "@/components/list-skeletons";
import { PageHeaderSkeleton } from "@/components/page-header";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton title="Mi perfil" />
      <FormSkeleton fields={3} />
    </>
  );
}
