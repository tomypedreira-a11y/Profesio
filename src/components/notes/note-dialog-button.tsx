"use client";

// Botón que abre el editor de un informe en un diálogo (usado en la lista de informes).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NoteEditor } from "./note-editor";

type NoteDialogButtonProps = {
  sessionId: string;
  timeZone: string;
  sessionLabel: string;
  label: string;
};

export function NoteDialogButton({ sessionId, timeZone, sessionLabel, label }: NoteDialogButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Informe de sesión</DialogTitle>
            <DialogDescription className="first-letter:uppercase">{sessionLabel}</DialogDescription>
          </DialogHeader>
          {open && <NoteEditor sessionId={sessionId} timeZone={timeZone} onSaved={() => router.refresh()} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
