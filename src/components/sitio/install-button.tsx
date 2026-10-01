"use client";

// "Instalar la app" en la página promocional: solo donde se puede (Chrome, Edge y Android con el aviso del
// navegador; en iPhone/iPad, los pasos de Safari). Si ya está instalada o el navegador no lo permite, no aparece.
import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IOSInstallDialog } from "@/components/pwa/install-app";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallButton() {
  const { ready, canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const [showSteps, setShowSteps] = useState(false);

  if (!ready || isInstalled || (!canInstall && !isIOS)) return null;

  return (
    <>
      <Button variant="ghost" onClick={() => (canInstall ? promptInstall() : setShowSteps(true))}>
        <DownloadIcon />
        Instalar la app
      </Button>
      {isIOS && <IOSInstallDialog open={showSteps} onOpenChange={setShowSteps} />}
    </>
  );
}
