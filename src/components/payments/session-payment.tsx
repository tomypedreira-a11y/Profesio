"use client";

// Cobro de una sesión dentro de su panel: valor, estado y botón para cobrar o deshacer.
// Una sesión futura se puede cobrar por adelantado, y una cancelada también se puede cobrar.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import { formatFee } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payments";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkPaidButton, MarkUnpaidButton } from "./payment-buttons";

type Payment = {
  starts_at: string;
  fee: number | null;
  paid_at: string | null;
  payment_method: string | null;
  status: string;
};

type SessionPaymentProps = {
  sessionId: string;
  timeZone: string;
  onChanged?: () => void; // después de cobrar o deshacer el cobro
};

export function SessionPayment({ sessionId, timeZone, onChanged }: SessionPaymentProps) {
  const supabase = useRef(createClient()).current;
  const [payment, setPayment] = useState<Payment | null | undefined>(undefined);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("session_payments")
      .select("starts_at, fee, paid_at, payment_method, status")
      .eq("id", sessionId)
      .maybeSingle();
    setPayment(data as Payment | null);
  }, [supabase, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const done = () => {
    void load();
    onChanged?.();
  };

  if (payment === undefined) return <Skeleton className="h-9 w-full" />;
  if (payment === null) return null;
  // "Por adelantado" solo corre para una sesión que todavía va a ocurrir.
  const cancelled = payment.status === "cancelled";
  const upcoming = !cancelled && new Date(payment.starts_at) > new Date();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
      <span className="font-medium">{payment.fee !== null ? formatFee(payment.fee) : "Sin valor"}</span>
      {payment.paid_at ? (
        <>
          <Badge variant="secondary">
            {upcoming ? "Cobrada por adelantado" : "Cobrada"} · {paymentMethodLabel(payment.payment_method)} ·{" "}
            {formatInTimeZone(payment.paid_at, timeZone, "dd/MM")}
          </Badge>
          <span className="ml-auto">
            <MarkUnpaidButton sessionId={sessionId} onDone={done} />
          </span>
        </>
      ) : (
        <>
          <Badge variant="outline">{upcoming || cancelled ? "Sin cobrar" : "Pendiente de cobro"}</Badge>
          <span className="ml-auto">
            <MarkPaidButton sessionIds={[sessionId]} label={upcoming ? "Cobrar por adelantado" : "Cobrar"} onDone={done} />
          </span>
        </>
      )}
    </div>
  );
}
