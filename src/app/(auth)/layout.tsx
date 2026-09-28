// Diseño de las pantallas de login y registro: una tarjeta centrada.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          P
        </span>
        Profesio
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
