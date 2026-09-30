"use client";

// Pacientes irregulares sin sesión en la semana que se está viendo.
// En PC es un panel al costado del calendario; en el celular, una lista que se abre con un botón.
import { CalendarPlusIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UnscheduledPatient } from "./types";

type UnscheduledListProps = {
  patients: UnscheduledPatient[];
  onSelect: (patient: UnscheduledPatient) => void;
  vertical?: boolean; // siempre en columna (en la lista del celular)
};

function UnscheduledList({ patients, onSelect, vertical }: UnscheduledListProps) {
  if (patients.length === 0) {
    return <p className="text-sm text-muted-foreground">Todos tienen sesión esta semana.</p>;
  }
  return (
    <ul className={cn("-mx-2 flex gap-1", vertical ? "flex-col" : "overflow-x-auto lg:flex-col lg:overflow-visible")}>
      {patients.map((p) => (
        <li key={p.id} className="shrink-0">
          <button
            type="button"
            onClick={() => onSelect(p)}
            className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
            title="Agendar sesión"
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{`${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate">
              {p.first_name} {p.last_name}
            </span>
            <CalendarPlusIcon
              className={cn(
                "ml-auto size-4 text-muted-foreground",
                // En el celular no hay hover: el ícono se ve siempre en la lista.
                !vertical && "opacity-0 transition-opacity group-hover:opacity-100 max-lg:hidden",
              )}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

type UnscheduledPanelProps = {
  patients: UnscheduledPatient[];
  weekLabel: string;
  onSelect: (patient: UnscheduledPatient) => void;
};

export function UnscheduledPanel({ patients, weekLabel, onSelect }: UnscheduledPanelProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>No agendados</CardTitle>
        <CardDescription>Pacientes irregulares sin sesión la semana del {weekLabel}.</CardDescription>
      </CardHeader>
      <CardContent>
        <UnscheduledList patients={patients} onSelect={onSelect} />
      </CardContent>
    </Card>
  );
}

type UnscheduledSheetProps = UnscheduledPanelProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Versión del celular: se abre desde abajo y la lista se desplaza si es larga.
export function UnscheduledSheet({ patients, weekLabel, onSelect, open, onOpenChange }: UnscheduledSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75svh] rounded-t-xl pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="pb-0">
          <SheetTitle>No agendados</SheetTitle>
          <SheetDescription>Pacientes irregulares sin sesión la semana del {weekLabel}.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <UnscheduledList
            patients={patients}
            onSelect={(p) => {
              onOpenChange(false);
              onSelect(p);
            }}
            vertical
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
