"use client";

import { useState } from "react";
import { CalendarPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddSessionDialog } from "./add-session-dialog";
import type { PatientOption } from "./types";

type AddSessionButtonProps = {
  patients: PatientOption[];
  patientId?: string;
  lockPatient?: boolean;
  onAdded?: () => void;
};

// Botón "Agregar sesión" con su panel.
export function AddSessionButton({ patients, patientId, lockPatient, onAdded }: AddSessionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlusIcon />
        Agregar sesión
      </Button>
      <AddSessionDialog
        open={open}
        onOpenChange={setOpen}
        patients={patients}
        patientId={patientId}
        lockPatient={lockPatient}
        onAdded={onAdded}
      />
    </>
  );
}
