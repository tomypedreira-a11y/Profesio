// Contraseña nueva, escrita dos veces (recuperación y Configuración). Valida newPasswordSchema (lib/auth.ts).
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/password-input";

type NewPasswordFieldsProps = {
  errors: Record<string, string[] | undefined>;
  className?: string;
};

export function NewPasswordFields({ errors, className }: NewPasswordFieldsProps) {
  return (
    <>
      <Field data-invalid={!!errors.password}>
        <FieldLabel htmlFor="password">Contraseña nueva</FieldLabel>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          aria-invalid={!!errors.password}
          className={className}
          required
        />
        <FieldDescription>Al menos 8 caracteres.</FieldDescription>
        <FieldError>{errors.password?.[0]}</FieldError>
      </Field>
      <Field data-invalid={!!errors.confirm}>
        <FieldLabel htmlFor="confirm">Repetí la contraseña nueva</FieldLabel>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          className={className}
          required
        />
        <FieldError>{errors.confirm?.[0]}</FieldError>
      </Field>
    </>
  );
}
