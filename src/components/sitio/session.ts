import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// ¿Hay una sesión iniciada? Las páginas públicas se ven igual con o sin sesión: solo cambia el botón principal
// ("Ir a mi agenda" en lugar de "Ingresar" / "Probala gratis"). cache: una sola consulta por request.
export const hasSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims);
});
