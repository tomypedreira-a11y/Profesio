// Una sección de Configuración: tarjeta con título, descripción y sus opciones.
// Para sumar una sección nueva, agregar otra <SettingsSection> en page.tsx;
// para sumar una opción a una sección existente, otro <Field> adentro.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

type SettingsSectionProps = {
  id?: string; // para enlazar a la sección (ej. /configuracion#instalar)
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    // scroll-mt: al llegar por un link (#id), el título no queda pegado al borde.
    <Card id={id} className="scroll-mt-4">
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
