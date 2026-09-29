import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, FieldLabel } from "@/components/ui/field";
import { PageHeader } from "@/components/page-header";
import { SettingsSection } from "./settings-section";
import { ThemeModeSelector } from "./theme-mode-selector";

export const metadata: Metadata = { title: "Configuración" };

// Preferencias del psicólogo, agrupadas en secciones (ver settings-section.tsx).
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme")
    .eq("id", data.claims.sub)
    .single();

  return (
    <>
      <PageHeader title="Configuración" description="Preferencias de la app." />

      <div className="flex max-w-3xl flex-col gap-4">
        <SettingsSection title="Personalización" description="Los cambios se ven al instante y se guardan en tu cuenta.">
          <Field>
            <FieldLabel>Modo</FieldLabel>
            <ThemeModeSelector value={profile?.theme ?? "system"} />
          </Field>
        </SettingsSection>
      </div>
    </>
  );
}
