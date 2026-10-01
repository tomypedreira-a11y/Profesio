import type { Metadata } from "next";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Contraseña nueva" };

// Llega desde el link de recuperación, con la sesión que abrió el link (sin sesión, el proxy manda al login).
export default function NewPasswordPage() {
  return <NewPasswordForm />;
}
