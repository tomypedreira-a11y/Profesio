// Diseño de las pantallas de login y registro: una tarjeta centrada, con árboles de fondo (AuthArt).
import Link from "next/link";
import { AuthArt } from "@/components/auth-art";
import { LogoMark } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-muted p-6">
      <AuthArt />
      {/* A la página promocional. `relative`: por encima de los árboles. */}
      <Link href="/" className="relative flex items-center gap-2 text-lg font-semibold">
        <LogoMark />
        Profesio
      </Link>
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
