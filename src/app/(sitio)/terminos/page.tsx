// BORRADOR: revisar con un abogado antes de abrir la beta.
// Completar los datos del titular en src/lib/legal.ts (OWNER) y la jurisdicción. Si cambia el contenido,
// actualizar TERMS_VERSION y LEGAL_UPDATED (lib/legal.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/sitio/legal-page";
import { CONTACT_EMAIL, OWNER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de uso de Profesio.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro={
        <p>
          Estas condiciones regulan el uso de Profesio. Al crear tu cuenta, aceptás estos Términos y la{" "}
          <Link href="/privacidad" className="underline underline-offset-4">
            Política de privacidad
          </Link>
          .
        </p>
      }
    >
      <h2>1. Qué es Profesio</h2>
      <p>
        Profesio es una aplicación web para que psicólogos organicen su práctica: agenda de sesiones, datos de sus
        pacientes, anotaciones de sesión (historia clínica), cobros y recordatorios. La usa solo el profesional: los
        pacientes no tienen cuenta ni acceso.
      </p>

      <h2>2. Quién ofrece el servicio</h2>
      <p>
        Profesio es ofrecido por {OWNER.name}, CUIT {OWNER.taxId}, con domicilio en {OWNER.address} (en adelante,
        «Profesio», «nosotros»). Contacto: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>3. Tu cuenta</h2>
      <ul>
        <li>La cuenta es personal e intransferible, para uso profesional de quien la crea.</li>
        <li>
          Sos responsable de mantener seguras tu contraseña y, si la activás, tu verificación en dos pasos (que te
          recomendamos). Si creés que alguien accedió a tu cuenta, cambiá la contraseña, cerrá la sesión en todos los
          dispositivos desde Configuración y avisanos.
        </li>
        <li>Los datos que cargás tienen que ser veraces y obtenidos de forma lícita.</li>
      </ul>

      <h2>4. Los datos de tus pacientes: quién es responsable</h2>
      <p>
        Vos sos el <strong>responsable</strong> de los datos de tus pacientes que cargás en Profesio: decidís qué datos
        guardar, para qué y por cuánto tiempo, y respondés frente a ellos. Profesio actúa como{" "}
        <strong>encargado del tratamiento</strong>: los guarda y procesa por tu cuenta y según tus instrucciones, solo
        para prestarte el servicio, y no los usa para ningún fin propio (artículo 25 de la Ley 25.326 de Protección de
        Datos Personales).
      </p>
      <p>Como profesional, te corresponde cumplir, entre otras, con:</p>
      <ul>
        <li>
          La <strong>Ley 25.326</strong>: los datos de salud son datos sensibles. Tenés que contar con una base legal
          para tratarlos (por ejemplo, el consentimiento de tu paciente o la relación profesional) e informarle cómo
          los tratás.
        </li>
        <li>
          La <strong>Ley 26.529</strong> de Derechos del Paciente: la historia clínica debe ser íntegra e inalterable y
          conservarse por un plazo mínimo de diez años. Por eso, en Profesio una anotación finalizada no se puede
          modificar ni borrar: se corrige agregando una versión nueva.
        </li>
        <li>
          La <strong>Ley 23.277</strong> de Ejercicio Profesional de la Psicología, que impone el secreto profesional.
        </li>
      </ul>

      <h2>5. Uso aceptable</h2>
      <p>No podés usar Profesio para fines ilícitos, para cargar datos de personas sin una base legal, ni para intentar acceder a cuentas o datos de otros, vulnerar la seguridad del servicio o sobrecargarlo.</p>

      <h2>6. Beta gratuita y sin garantías</h2>
      <p>
        Profesio está en etapa de prueba (beta) y es gratuito mientras dure. Lo hacemos con cuidado, pero se ofrece «tal
        como está»: puede tener errores, interrupciones o cambios, y no garantizamos que esté disponible en todo
        momento. Te recomendamos no depender exclusivamente de Profesio para información crítica durante la beta.
      </p>
      <p>
        Podemos agregar, cambiar o quitar funcionalidades. Si en el futuro el servicio pasa a ser pago, te lo vamos a
        avisar con anticipación y vas a poder decidir si seguís usándolo.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        En la medida en que la ley lo permita, Profesio no responde por daños indirectos derivados del uso o de la
        imposibilidad de usar el servicio durante la beta. Nada de esto limita los derechos que te otorgan las normas de
        defensa del consumidor ni la responsabilidad que nos corresponde como encargados del tratamiento de datos.
      </p>

      <h2>8. Baja de la cuenta</h2>
      <p>
        Podés pedir la baja de tu cuenta cuando quieras, escribiendo a{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Las anotaciones de sesión forman parte de la historia
        clínica y la ley exige conservarlas al menos diez años: por eso no se borran con la baja. Las mantenemos
        guardadas y protegidas durante ese plazo, sin usarlas para nada, y te las entregamos si nos las pedís. El resto
        de los datos de la cuenta se elimina.
      </p>
      <p>
        También podemos suspender una cuenta que incumpla estos Términos, avisándote antes salvo que haya un riesgo para
        la seguridad del servicio o de terceros.
      </p>

      <h2>9. Propiedad intelectual</h2>
      <p>
        El software, el diseño y la marca Profesio nos pertenecen. Los datos que cargás son tuyos (y de tus pacientes):
        no adquirimos ningún derecho sobre ellos.
      </p>

      <h2>10. Cambios en estos Términos</h2>
      <p>
        Si cambiamos estos Términos, vamos a publicar la nueva versión acá con su fecha y, si el cambio es importante,
        te vamos a avisar por email o dentro de la app antes de que entre en vigencia.
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes de la República Argentina. Ante cualquier conflicto, son competentes los
        tribunales ordinarios de [JURISDICCIÓN], sin perjuicio de los derechos que te correspondan como consumidor.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos Términos, escribinos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
