import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, license_number")
    .eq("id", data.claims.sub)
    .single();

  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos como profesional." />
      <ProfileForm
        email={data.claims.email ?? ""}
        profile={profile ?? { first_name: "", last_name: "", license_number: null }}
      />
    </>
  );
}
