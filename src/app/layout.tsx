import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        {/* --toast-bottom lo define globals.css cuando está la barra inferior del celular. */}
        <Toaster
          offset={{ bottom: "var(--toast-bottom, 24px)" }}
          mobileOffset={{ bottom: "var(--toast-bottom, 16px)" }}
        />
      </body>
    </html>
  );
}