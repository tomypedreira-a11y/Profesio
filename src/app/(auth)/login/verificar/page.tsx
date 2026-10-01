import type { Metadata } from "next";
import { safeNextPath } from "@/lib/safe-path";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

// Segundo paso del login, con la verificación en dos pasos activada. El proxy manda acá cualquier ruta
// privada mientras la sesión no pasó el código (y saca de acá a quien no lo necesita).
export default async function VerifyPage({ searchParams }: PageProps<"/login/verificar">) {
  const { next } = await searchParams;
  return <VerifyForm next={safeNextPath(typeof next === "string" ? next : undefined)} />;
}
