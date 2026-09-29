// Medios de pago de una sesión cobrada (coinciden con el check de sessions.payment_method).
export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "other", label: "Otro" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const paymentMethodLabel = (value: string | null) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label ?? "";
