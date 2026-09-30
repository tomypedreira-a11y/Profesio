import type { Metadata } from "next";
import Link from "next/link";
import { addMonths, format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatFee } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { MarkPaidButton, MarkUnpaidButton } from "@/components/payments/payment-buttons";
import { getTimeZone } from "../pacientes/queries";

export const metadata: Metadata = { title: "Ingresos" };

type PaymentRow = {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  starts_at: string;
  fee: number | null;
  paid_at: string | null;
  payment_method: string | null;
};

const COLUMNS = "id, patient_id, first_name, last_name, starts_at, fee, paid_at, payment_method";

const sum = (rows: PaymentRow[]) => rows.reduce((total, r) => total + (r.fee ?? 0), 0);

// Resumen de cobros: lo cobrado en el mes (por fecha de cobro, incluye lo cobrado por adelantado),
// las sesiones realizadas del mes sin cobrar y quiénes adeudan.
export default async function IncomePage({ searchParams }: PageProps<"/ingresos">) {
  const timeZone = await getTimeZone();
  const currentMonth = formatInTimeZone(new Date(), timeZone, "yyyy-MM");
  const { mes } = await searchParams;
  const month = typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && mes <= currentMonth ? mes : currentMonth;

  // Límites del mes en la zona horaria del psicólogo.
  const monthDate = parse(month, "yyyy-MM", new Date());
  const from = fromZonedTime(`${month}-01T00:00:00`, timeZone);
  const to = fromZonedTime(`${format(addMonths(monthDate, 1), "yyyy-MM")}-01T00:00:00`, timeZone);

  // session_payments trae también las sesiones futuras: realizadas = ya empezaron.
  const now = new Date().toISOString();
  const supabase = await createClient();
  const [{ data: monthData }, { data: paidData }, { data: unpaidData }] = await Promise.all([
    // Sesiones realizadas del mes.
    supabase
      .from("session_payments")
      .select(COLUMNS)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .lte("starts_at", now),
    // Cobros del mes, sea cual sea la fecha de la sesión (incluye los adelantados).
    supabase.from("session_payments").select(COLUMNS).gte("paid_at", from.toISOString()).lt("paid_at", to.toISOString()),
    // Todo lo adeudado, de cualquier mes.
    supabase.from("session_payments").select(COLUMNS).is("paid_at", null).lte("starts_at", now).order("starts_at", { ascending: true }),
  ]);

  const done = (monthData ?? []) as PaymentRow[];
  const paid = (paidData ?? []) as PaymentRow[];
  const pending = done.filter((r) => !r.paid_at);
  // Lista del mes: las sesiones realizadas y todo lo cobrado en el mes, sin repetir.
  const rows = [...new Map([...done, ...paid].map((r) => [r.id, r])).values()].sort((a, b) =>
    b.starts_at.localeCompare(a.starts_at),
  );

  // Deudas agrupadas por paciente, de mayor a menor.
  const debtors = new Map<string, { name: string; sessions: PaymentRow[] }>();
  for (const r of (unpaidData ?? []) as PaymentRow[]) {
    const debtor = debtors.get(r.patient_id) ?? { name: `${r.first_name} ${r.last_name}`, sessions: [] };
    debtor.sessions.push(r);
    debtors.set(r.patient_id, debtor);
  }
  const debtorList = [...debtors.entries()].sort((a, b) => sum(b[1].sessions) - sum(a[1].sessions));

  const monthLabel = format(monthDate, "MMMM yyyy", { locale: es });
  const monthHref = (offset: number) => `/ingresos?mes=${format(addMonths(monthDate, offset), "yyyy-MM")}`;

  return (
    <>
      <PageHeader title="Ingresos" description="Lo cobrado en el mes, lo pendiente y quiénes adeudan." />

      {/* Mes */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" render={<Link href={monthHref(-1)} />} nativeButton={false} aria-label="Mes anterior">
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          render={<Link href={monthHref(1)} />}
          nativeButton={false}
          aria-label="Mes siguiente"
          disabled={month === currentMonth}
          className={cn(month === currentMonth && "pointer-events-none opacity-50")}
        >
          <ChevronRightIcon />
        </Button>
        <h2 className="text-lg font-semibold first-letter:uppercase">{monthLabel}</h2>
      </div>

      {/* Resumen del mes */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Cobrado" value={formatFee(sum(paid))} detail={`${paid.length} ${paid.length === 1 ? "sesión" : "sesiones"}`} />
        <StatTile label="Pendiente" value={formatFee(sum(pending))} detail={`${pending.length} ${pending.length === 1 ? "sesión" : "sesiones"}`} />
        <StatTile
          label="Sesiones realizadas"
          value={String(done.length)}
          detail={done.some((r) => r.fee === null) ? "Hay sesiones sin valor cargado" : "No incluye canceladas"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Quiénes adeudan (todos los meses) */}
        <Card>
          <CardHeader>
            <CardTitle>Adeudan</CardTitle>
            <CardDescription>Sesiones realizadas sin cobrar, de cualquier mes.</CardDescription>
          </CardHeader>
          <CardContent>
            {debtorList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nadie adeuda sesiones.</p>
            ) : (
              <ul className="divide-y">
                {debtorList.map(([patientId, d]) => (
                  <li key={patientId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/pacientes/${patientId}`} className="block truncate font-medium hover:underline">
                        {d.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {d.sessions.length} {d.sessions.length === 1 ? "sesión" : "sesiones"} · desde el{" "}
                        {formatInTimeZone(d.sessions[0].starts_at, timeZone, "dd/MM")}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {d.sessions.some((s) => s.fee === null) ? "Sin valor" : formatFee(sum(d.sessions))}
                    </span>
                    <MarkPaidButton sessionIds={d.sessions.map((s) => s.id)} label={d.sessions.length > 1 ? "Cobrar todo" : "Cobrar"} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sesiones del mes */}
        <Card>
          <CardHeader>
            <CardTitle>Sesiones del mes</CardTitle>
            <CardDescription>Las realizadas en el mes y las cobradas en el mes, incluso por adelantado.</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay sesiones realizadas ni cobros en {monthLabel}.</p>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2 text-sm first:pt-0 last:pb-0">
                    <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                      {formatInTimeZone(r.starts_at, timeZone, "dd/MM")}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {r.first_name} {r.last_name}
                    </span>
                    <span className="tabular-nums">{r.fee !== null ? formatFee(r.fee) : "Sin valor"}</span>
                    {r.paid_at ? (
                      <>
                        {r.starts_at > now && <Badge variant="outline">Adelantado</Badge>}
                        <Badge variant="secondary">{paymentMethodLabel(r.payment_method)}</Badge>
                        <MarkUnpaidButton sessionId={r.id} />
                      </>
                    ) : (
                      <MarkPaidButton sessionIds={[r.id]} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </CardContent>
    </Card>
  );
}
