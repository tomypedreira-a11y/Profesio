import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { countryOptions, splitPhone } from "@/lib/phone";
import { toSlots } from "@/lib/schedule";
import { DEFAULT_MODALITY, isModality } from "@/lib/modality";
import { PageHeader } from "@/components/page-header";
import { updatePatient } from "../../actions";
import { PatientForm, type PatientFormDefaults } from "../../patient-form";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function EditPatientPage({ params }: PageProps<"/app/pacientes/[id]/editar">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: p } = await supabase.from("patient_list").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();

  const phone = splitPhone(p.phone);
  const defaults: PatientFormDefaults = {
    first_name: p.first_name ?? "",
    last_name: p.last_name ?? "",
    schedules: toSlots(p.schedules),
    phone_country: phone.country,
    phone: phone.national,
    dni: p.dni ?? "",
    email: p.email ?? "",
    // La base guarda AAAA-MM-DD; el formulario usa DD/MM/AAAA.
    birth_date: p.birth_date ? p.birth_date.split("-").reverse().join("/") : "",
    session_fee: p.session_fee !== null ? String(p.session_fee).replace(".", ",") : "",
    modality: isModality(p.modality) ? p.modality : DEFAULT_MODALITY,
  };

  return (
    <>
      <PageHeader title={`Editar: ${p.first_name} ${p.last_name}`} />
      <PatientForm
        action={updatePatient.bind(null, id)}
        defaults={defaults}
        countries={countryOptions()}
        submitLabel="Guardar cambios"
        cancelHref={`/app/pacientes/${id}`}
        isEdit
        archived={!p.active}
      />
    </>
  );
}
