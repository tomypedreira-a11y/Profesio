import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { CALENDAR_VIEWS, DEFAULT_CALENDAR_VIEW } from "@/lib/calendar-views";
import { DEFAULT_SESSION_MINUTES, SESSION_LENGTHS } from "@/lib/schedule";
import { isFontSize } from "@/lib/font-size";
import { updateCalendarView, updateSessionLength } from "./actions";
import { DefaultFeeInput } from "./default-fee-input";
import { FontSizeSelector } from "./font-size-selector";
import { PreferenceSelect } from "./preference-select";
import { SettingsSection } from "./settings-section";
import { ThemeModeSelector } from "./theme-mode-selector";

export const metadata: Metadata = { title: "Configuración" };

const SESSION_LENGTH_ITEMS = SESSION_LENGTHS.map((l) => ({ value: String(l.minutes), label: l.label }));

// Preferencias del psicólogo, agrupadas en secciones (ver settings-section.tsx).
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme, font_size, calendar_view, default_session_minutes, default_session_fee")
    .eq("id", data.claims.sub)
    .single();

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Preferencias de la app y de tu cuenta. Los cambios se aplican y se guardan al instante."
      />

      <div className="flex max-w-3xl flex-col gap-4">
        <SettingsSection title="Personalización">
          <Field>
            <FieldLabel>Modo</FieldLabel>
            <ThemeModeSelector value={profile?.theme ?? "system"} />
          </Field>
          <Field>
            <FieldLabel>Tamaño de letra</FieldLabel>
            <FontSizeSelector value={isFontSize(profile?.font_size) ? profile.font_size : "normal"} />
            <FieldDescription>Agranda los textos y todo lo demás en proporción, en esta y en tus otras pantallas.</FieldDescription>
          </Field>
        </SettingsSection>

        <SettingsSection title="Calendario">
          <Field>
            <FieldLabel htmlFor="calendar_view">Vista inicial</FieldLabel>
            <PreferenceSelect
              id="calendar_view"
              value={profile?.calendar_view ?? DEFAULT_CALENDAR_VIEW}
              items={CALENDAR_VIEWS}
              save={updateCalendarView}
            />
            <FieldDescription>Cómo se muestra el calendario cada vez que entrás a la app.</FieldDescription>
          </Field>
        </SettingsSection>

        <SettingsSection title="Sesiones" description="Valores que se usan cuando no indicás otros.">
          <Field>
            <FieldLabel htmlFor="default_session_minutes">Duración</FieldLabel>
            <PreferenceSelect
              id="default_session_minutes"
              value={String(profile?.default_session_minutes ?? DEFAULT_SESSION_MINUTES)}
              items={SESSION_LENGTH_ITEMS}
              save={updateSessionLength}
            />
            <FieldDescription>
              Al agendar una sesión sin hora de fin, se usa esta duración. No cambia las sesiones ya agendadas.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="default_session_fee">Valor por sesión ($)</FieldLabel>
            <DefaultFeeInput
              id="default_session_fee"
              value={profile?.default_session_fee ?? null}
              description="Opcional. Lo usan los pacientes que no tienen un valor propio. Las sesiones ya realizadas conservan el valor que tenían."
            />
          </Field>
        </SettingsSection>

        <SettingsSection title="Cuenta">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" value={data.claims.email ?? ""} disabled readOnly className="sm:max-w-sm" />
            <FieldDescription>Es el email con el que ingresás a Profesio.</FieldDescription>
          </Field>
        </SettingsSection>
      </div>
    </>
  );
}
