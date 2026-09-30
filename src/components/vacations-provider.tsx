"use client";

// Períodos de vacaciones del psicólogo: los usan el calendario (para pintarlos) y "Agregar sesión".
// Los carga el layout de la app; al cargar o quitar vacaciones se revalida y llegan actualizados.
import { createContext, useContext } from "react";
import type { Vacation } from "@/lib/vacations";

const VacationsContext = createContext<readonly Vacation[]>([]);

export function VacationsProvider({ value, children }: { value: readonly Vacation[]; children: React.ReactNode }) {
  return <VacationsContext.Provider value={value}>{children}</VacationsContext.Provider>;
}

export const useVacations = () => useContext(VacationsContext);
