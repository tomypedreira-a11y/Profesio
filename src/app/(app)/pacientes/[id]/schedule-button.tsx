"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleSessionDialog } from "@/components/calendar/schedule-session-dialog";

export function ScheduleButton({ patient }: { patient: { id: string; name: string } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <CalendarPlusIcon />
        Agendar sesión
      </Button>
      <ScheduleSessionDialog
        patient={open ? patient : null}
        onOpenChange={setOpen}
        onScheduled={() => router.refresh()}
      />
    </>
  );
}
