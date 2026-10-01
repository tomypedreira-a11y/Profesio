import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { InstallAppSettings } from "@/components/pwa/install-app";
import { NotificationSettings } from "./notification-settings";
import { CALENDAR_VIEWS, DEFAULT_CALENDAR_VIEW } from "@/lib/calendar-views";
import { DEFAULT_SESSION_MINUTES, SESSION_LENGTHS } from "@/lib/schedule";
import { isFontSize } from "@/lib/font-size";
import { DEFAULT_TIME_ZONE, timeZoneItems } from "@/lib/timezones";
import { DEFAULT_IDLE_MINUTES, IDLE_TIMEOUTS } from "@/lib/idle";
import { updateCalendarView, updateIdleTimeout, updateSessionLength, updateTimeZone } from "./actions";
import { ChangePassword } from "./change-password";
import { DefaultFeeInput } from "./default-fee-input";
import { FontSizeSelector } from "./font-size-selector";
import { MfaSettings } from "./mfa-settings";
import { PreferenceSelect } from "./preference-select";
import { SettingsSection } from "./settings-section";
import { SignOutEverywhere } from "./sign-out-everywhere";
import { ThemeModeSelector } from "./theme-mode-selector";
import { VacationSettings } from "./vacation-settings";

export const metadata: Metadata = { title: "Configuración" };

const SESSION_LENGTH_ITEMS = SESSION_LENGTHS.map((l) => ({ value: String(l.minutes), label: l.label }));

// Preferencias del psicólogo, agrupadas en secciones (ver settings-section.tsx).
export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const [{ data: profile }, { data: factors }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "theme, font_size, calendar_view, default_session_minutes, default_session_fee, timezone, reminder_minutes, daily_summary_enabled, daily_summary_time, notification_show_name, idle_timeout_minutes",
      )
      .eq("id", data.claims.sub)
      .single(),
    supabase.auth.mfa.listFactors(),
  ]);

  // Dispositivos de la verificación en dos pasos (solo los verificados).
  const timeZone = profile?.timezone ?? DEFAULT_TIME_ZONE;
  const mfaDevices = (factors?.totp ?? []).map((f) => ({
    id: f.id,
    name: f.friendly_name || "Dispositivo",
    added: formatInTimeZone(f.created_at, timeZone, "dd/MM/yyyy"),
  }));

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
          <Field>
            <FieldLabel htmlFor="timezone">Zona horaria</FieldLabel>
            <PreferenceSelect
              id="timezone"
              value={profile?.timezone ?? DEFAULT_TIME_ZONE}
              items={timeZoneItems(profile?.timezone ?? DEFAULT_TIME_ZONE)}
              save={updateTimeZone}
            />
            <FieldDescription>
              La agenda se muestra en el horario de este país, aunque abras la app desde otro lugar. Si la cambiás,
              tus sesiones agendadas y tus horarios fijos conservan su hora.
            </FieldDescription>
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

        <SettingsSection
          title="Notificaciones"
          description="Recordatorios de sesión y resumen del día. Se activan en cada dispositivo por separado."
        >
          <NotificationSettings
            preferences={{
              reminderMinutes: profile ? profile.reminder_minutes : 10,
              dailySummaryEnabled: profile?.daily_summary_enabled ?? false,
              dailySummaryTime: profile?.daily_summary_time ?? "08:00",
              showName: profile?.notification_show_name ?? false,
            }}
          />
        </SettingsSection>

        <SettingsSection title="Vacaciones" description="Los días de vacaciones se pintan en el calendario.">
          <Field>
            <FieldLabel htmlFor="vacation_range">Períodos</FieldLabel>
            <VacationSettings />
          </Field>
        </SettingsSection>

        <SettingsSection
          id="instalar"
          title="Instalar la app"
          description="Usá Profesio como una app más de tu computadora o tu celular."
        >
          <Field>
            <InstallAppSettings />
          </Field>
        </SettingsSection>

        <SettingsSection title="Cuenta">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" value={data.claims.email ?? ""} disabled readOnly className="sm:max-w-sm" />
            <FieldDescription>Es el email con el que ingresás a Profesio.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Contraseña</FieldLabel>
            <ChangePassword />
          </Field>
          <Field>
            <FieldLabel htmlFor="idle_timeout_minutes">Cerrar sesión por inactividad</FieldLabel>
            <PreferenceSelect
              id="idle_timeout_minutes"
              value={String(profile?.idle_timeout_minutes ?? DEFAULT_IDLE_MINUTES)}
              items={IDLE_TIMEOUTS}
              save={updateIdleTimeout}
            />
            <FieldDescription>
              Si no usás Profesio durante ese tiempo, la sesión se cierra sola (te avisamos un minuto antes). Protege
              los datos de tus pacientes si dejás la compu o el celular desbloqueados.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Verificación en dos pasos</FieldLabel>
            <MfaSettings devices={mfaDevices} />
          </Field>
          <Field>
            <FieldLabel>Sesiones abiertas</FieldLabel>
            <SignOutEverywhere />
            <FieldDescription>
              Útil si perdiste el celular o ingresaste desde una computadora compartida.
            </FieldDescription>
          </Field>
        </SettingsSection>
      </div>
    </>
  );
}
