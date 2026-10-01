"use client";

// Vista semanal del celular: los 7 días en fila; al tocar uno, el calendario muestra ese día.
import { addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { TreePalmIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type WeekStripProps = {
  // Días de reloj en la zona del perfil (lib/zoned.ts), no en la del dispositivo.
  weekStart: Date; // lunes de la semana
  selected: Date;
  today: Date;
  counts: number[] | null; // sesiones no canceladas de cada día (null mientras carga)
  isVacation: (day: Date) => boolean;
  onSelect: (day: Date) => void;
};

export function WeekStrip({ weekStart, selected, today, counts, isVacation, onSelect }: WeekStripProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Días de la semana">
      {days.map((day, i) => {
        const active = isSameDay(day, selected);
        const count = counts?.[i] ?? 0;
        const vacation = isVacation(day);
        return (
          <button
            key={day.toISOString()}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${format(day, "EEEE d", { locale: es })}, ${count === 1 ? "1 sesión" : `${count} sesiones`}`}
            onClick={() => onSelect(day)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl border-[1.5px] py-1.5 transition-colors",
              active
                ? "border-primary-border bg-primary text-primary-foreground"
                : "border-transparent hover:bg-muted",
              // Días de vacaciones, con el mismo color que en el calendario.
              !active && vacation && "border-(--vacation-border) bg-(--vacation) hover:bg-(--vacation)",
              // Hoy se remarca aunque no esté elegido.
              !active && isSameDay(day, today) && "border-primary-border",
            )}
          >
            <span className={cn("text-[11px] capitalize", !active && "text-muted-foreground")}>
              {format(day, "EEEEEE", { locale: es })}
            </span>
            <span className="flex items-center gap-0.5 text-base leading-none font-semibold">
              {/* Palmerita al costado del número, como en el calendario. */}
              {vacation && <TreePalmIcon className={cn("size-3", !active && "text-(--vacation-border)")} />}
              {format(day, "d")}
            </span>
            {/* Un punto por sesión (hasta 3); con más, el número. */}
            <span className="flex h-3 items-center gap-0.5 text-[10px] leading-none">
              {count > 3 ? (
                count
              ) : (
                Array.from({ length: count }, (_, j) => (
                  <span
                    key={j}
                    className={cn("size-1 rounded-full", active ? "bg-primary-foreground" : "bg-primary-border")}
                  />
                ))
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
