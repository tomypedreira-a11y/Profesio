import { CAPTCHA_FIELD } from "@/lib/turnstile";

// Forma común de la respuesta de los formularios (Server Actions + useActionState).
export type FormState = {
  error?: string; // error general, arriba del formulario
  fieldErrors?: Record<string, string[] | undefined>; // errores por campo
  success?: string; // mensaje de éxito
  values?: Record<string, string>; // lo que escribió el usuario, para no perderlo si hay error
};

// Toma los valores de texto de un formulario (sin contraseñas ni el token del captcha, que sirve una sola vez).
export function formValues(formData: FormData, omit: string[] = []) {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && key !== CAPTCHA_FIELD && !omit.includes(key)) values[key] = value;
  });
  return values;
}

// Key para el <form>: cuando la acción devuelve valores (hubo un error), el formulario se remonta
// y los campos arrancan con lo escrito. Base UI no admite cambiar el defaultValue de un campo ya montado.
export function formKey(state: FormState) {
  return JSON.stringify(state.values ?? null);
}
