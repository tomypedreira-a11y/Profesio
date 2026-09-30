"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBackTarget, useRecordNavigation } from "@/lib/back-navigation";

// Flecha del encabezado (celular y PC): la única forma de "volver" en las pantallas. Vuelve paso a paso
// por las pantallas recorridas hasta la sección principal desde la que se entró (ver lib/back-navigation.ts).
export function HeaderBackButton() {
  useRecordNavigation();
  const target = useBackTarget();
  if (!target) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 mr-auto md:ml-0" // empuja el saludo a la derecha
      render={<Link href={target.url} />}
      nativeButton={false}
    >
      <ArrowLeftIcon />
      {target.label}
    </Button>
  );
}
