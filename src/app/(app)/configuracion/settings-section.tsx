// Una sección de Configuración: tarjeta con título, descripción y sus opciones.
// Para sumar una sección nueva, agregar otra <SettingsSection> en page.tsx;
// para sumar una opción a una sección existente, otro <Field> adentro.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

type SettingsSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <FieldGroup>{children}</FieldGroup>
      </CardContent>
    </Card>
  );
}
