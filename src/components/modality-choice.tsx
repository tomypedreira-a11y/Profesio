"use client";

// Elegir presencial o virtual (siempre una de las dos). Lo usan el formulario de paciente y el panel de la sesión.
import { MapPinIcon, VideoIcon } from "lucide-react";
import { Field, FieldContent, FieldLabel, FieldTitle } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Modality } from "@/lib/modality";

type ModalityChoiceProps = {
  idPrefix: string;
  value: Modality;
  onChange: (value: Modality) => void;
  disabled?: boolean;
};

export function ModalityChoice({ idPrefix, value, onChange, disabled }: ModalityChoiceProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as Modality)}
      disabled={disabled}
      className="grid grid-cols-2 gap-3"
    >
      <FieldLabel htmlFor={`${idPrefix}-in_person`}>
        <Field orientation="horizontal">
          <RadioGroupItem value="in_person" id={`${idPrefix}-in_person`} />
          <FieldContent>
            <FieldTitle>
              <MapPinIcon className="size-4" />
              Presencial
            </FieldTitle>
          </FieldContent>
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor={`${idPrefix}-virtual`}>
        <Field orientation="horizontal">
          <RadioGroupItem value="virtual" id={`${idPrefix}-virtual`} />
          <FieldContent>
            <FieldTitle>
              <VideoIcon className="size-4" />
              Virtual
            </FieldTitle>
          </FieldContent>
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
}
