// Estructura de la app para usuarios logueados: panel lateral (en el celular, barra inferior) + contenido.
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getClaims, getProfile } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { FontSizeSync } from "@/components/font-size-sync";
import { HeaderBackButton } from "@/components/header-back-button";
import { HeaderTitle } from "@/components/header-title";
import { IdleLogout } from "@/components/idle-logout";
import { MobileNav } from "@/components/mobile-nav";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { ProfileDefaultsProvider } from "@/components/profile-defaults-provider";
import { VacationsProvider } from "@/components/vacations-provider";
import { ThemeSync } from "@/components/theme-provider";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DEFAULT_SESSION_MINUTES } from "@/lib/schedule";
import { DEFAULT_TIME_ZONE } from "@/lib/timezones";
import { DEFAULT_IDLE_MINUTES } from "@/lib/idle";

// Las pantallas tienen su loading.tsx: este layout (panel lateral, encabezado y barra inferior) se muestra apenas
// tiene la sesión y el perfil, y la página llega después en su lugar. Por eso acá solo se lee lo indispensable.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Todo a la vez: getProfile() y getClaims() quedan guardados para la página (cache), y vacations no depende
  // de la sesión (las RLS ya filtran por psicólogo).
  const [claims, profile, { data: vacations }, cookieStore] = await Promise.all([
    getClaims(),
    getProfile(),
    supabase.from("vacations").select("id, start_date, end_date").order("start_date"),
    cookies(),
  ]);
  if (!claims) redirect("/login");

  // Recuerda si el panel lateral estaba abierto o colapsado.
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const user = {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    email: claims.email ?? "",
  };

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <ThemeSync theme={profile?.theme ?? "system"} />
      <FontSizeSync size={profile?.font_size ?? "normal"} />
      <IdleLogout timeoutMinutes={profile?.idle_timeout_minutes ?? DEFAULT_IDLE_MINUTES} />
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          {/* En el celular se navega con la barra inferior: el panel lateral no se abre. */}
          <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
          <Separator orientation="vertical" className="mr-2 hidden h-4 md:block" />
          {/* Flecha para volver (también registra el recorrido).
              Suspense: lee los filtros de la URL (useSearchParams). */}
          <Suspense fallback={null}>
            <HeaderBackButton />
          </Suspense>
          {/* En px (no rem): no cambia con el tamaño de letra elegido en Configuración. */}
          <HeaderTitle firstName={user.firstName} className="min-w-0 text-[20px] leading-tight font-medium text-muted-foreground" />
        </header>
        <OfflineBanner />
        {/* Abajo deja lugar para la barra inferior del celular. */}
        <div className="flex flex-1 flex-col gap-4 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
          <ProfileDefaultsProvider
            value={{
              sessionMinutes: profile?.default_session_minutes ?? DEFAULT_SESSION_MINUTES,
              sessionFee: profile?.default_session_fee ?? null,
              timeZone: profile?.timezone ?? DEFAULT_TIME_ZONE,
            }}
          >
            <VacationsProvider value={vacations ?? []}>{children}</VacationsProvider>
          </ProfileDefaultsProvider>
        </div>
      </SidebarInset>
      <MobileNav user={user} />
    </SidebarProvider>
  );
}
