// Forma común de la respuesta de los formularios (Server Actions + useActionState).
export type FormState = {
  error?: string; // error general, arriba del formulario
  fieldErrors?: Record<string, string[] | undefined>; // errores por campo
  success?: string; // mensaje de éxito
  values?: Record<string, string>; // lo que escribió el usuario, para no perderlo si hay error
};

// Toma los valores de texto de un formulario (sin contraseñas).
export function formValues(formData: FormData, omit: string[] = []) {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !omit.includes(key)) values[key] = value;
  });
  return values;
}
