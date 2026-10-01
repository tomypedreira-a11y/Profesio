import type { Metadata } from "next";
import { IDLE_LOGOUT_REASON } from "@/lib/idle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, motivo } = await searchParams;
  return <LoginForm linkError={error === "link-invalido"} idleLogout={motivo === IDLE_LOGOUT_REASON} />;
}
