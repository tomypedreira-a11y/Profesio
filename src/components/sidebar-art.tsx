"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Árbol decorativo del panel lateral (solo en PC): claro y translúcido, para no competir con los botones.
// Hay varios y se elige uno al azar cada vez que se abre la app (el panel está en el layout: no cambia al
// navegar). Cada uno tiene una versión por tema, recoloreada con su paleta, y todos el mismo porte:
// en public/decor, la base del tronco está a la misma altura y en el mismo lugar.
// Grande e inclinado hacia la derecha, naciendo desde la esquina de abajo a la izquierda: la raíz queda
// fuera del panel y abajo se desvanece, así el usuario se lee bien. Medidas en rem: acompaña al panel si
// se agranda la letra.
// Va detrás del contenido: en app-sidebar.tsx el encabezado, las secciones y el usuario son `relative`
// y vienen después en el HTML, así se pintan encima.
const TREES = ["tree-1", "tree-2", "tree-3"];

const TREE = "absolute -left-37.5 -bottom-47.5 w-100 max-w-none origin-bottom rotate-20";

const subscribe = () => () => {};

export function SidebarArt() {
  // El azar solo en el navegador: en el servidor (y al hidratar) no se muestra ninguno.
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const [tree] = useState(() => TREES[Math.floor(Math.random() * TREES.length)]);

  return (
    // Se oculta con el panel colapsado en íconos.
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_top,transparent,#000_7rem)] transition-opacity duration-500 group-data-[collapsible=icon]:hidden",
        isClient ? "opacity-100" : "opacity-0",
      )}
    >
      {isClient && (
        <>
          <Image src={`/decor/${tree}-light.webp`} alt="" width={512} height={768} className={`${TREE} opacity-35 dark:hidden`} />
          <Image src={`/decor/${tree}-dark.webp`} alt="" width={512} height={768} className={`${TREE} hidden opacity-30 dark:block`} />
        </>
      )}
    </div>
  );
}
