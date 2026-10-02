import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClaims, getProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  // El mismo perfil que ya leyó el layout (cache): en una carga completa, sin otra consulta.
  const [claims, profile] = await Promise.all([getClaims(), getProfile()]);
  if (!claims) redirect("/app/login");

  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos como profesional." />
      {/* Solo los campos del formulario: no se manda la fila entera al navegador. */}
      <ProfileForm
        profile={{
          first_name: profile?.first_name ?? "",
          last_name: profile?.last_name ?? "",
          license_number: profile?.license_number ?? null,
        }}
      />
    </>
  );
}
