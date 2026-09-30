import type { Metadata, Viewport } from "next";
import { Geist_Mono, Lora, Outfit } from "next/font/google";
import { KeyboardDismiss } from "@/components/keyboard-dismiss";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { FONT_SIZE_SCRIPT } from "@/lib/font-size";
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
  title: { default: "Profesio", template: "%s · Profesio" },
  description: "Agenda y gestión de pacientes para psicólogos.",
};

// "cover" habilita env(safe-area-inset-bottom): la barra inferior no queda debajo de la barra de gestos del iPhone.
export const viewport: Viewport = {
  viewportFit: "cover",
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
        {/* --toast-bottom lo define globals.css cuando está la barra inferior del celular. */}
        <Toaster
          offset={{ bottom: "var(--toast-bottom, 24px)" }}
          mobileOffset={{ bottom: "var(--toast-bottom, 16px)" }}
        />
      </body>
    </html>
  );
}