// Modalidad de las sesiones (coincide con el check de patients.modality y sessions.modality).
// Cada paciente tiene una; cada sesión usa la del paciente salvo que se cambie para ella.
export const MODALITIES = [
  { value: "in_person", label: "Presencial" },
  { value: "virtual", label: "Virtual" },
] as const;

export type Modality = (typeof MODALITIES)[number]["value"];

export const DEFAULT_MODALITY: Modality = "in_person";

export const isModality = (value: unknown): value is Modality => MODALITIES.some((m) => m.value === value);

export const modalityLabel = (value: string | null | undefined) =>
  MODALITIES.find((m) => m.value === value)?.label ?? "";
