"use client";

// Botones de cobro: "Cobrar" (elegís el medio de pago) y "Deshacer".
// Se usan en el panel de la sesión y en la pantalla Ingresos.
import { useTransition } from "react";
import { ChevronDownIcon, UndoIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { markSessionsPaid, markSessionUnpaid } from "@/app/(app)/ingresos/actions";
import { PAYMENT_METHODS } from "@/lib/payments";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MarkPaidButtonProps = {
  sessionIds: string[];
  label?: string;
  size?: "sm" | "default";
  onDone?: () => void;
};

export function MarkPaidButton({ sessionIds, label = "Cobrar", size = "sm", onDone }: MarkPaidButtonProps) {
  const [pending, startTransition] = useTransition();

  function pay(method: string) {
    startTransition(async () => {
      const result = await markSessionsPaid({ sessionIds, method });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(sessionIds.length === 1 ? "Sesión cobrada." : `${sessionIds.length} sesiones cobradas.`);
        onDone?.();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size={size} disabled={pending} />}>
        <WalletIcon />
        {pending ? "Guardando…" : label}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Medio de pago</DropdownMenuLabel>
          {PAYMENT_METHODS.map((m) => (
            <DropdownMenuItem key={m.value} onClick={() => pay(m.value)}>
              {m.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MarkUnpaidButton({ sessionId, onDone }: { sessionId: string; onDone?: () => void }) {
  const [pending, startTransition] = useTransition();

  function undo() {
    startTransition(async () => {
      const result = await markSessionUnpaid(sessionId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Cobro deshecho.");
        onDone?.();
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={undo} disabled={pending}>
      <UndoIcon />
      Deshacer
    </Button>
  );
}
