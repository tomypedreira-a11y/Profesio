"use client";

// Valores por defecto del perfil que usan los formularios:
// - duración de las sesiones, para completar el fin cuando se deja vacío;
// - valor por sesión, que usan los pacientes sin valor propio;
// - zona horaria: "hoy" y las fechas se calculan en la del perfil, no en la del dispositivo (lib/zoned.ts);
// - mensaje de recordatorio por WhatsApp (lib/whatsapp.ts).
// Los carga el layout de la app, así están disponibles en cualquier pantalla.
import { createContext, useContext } from "react";
import { DEFAULT_SESSION_MINUTES } from "@/lib/schedule";
import { DEFAULT_TIME_ZONE } from "@/lib/timezones";
import { DEFAULT_REMINDER_TEMPLATE } from "@/lib/whatsapp";

type ProfileDefaults = { sessionMinutes: number; sessionFee: number | null; timeZone: string; reminderTemplate: string };

const ProfileDefaultsContext = createContext<ProfileDefaults>({
  sessionMinutes: DEFAULT_SESSION_MINUTES,
  sessionFee: null,
  timeZone: DEFAULT_TIME_ZONE,
  reminderTemplate: DEFAULT_REMINDER_TEMPLATE,
});

export function ProfileDefaultsProvider({ value, children }: { value: ProfileDefaults; children: React.ReactNode }) {
  return <ProfileDefaultsContext.Provider value={value}>{children}</ProfileDefaultsContext.Provider>;
}

export const useSessionLength = () => useContext(ProfileDefaultsContext).sessionMinutes;
export const useDefaultFee = () => useContext(ProfileDefaultsContext).sessionFee;
export const useTimeZone = () => useContext(ProfileDefaultsContext).timeZone;
export const useReminderTemplate = () => useContext(ProfileDefaultsContext).reminderTemplate;
