// Estructura de la app para usuarios logueados: panel lateral (en el celular, barra inferior) + contenido.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ProfileDefaultsProvider } from "@/components/profile-defaults-provider";
import { ThemeSync } from "@/components/theme-provider";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DEFAULT_SESSION_MINUTES } from "@/lib/schedule";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, theme, default_session_minutes, default_session_fee")
    .eq("id", claims.sub)
    .single();

  // Recuerda si el panel lateral estaba abierto o colapsado.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  const user = {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    email: claims.email ?? "",
  };

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <ThemeSync theme={profile?.theme ?? "system"} />
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          {/* En el celular se navega con la barra inferior: el panel lateral no se abre. */}
          <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
          <Separator orientation="vertical" className="mr-2 hidden h-4 md:block" />
          <span className="text-sm font-medium text-muted-foreground">Profesio</span>
        </header>
        {/* Abajo deja lugar para la barra inferior del celular. */}
        <div className="flex flex-1 flex-col gap-4 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
          <ProfileDefaultsProvider
            value={{
              sessionMinutes: profile?.default_session_minutes ?? DEFAULT_SESSION_MINUTES,
              sessionFee: profile?.default_session_fee ?? null,
            }}
          >
            {children}
          </ProfileDefaultsProvider>
        </div>
      </SidebarInset>
      <MobileNav user={user} />
    </SidebarProvider>
  );
}
