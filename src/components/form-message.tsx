// Mensaje general de un formulario (error o éxito).
import { cn } from "@/lib/utils";

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-foreground",
      )}
    >
      {error ?? success}
    </p>
  );
}
