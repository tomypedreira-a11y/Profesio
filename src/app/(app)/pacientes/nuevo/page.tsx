import type { Metadata } from "next";
import { countryOptions } from "@/lib/phone";
import { DEFAULT_MODALITY, isModality } from "@/lib/modality";
import { getProfile } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { createPatient } from "../actions";
import { PatientForm, type PatientFormDefaults } from "../patient-form";

export const metadata: Metadata = { title: "Nuevo paciente" };

// Acá y no en patient-form.tsx: desde un Server Component, lo que exporta un módulo "use client" llega como
// referencia, y no se le pueden cambiar campos (la modalidad).
const EMPTY_PATIENT: PatientFormDefaults = {
  first_name: "",
  last_name: "",
  schedules: [],
  phone_country: "AR",
  phone: "",
  dni: "",
  email: "",
  birth_date: "",
  session_fee: "",
  modality: DEFAULT_MODALITY,
};

export default async function NewPatientPage() {
  // La modalidad preseleccionada es la habitual del perfil (Configuración → Sesiones); si no, presencial.
  const profile = await getProfile();
  const modality = isModality(profile?.default_modality) ? profile.default_modality : DEFAULT_MODALITY;
  return (
    <>
      <PageHeader title="Nuevo paciente" />
      <PatientForm
        action={createPatient}
        defaults={{ ...EMPTY_PATIENT, modality }}
        countries={countryOptions()}
        submitLabel="Crear paciente"
        cancelHref="/pacientes"
      />
    </>
  );
}
