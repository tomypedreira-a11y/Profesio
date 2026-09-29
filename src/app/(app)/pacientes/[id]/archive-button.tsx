"use client";

import { useTransition } from "react";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { toast } from "sonner";
import { setPatientArchived } from "../actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ArchiveButton({ patientId, active, hasSchedule }: { patientId: string; active: boolean; hasSchedule: boolean }) {
  const [pending, startTransition] = useTransition();

  function run(archive: boolean) {
    startTransition(async () => {
      const result = await setPatientArchived(patientId, archive);
      if (result.error) toast.error(result.error);
      else toast.success(archive ? "Paciente archivado." : "Paciente reactivado.");
    });
  }

  // Reactivar no necesita confirmación.
  if (!active) {
    return (
      <Button variant="outline" disabled={pending} onClick={() => run(false)}>
        <ArchiveRestoreIcon />
        Reactivar
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" disabled={pending} />}>
        <ArchiveIcon />
        Archivar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Archivar paciente?</AlertDialogTitle>
          <AlertDialogDescription>
            Deja de aparecer en la lista de pacientes, pero conserva todo su historial y lo podés reactivar cuando quieras.
            {hasSchedule && " También se quitan las sesiones futuras de su horario fijo."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => run(true)}>Archivar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
