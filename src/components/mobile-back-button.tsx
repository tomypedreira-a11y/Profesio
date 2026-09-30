"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// En el celular, cada pantalla vuelve al calendario desde el encabezado (en PC está el panel lateral).
// No aparece en el calendario ni en su pantalla de vistas (/calendario), que tiene su propio botón.
export function MobileBackButton() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/calendario")) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 mr-auto md:hidden" // empuja el saludo a la derecha
      render={<Link href="/" />}
      nativeButton={false}
    >
      <ArrowLeftIcon />
      Calendario
    </Button>
  );
}
