"use client";

// Vacaciones: lista de períodos cargados (los que no terminaron) y alta de uno nuevo.
// A diferencia de las demás opciones, se agrega con botón y confirmación: quita sesiones del calendario.
import { useState, useTransition } from "react";
import { format, parseISO, startOfDay } from "date-fns";
import { es as dateFnsEs } from "date-fns/locale";
import { CalendarIcon, TreePalmIcon, Trash2Icon } from "lucide-react";
import { es } from "react-day-picker/locale";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVacations } from "@/components/vacations-provider";
import { dayKey, type Vacation } from "@/lib/vacations";
import { addVacation, removeVacation } from "./actions";

const sessions = (n: number) => (n === 1 ? "1 sesión" : `${n} sesiones`);

// "lunes 5 de enero" (con el año si no es el actual).
function formatDay(date: Date) {
  const withYear = date.getFullYear() !== new Date().getFullYear();
  return format(date, withYear ? "EEEE d 'de' MMMM 'de' yyyy" : "EEEE d 'de' MMMM", { locale: dateFnsEs });
}

function formatRange(from: Date, to: Date) {
  return from.getTime() === to.getTime() ? `El ${formatDay(from)}` : `Del ${formatDay(from)} al ${formatDay(to)}`;
}

export function VacationSettings() {
  const today = dayKey(new Date());
  // Las que ya terminaron no se muestran (siguen pintadas en el calendario).
  const vacations = useVacations().filter((v) => v.end_date >= today);

  return (
    <>
      {vacations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tenés vacaciones cargadas.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vacations.map((v) => (
            <VacationItem key={v.id} vacation={v} current={v.start_date <= today} />
          ))}
        </ul>
      )}
      <AddVacation />
    </>
  );
}

function VacationItem({ vacation, current }: { vacation: Vacation; current: boolean }) {
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await removeVacation(vacation.id);
      if (result.error) toast.error(result.error);
      else
        toast.success(
          result.restored
            ? `Vacaciones quitadas. Volvieron al calendario ${sessions(result.restored)} de horarios fijos.`
            : "Vacaciones quitadas.",
        );
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border bg-(--vacation) px-3 py-2 text-sm">
      <TreePalmIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 first-letter:uppercase">
        {formatRange(parseISO(vacation.start_date), parseISO(vacation.end_date))}
        {current && <span className="ml-2 text-xs font-medium text-muted-foreground">(ahora)</span>}
      </span>
      <Button variant="ghost" size="icon" onClick={remove} disabled={pending} aria-label="Quitar vacaciones">
        <Trash2Icon />
      </Button>
    </li>
  );
}

function AddVacation() {
  const [range, setRange] = useState<DateRange | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Controlado: en Base UI, AlertDialogAction no cierra el diálogo solo.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const today = startOfDay(new Date());
  const from = range?.from;
  const to = range?.to ?? range?.from; // un solo día elegido = vacaciones de un día

  function add() {
    if (!from || !to) return;
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await addVacation({ start: dayKey(from), end: dayKey(to) });
      setError(result.error);
      if (!result.error) {
        setRange(undefined);
        toast.success(
          result.removed
            ? `Vacaciones cargadas. Se quitaron ${sessions(result.removed)} de horarios fijos.`
            : "Vacaciones cargadas.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            render={<Button id="vacation_range" type="button" variant="outline" className="justify-start font-normal sm:flex-1" />}
          >
            <CalendarIcon />
            {from && to ? (
              <span className="truncate first-letter:uppercase">{formatRange(from, to)}</span>
            ) : (
              <span className="text-muted-foreground">Elegí el primer y el último día</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              locale={es}
              selected={range}
              onSelect={(r) => {
                setRange(r);
                setError(undefined);
              }}
              defaultMonth={from ?? today}
              disabled={{ before: today }}
            />
          </PopoverContent>
        </Popover>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger render={<Button disabled={!from || pending} />}>
            <TreePalmIcon />
            {pending ? "Cargando…" : "Agregar vacaciones"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cargar las vacaciones?</AlertDialogTitle>
              <AlertDialogDescription>
                {from && to && <span className="first-letter:uppercase">{formatRange(from, to)}. </span>}
                Se quitan del calendario las sesiones de horarios fijos de esos días. Si quitás las vacaciones, vuelven.
                Las sesiones sueltas no cambian, y podés agendar otras para urgencias.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={add} disabled={pending}>Cargar vacaciones</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <FieldDescription>
        Durante las vacaciones no hay sesiones de horarios fijos. Sí podés agendar sesiones sueltas, de cualquier
        paciente, para atender urgencias.
      </FieldDescription>
      <FieldError>{error}</FieldError>
    </div>
  );
}
