"use client";

// Valor por sesión por defecto. Al ser un texto, se guarda al salir del campo (o con Enter), no con cada tecla.
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parseFee } from "@/lib/format";
import { updateDefaultFee } from "./actions";

// Se muestra como se escribe: "25.000" o "25.000,50" (parseFee acepta ambos).
const amount = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const toText = (fee: number | null) => (fee === null ? "" : amount.format(fee));

type DefaultFeeInputProps = { id: string; value: number | null; description: string };

export function DefaultFeeInput({ id, value, description }: DefaultFeeInputProps) {
  const [text, setText] = useState(toText(value));
  const [saved, setSaved] = useState(value);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save() {
    const fee = parseFee(text);
    // Mismo monto escrito de otra forma: solo se ordena cómo se ve.
    if (fee === saved) {
      setText(toText(fee));
      setError(undefined);
      return;
    }
    startTransition(async () => {
      const result = await updateDefaultFee(text);
      setError(result.error);
      if (!result.error && fee !== "invalid") {
        setSaved(fee);
        setText(toText(fee));
        toast.success("Guardado.");
      }
    });
  }

  return (
    <>
      <Input
        id={id}
        inputMode="decimal"
        placeholder="25.000"
        className="sm:w-48"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        disabled={pending}
        aria-invalid={!!error}
      />
      <FieldDescription>{description}</FieldDescription>
      <FieldError>{error}</FieldError>
    </>
  );
}
