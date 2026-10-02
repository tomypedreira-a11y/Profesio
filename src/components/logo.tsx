// Marca de Profesio: el árbol del logo en un recuadro beige, como el ícono de la app (también en el tema oscuro).
// La imagen la genera scripts/generate-icons.mjs.
import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-[#faf3e5] p-0.5 ring-1 ring-black/5",
        className,
      )}
    >
      <Image src="/icons/logo-mark.png" alt="" width={96} height={96} className="size-full object-contain" />
    </span>
  );
}
