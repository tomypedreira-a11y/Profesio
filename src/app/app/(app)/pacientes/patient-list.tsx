"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircleIcon, SearchIcon } from "lucide-react";
import { formatPhone, whatsappUrl } from "@/lib/phone";
import { formatSessionShort, sortName } from "@/lib/format";
import type { ScheduleSlot } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PatientListItem = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  dni: string | null;
  schedules: ScheduleSlot[];
  last_session_at: string | null;
  next_session_at: string | null;
};

type SortKey = "alfabetico" | "recientes" | "proximas";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "alfabetico", label: "Alfabético" },
  { value: "recientes", label: "Sesiones más recientes" },
  { value: "proximas", label: "Próximas sesiones" },
];

const collator = new Intl.Collator("es", { sensitivity: "base" });
const byName = (a: PatientListItem, b: PatientListItem) => collator.compare(sortName(a), sortName(b));

// Compara fechas ISO dejando los pacientes sin fecha al final.
function byDate(a: string | null, b: string | null, direction: 1 | -1) {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -direction : direction;
}

// Sin acentos y en minúsculas, para buscar "gomez" y encontrar "Gómez".
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function PatientList({
  patients,
  timeZone,
  showSort = true,
}: {
  patients: PatientListItem[];
  timeZone: string;
  showSort?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("alfabetico");

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    const digits = query.replace(/\D/g, "");
    const filtered = q
      ? patients.filter(
          (p) =>
            normalize(`${p.first_name} ${p.last_name}`).includes(q) ||
            normalize(`${p.last_name} ${p.first_name}`).includes(q) ||
            (digits.length >= 3 && ((p.phone ?? "").includes(digits) || (p.dni ?? "").replace(/\D/g, "").includes(digits))),
        )
      : patients;

    const sorted = [...filtered];
    if (sort === "alfabetico") sorted.sort(byName);
    if (sort === "recientes") sorted.sort((a, b) => byDate(a.last_session_at, b.last_session_at, -1) || byName(a, b));
    if (sort === "proximas") sorted.sort((a, b) => byDate(a.next_session_at, b.next_session_at, 1) || byName(a, b));
    return sorted;
  }, [patients, query, sort]);

  // Qué dato mostrar a la derecha según el orden elegido. En orden alfabético, nada: los días fijos
  // (con 3 o más) le quitaban lugar al nombre, y se ven en la ficha.
  function detail(p: PatientListItem) {
    if (sort === "recientes") return p.last_session_at ? `Última: ${formatSessionShort(p.last_session_at, timeZone)}` : "Sin sesiones";
    if (sort === "proximas") return p.next_session_at ? `Próxima: ${formatSessionShort(p.next_session_at, timeZone)}` : "Sin sesiones";
    return null;
  }

  if (patients.length === 0) return null;

  let lastLetter = "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nombre, teléfono o documento"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            aria-label="Buscar pacientes"
          />
        </div>
        {showSort && (
          <Select value={sort} onValueChange={(value) => value && setSort(value)} items={SORT_OPTIONS}>
            <SelectTrigger aria-label="Ordenar" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay pacientes que coincidan con la búsqueda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((p) => {
            // En orden alfabético, un separador por cada letra (como en los contactos).
            const letter = normalize(sortName(p).charAt(0)).toUpperCase();
            const showLetter = sort === "alfabetico" && !query && letter !== lastLetter;
            lastLetter = letter;
            return (
              <li key={p.id}>
                {showLetter && <div className="px-1 pt-2 pb-1 text-xs font-semibold text-muted-foreground">{letter}</div>}
                <div className="relative">
                  {/* Beige un poco más oscuro que el fondo, remarcado en oliva (como la lista de sesiones). */}
                  <Link
                    href={`/app/pacientes/${p.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border-[1.5px] border-primary-border bg-secondary px-4 py-3 text-secondary-foreground transition-[filter] hover:brightness-95",
                      p.phone && "pr-14",
                    )}
                  >
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-background">
                        {`${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{sortName(p)}</p>
                      <p className="truncate text-sm opacity-75">{p.phone ? formatPhone(p.phone) : "Sin teléfono"}</p>
                    </div>
                    {detail(p) && <span className="shrink-0 text-right text-xs opacity-75">{detail(p)}</span>}
                  </Link>
                  {/* Chat de WhatsApp sin mensaje. Fuera del link de la ficha (no se anidan links), encima de la fila. */}
                  {p.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-2 -translate-y-1/2"
                      nativeButton={false}
                      render={<a href={whatsappUrl(p.phone)} target="_blank" rel="noopener noreferrer" />}
                      aria-label={`Escribirle por WhatsApp a ${p.first_name}`}
                      title="Abrir chat de WhatsApp"
                    >
                      <MessageCircleIcon />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
