"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CalendarClockIcon,
  CalendarDaysIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  LogOutIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarArt } from "@/components/sidebar-art";
import { IOSInstallDialog } from "@/components/pwa/install-app";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { forgetThisDevice } from "@/lib/push-client";

const NAV_ITEMS = [
  { href: "/", label: "Calendario", icon: CalendarDaysIcon },
  { href: "/pacientes", label: "Pacientes", icon: UsersIcon },
  { href: "/sesiones", label: "Sesiones", icon: CalendarClockIcon },
  { href: "/ingresos", label: "Ingresos", icon: WalletIcon },
];

// Lo de la cuenta no va en la lista: se abre desde el usuario, abajo del panel.
const ACCOUNT_ITEMS = [
  { href: "/perfil", label: "Mi perfil", icon: UserRoundIcon },
  { href: "/configuracion", label: "Configuración", icon: SettingsIcon },
];

type AppSidebarProps = {
  user: { firstName: string; lastName: string; email: string };
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [, startTransition] = useTransition();
  // "Instalar app" solo si el navegador lo permite (o en iPhone/iPad, con los pasos de Safari).
  const install = useInstallPrompt();
  const showInstall = install.canInstall || (install.isIOS && !install.isInstalled);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase() ||
    user.email.charAt(0).toUpperCase();
  // Resalta el usuario cuando se está en una pantalla de la cuenta.
  const inAccount = ACCOUNT_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <Sidebar collapsible="icon">
      {/* Dibujo de fondo: va primero y lo demás es `relative`, así queda por detrás. */}
      <SidebarArt />

      <SidebarHeader className="relative">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground">
                P
              </span>
              <span className="font-semibold">Profesio</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="relative">
        <SidebarGroup>
          <SidebarGroupContent>
            {/* Secciones como botones "burbuja" remarcados, igual que el resto de los botones.
                En reposo llevan el fondo del calendario; hover y activo los pintan de verde (ver sidebar.tsx). */}
            <SidebarMenu className="gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/" || pathname.startsWith("/calendario")
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-9 rounded-full border-[1.5px] border-primary-border bg-background px-3 group-data-[collapsible=icon]:p-1.5!"
                      render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="relative">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" isActive={inAccount} />}>
                <Avatar className="size-8 rounded-md">
                  <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName}</span>
                  {/* Con la cuenta activa (fondo verde) el gris no se leía: el email toma el mismo color que el nombre. */}
                  <span className="truncate text-xs text-muted-foreground group-data-active/menu-button:text-inherit">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDownIcon className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-56">
                {ACCOUNT_ITEMS.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => {
                      setOpenMobile(false);
                      router.push(item.href);
                    }}
                  >
                    <item.icon />
                    {item.label}
                  </DropdownMenuItem>
                ))}
                {showInstall && (
                  <DropdownMenuItem
                    onClick={() => (install.canInstall ? install.promptInstall() : setShowIOSSteps(true))}
                  >
                    <DownloadIcon />
                    Instalar app
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    startTransition(async () => {
                      await forgetThisDevice(); // las notificaciones de la cuenta no siguen llegando acá
                      await logout();
                    })
                  }
                >
                  <LogOutIcon />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
      <IOSInstallDialog open={showIOSSteps} onOpenChange={setShowIOSSteps} />
    </Sidebar>
  );
}
