import type { Metadata, Viewport } from "next";
import { Geist_Mono, Lora, Outfit } from "next/font/google";
import { KeyboardDismiss } from "@/components/keyboard-dismiss";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { SpeedInsights } from "@/components/speed-insights";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { FONT_SIZE_SCRIPT } from "@/lib/font-size";
import { SITE_URL } from "@/lib/legal";
import "./globals.css";

// Texto en Outfit (geométrica suave) y títulos en Lora (serif cálida).
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base de las URLs absolutas (OpenGraph, canonical): siempre la de producción, también en las previews.
  metadataBase: new URL(SITE_URL),
  title: { default: "Profesio", template: "%s · Profesio" },
  description: "Agenda y gestión de pacientes para psicólogos.",
  // Instalada en iPhone/iPad (Agregar a pantalla de inicio): se abre como app, sin la barra de Safari.
  appleWebApp: { capable: true, title: "Profesio", statusBarStyle: "default" },
  // favicon.ico lo agrega Next solo. icon.png (src/app) también, pero solo si no hay `icons` acá: como el de iOS
  // se declara acá, icon.png va explícito. Los genera scripts/generate-icons.mjs.
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "64x64" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

// "cover" habilita env(safe-area-inset-bottom): la barra inferior no queda debajo de la barra de gestos del iPhone.
// themeColor: color de la barra del navegador y de la ventana de la app instalada, según el tema del sistema
// (el fondo de cada tema: beige en el claro, violeta noche en el oscuro).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf3e5" },
    { media: "(prefers-color-scheme: dark)", color: "#151120" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes agrega la clase del tema antes de que cargue React.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${outfit.variable} ${lora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica el tamaño de letra recordado antes de pintar (lo mismo hace next-themes con el tema).
            suppressHydrationWarning: algunas extensiones del navegador reescriben los <script> del <head>. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FONT_SIZE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <KeyboardDismiss />
        <ServiceWorkerRegister />
        <SpeedInsights />
        {/* --toast-bottom lo define globals.css cuando está la barra inferior del celular. */}
        <Toaster
          offset={{ bottom: "var(--toast-bottom, 24px)" }}
          mobileOffset={{ bottom: "var(--toast-bottom, 16px)" }}
        />
      </body>
    </html>
  );
}