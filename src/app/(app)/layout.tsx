// Estructura de la app para usuarios logueados: panel lateral + contenido.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PALETTE } from "@/lib/palettes";
import { AppSidebar } from "@/components/app-sidebar";
import { PaletteSync, ThemeSync } from "@/components/theme-provider";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, theme, palette")
    .eq("id", claims.sub)
    .single();

  // Recuerda si el panel lateral estaba abierto o colapsado.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <ThemeSync theme={profile?.theme ?? "system"} />
      <PaletteSync palette={profile?.palette ?? DEFAULT_PALETTE} />
      <AppSidebar
        user={{
          firstName: profile?.first_name ?? "",
          lastName: profile?.last_name ?? "",
          email: claims.email ?? "",
        }}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium text-muted-foreground">Profesio</span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
