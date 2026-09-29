import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_PALETTE, isPalette, PALETTE_COOKIE } from "@/lib/palettes";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // La paleta se aplica desde el servidor (cookie), así la página no parpadea con otra al abrir.
  const cookie = (await cookies()).get(PALETTE_COOKIE)?.value;
  const palette = isPalette(cookie) ? cookie : DEFAULT_PALETTE;

  return (
    // suppressHydrationWarning: next-themes agrega la clase del tema antes de que cargue React.
    <html
      lang="es"
      suppressHydrationWarning
      data-palette={palette}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
