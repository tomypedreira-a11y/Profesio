import type { Metadata } from "next";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecoverPage({ searchParams }: PageProps<"/app/recuperar">) {
  const { error } = await searchParams;
  return <RecoverForm linkError={error === "link-invalido"} />;
}
