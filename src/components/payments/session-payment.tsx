"use client";

// Cobro de una sesión realizada, dentro del panel de la sesión: valor, estado y botón para cobrar o deshacer.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import { formatFee } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payments";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkPaidButton, MarkUnpaidButton } from "./payment-buttons";

type Payment = { fee: number | null; paid_at: string | null; payment_method: string | null };

export function SessionPayment({ sessionId, timeZone }: { sessionId: string; timeZone: string }) {
  const supabase = useRef(createClient()).current;
  const [payment, setPayment] = useState<Payment | null | undefined>(undefined);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("session_payments")
      .select("fee, paid_at, payment_method")
      .eq("id", sessionId)
      .maybeSingle();
    setPayment(data);
  }, [supabase, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (payment === undefined) return <Skeleton className="h-9 w-full" />;
  if (payment === null) return null; // no es una sesión realizada

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
      <span className="font-medium">{payment.fee !== null ? formatFee(payment.fee) : "Sin valor"}</span>
      {payment.paid_at ? (
        <>
          <Badge variant="secondary">
            Cobrada · {paymentMethodLabel(payment.payment_method)} · {formatInTimeZone(payment.paid_at, timeZone, "dd/MM")}
          </Badge>
          <span className="ml-auto">
            <MarkUnpaidButton sessionId={sessionId} onDone={load} />
          </span>
        </>
      ) : (
        <>
          <Badge variant="outline">Pendiente de cobro</Badge>
          <span className="ml-auto">
            <MarkPaidButton sessionIds={[sessionId]} onDone={load} />
          </span>
        </>
      )}
    </div>
  );
}
