"use client";

// Pacientes irregulares sin sesión en la semana que se está viendo.
import { CalendarPlusIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnscheduledPatient } from "./types";

type UnscheduledPanelProps = {
  patients: UnscheduledPatient[];
  weekLabel: string;
  onSelect: (patient: UnscheduledPatient) => void;
};

export function UnscheduledPanel({ patients, weekLabel, onSelect }: UnscheduledPanelProps) {
  return (
    <Card size="sm" className="lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>No agendados</CardTitle>
        <CardDescription>Pacientes irregulares sin sesión la semana del {weekLabel}.</CardDescription>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todos tienen sesión esta semana.</p>
        ) : (
          <ul className="-mx-2 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
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
                  <CalendarPlusIcon className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 max-lg:hidden" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
