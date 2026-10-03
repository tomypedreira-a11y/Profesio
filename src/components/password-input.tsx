"use client";

// Campo de contraseña con un botón (ojito) para mostrarla mientras se escribe.
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Al enviar el formulario vuelve a ocultarse, ya mismo (sin esperar a React): así el gestor de contraseñas
  // la reconoce como contraseña y no queda a la vista.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const hide = () => {
      if (ref.current) ref.current.type = "password";
      setVisible(false);
    };
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-9", className)} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        disabled={props.disabled}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  );
}
