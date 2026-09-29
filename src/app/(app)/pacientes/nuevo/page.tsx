import type { Metadata } from "next";
import { countryOptions } from "@/lib/phone";
import { PageHeader } from "@/components/page-header";
import { createPatient } from "../actions";
import { EMPTY_PATIENT, PatientForm } from "../patient-form";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default function NewPatientPage() {
  return (
    <>
      <PageHeader title="Nuevo paciente" />
      <PatientForm
        action={createPatient}
        defaults={EMPTY_PATIENT}
        countries={countryOptions()}
        submitLabel="Crear paciente"
        cancelHref="/pacientes"
      />
    </>
  );
}
