"use client";

// Instalar Profesio como app: la opción de Configuración y los pasos para iPhone/iPad.
// El estado (si se puede instalar, si ya está instalada, si es iOS) viene de useInstallPrompt.
import { useState } from "react";
import { CircleCheckIcon, DownloadIcon, ShareIcon, SquarePlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

// Safari no tiene botón de instalar: se agrega a la pantalla de inicio desde Compartir.
export function IOSInstallDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar Profesio en tu iPhone o iPad</DialogTitle>
          <DialogDescription>En iPhone hay que usar Safari: los demás navegadores no permiten instalarla.</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 text-sm">
          <li className="flex items-start gap-3">
            <Step n={1} />
            <span>
              Tocá el botón <strong>Compartir</strong>{" "}
              <ShareIcon className="inline size-4 align-text-bottom" aria-label="(cuadrado con una flecha hacia arriba)" />,
              abajo o arriba de la pantalla.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={2} />
            <span>
              Elegí <strong>Agregar a pantalla de inicio</strong>{" "}
              <SquarePlusIcon className="inline size-4 align-text-bottom" aria-hidden />. Si no lo ves, deslizá la
              lista hacia abajo.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={3} />
            <span>
              Tocá <strong>Agregar</strong>. Profesio queda en tu pantalla de inicio, como cualquier app.
            </span>
          </li>
        </ol>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-primary-border bg-primary text-xs font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

// Opción de Configuración: qué se puede hacer depende del navegador.
export function InstallAppSettings() {
  const { ready, canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const [showSteps, setShowSteps] = useState(false);

  // En el servidor no se sabe qué navegador es: hasta hidratar, un lugar reservado.
  if (!ready) return <Skeleton className="h-9 w-56" />;

  if (isInstalled) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <CircleCheckIcon className="size-4 text-primary-border" />
        Ya estás usando la app instalada.
      </p>
    );
  }

  if (canInstall) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Abrila desde el escritorio o la pantalla de inicio, como cualquier app.
        </p>
        <Button onClick={promptInstall}>
          <DownloadIcon />
          Instalar Profesio
        </Button>
      </div>
    );
  }

  if (isIOS) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Abrila desde la pantalla de inicio, como cualquier app.
        </p>
        <Button variant="outline" onClick={() => setShowSteps(true)}>
          <ShareIcon />
          Cómo instalarla
        </Button>
        <IOSInstallDialog open={showSteps} onOpenChange={setShowSteps} />
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Para instalarla, abrí Profesio en Chrome o Edge.</p>;
}
