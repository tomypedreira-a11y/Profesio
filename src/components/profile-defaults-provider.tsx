"use client";

// Valores por defecto del perfil que usan los formularios:
// - duración de las sesiones, para completar el fin cuando se deja vacío;
// - valor por sesión, que usan los pacientes sin valor propio.
// Los carga el layout de la app, así están disponibles en cualquier pantalla.
import { createContext, useContext } from "react";
import { DEFAULT_SESSION_MINUTES } from "@/lib/schedule";

type ProfileDefaults = { sessionMinutes: number; sessionFee: number | null };

const ProfileDefaultsContext = createContext<ProfileDefaults>({
  sessionMinutes: DEFAULT_SESSION_MINUTES,
  sessionFee: null,
});

export function ProfileDefaultsProvider({ value, children }: { value: ProfileDefaults; children: React.ReactNode }) {
  return <ProfileDefaultsContext.Provider value={value}>{children}</ProfileDefaultsContext.Provider>;
}

export const useSessionLength = () => useContext(ProfileDefaultsContext).sessionMinutes;
export const useDefaultFee = () => useContext(ProfileDefaultsContext).sessionFee;
