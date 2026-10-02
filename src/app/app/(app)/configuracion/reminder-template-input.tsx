"use client";

// Mensaje de recordatorio por WhatsApp. Como el valor por sesión, se guarda al salir del campo, no con cada tecla.
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_REMINDER_TEMPLATE,
  parseReminderTemplate,
  REMINDER_PLACEHOLDERS,
  REMINDER_TEMPLATE_MAX,
  reminderText,
} from "@/lib/whatsapp";
import { updateReminderTemplate } from "./actions";

// Sesión de ejemplo para la vista previa (fija, así coincide en el servidor y el navegador).
const EXAMPLE = { first_name: "Ana", starts_at: "2026-10-06T18:00:00Z" };

export function ReminderTemplateInput({ id, value }: { id: string; value: string | null }) {
  const [text, setText] = useState(value ?? DEFAULT_REMINDER_TEMPLATE);
  const [saved, setSaved] = useState(value);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function save(raw: string) {
    const template = parseReminderTemplate(raw);
    if (template === saved) {
      setText(template ?? DEFAULT_REMINDER_TEMPLATE);
      setError(undefined);
      return;
    }
    startTransition(async () => {
      const result = await updateReminderTemplate(raw);
      setError(result.error);
      if (!result.error && template !== "invalid") {
        setSaved(template);
        setText(template ?? DEFAULT_REMINDER_TEMPLATE);
        toast.success("Guardado.");
      }
    });
  }

  // Inserta el marcador donde está el cursor (en el celular, escribir llaves es incómodo).
  function insert(key: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + key + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + key.length, start + key.length);
    });
  }

  const preview = reminderText(text.trim() || DEFAULT_REMINDER_TEMPLATE, EXAMPLE, "UTC");

  return (
    <>
      <Textarea
        id={id}
        ref={ref}
        value={text}
        maxLength={REMINDER_TEMPLATE_MAX}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => save(text)}
        disabled={pending}
        aria-invalid={!!error}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {REMINDER_PLACEHOLDERS.map((p) => (
          <Button
            key={p.key}
            type="button"
            variant="outline"
            size="xs"
            title={`Agrega el ${p.label}`}
            // Sin quitarle el foco al texto: si no, se guardaría antes de agregar el marcador.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(p.key)}
            disabled={pending}
          >
            {p.key}
          </Button>
        ))}
        {text.trim() !== DEFAULT_REMINDER_TEMPLATE && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onMouseDown={(e) => e.preventDefault()} // sin guardar antes lo que estaba escrito
            onClick={() => save("")}
            disabled={pending}
          >
            Volver al mensaje original
          </Button>
        )}
      </div>
      <FieldDescription>
        Se escribe solo en el chat del paciente al tocar &ldquo;Enviar recordatorio&rdquo; (en una sesión o en la lista de
        Sesiones); lo revisás y lo enviás vos desde tu WhatsApp. Los marcadores se reemplazan por el nombre del paciente, el
        día y la hora de la sesión.
      </FieldDescription>
      <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium">Ejemplo:</span> {preview}
      </p>
      <FieldError>{error}</FieldError>
    </>
  );
}
