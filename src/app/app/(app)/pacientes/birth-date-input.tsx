"use client";

// Campo de fecha con formato DD/MM/AAAA: las barras se agregan solas al escribir.
import { useState } from "react";
import { Input } from "@/components/ui/input";

function mask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function BirthDateInput({ defaultValue, ...props }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue"> & { defaultValue: string }) {
  const [value, setValue] = useState(mask(defaultValue));
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/AAAA"
      maxLength={10}
      value={value}
      onChange={(e) => setValue(mask(e.target.value))}
    />
  );
}
