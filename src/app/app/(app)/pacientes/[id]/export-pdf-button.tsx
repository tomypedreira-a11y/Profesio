"use client";

// "Exportar PDF": descarga el libro de sesiones (lo genera el servidor en ./libro/route.ts).
// Con fetch y no con un link: muestra "Generando…", avisa si falla y, si la sesión venció, lleva al login
// (un link común descargaría la pantalla de login como archivo). Tampoco es un <Link>: Next lo precargaría
// y cada precarga sería una exportación. El PDF queda en memoria hasta que el navegador lo guarda.
import { useState } from "react";
import { FileDownIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ExportPdfButton({ patientId }: { patientId: string }) {
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const response = await fetch(`/app/pacientes/${patientId}/libro`, { cache: "no-store" });
      // El proxy redirige al login (sesión vencida o inactividad) o al código de verificación.
      if (response.redirected && !response.headers.get("content-type")?.includes("application/pdf")) {
        window.location.assign(response.url);
        return;
      }
      if (!response.ok) throw new Error(String(response.status));

      const name =
        response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "libro-de-sesiones.pdf";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      // Después de que el navegador empezó la descarga, se suelta la memoria.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      toast.error("No se pudo generar el PDF. Volvé a intentar en unos minutos.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" onClick={download} disabled={pending}>
      {pending ? <Loader2Icon className="animate-spin" /> : <FileDownIcon />}
      {pending ? "Generando…" : "Exportar PDF"}
    </Button>
  );
}
