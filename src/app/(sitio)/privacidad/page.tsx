// BORRADOR: revisar con un abogado antes de abrir la beta.
// Para revisar en particular: el mecanismo de la transferencia internacional (Ley 25.326 art. 12 y normativa de la
// AAIP sobre países con protección adecuada), y si corresponde inscribir la base en el Registro Nacional de Bases de
// Datos. Completar los datos del titular en src/lib/legal.ts (OWNER). Si cambia el contenido, actualizar
// TERMS_VERSION y LEGAL_UPDATED (lib/legal.ts). Si cambian los proveedores, las cookies o los datos que guarda la
// app, actualizar esta página.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/sitio/legal-page";
import { CONTACT_EMAIL, OWNER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos guarda Profesio, para qué, dónde y cómo los protege.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalPage
      title="Política de privacidad"
      intro={
        <p>
          Profesio guarda información muy sensible: datos de salud de los pacientes de cada psicólogo. Acá explicamos qué
          datos guardamos, para qué, dónde y cómo los cuidamos.
        </p>
      }
    >
      <h2>1. Quiénes somos</h2>
      <p>
        Profesio es ofrecido por {OWNER.name}, CUIT {OWNER.taxId}, con domicilio en {OWNER.address}. Contacto: {mail}.
        Ver también los <Link href="/terminos">Términos y condiciones</Link>.
      </p>

      <h2>2. Dos tipos de datos, dos roles</h2>
      <ul>
        <li>
          <strong>Tus datos como usuario</strong> (nombre, email, preferencias): Profesio es el responsable de su
          tratamiento.
        </li>
        <li>
          <strong>Los datos de tus pacientes</strong> (incluidas las anotaciones de sesión): vos, como profesional, sos
          el responsable; Profesio es el <strong>encargado del tratamiento</strong> y los procesa solo por tu cuenta y
          para prestarte el servicio (artículo 25 de la Ley 25.326). Tus pacientes ejercen sus derechos ante vos; si
          hace falta, te ayudamos a responderles.
        </li>
      </ul>

      <h2>3. Qué datos guardamos</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, apellido, email, matrícula (si la cargás) y tu contraseña, que no se guarda en
          texto legible sino transformada (hash).
        </li>
        <li>
          <strong>Preferencias:</strong> tema, tamaño de letra, zona horaria, vista del calendario, duración y valor de
          las sesiones, vacaciones, notificaciones y cierre por inactividad.
        </li>
        <li>
          <strong>Pacientes:</strong> nombre, apellido y, si los cargás, teléfono, email, documento, fecha de nacimiento,
          modalidad, valor de la sesión y horarios.
        </li>
        <li>
          <strong>Sesiones y cobros:</strong> fecha, hora, estado, modalidad, valor, si se cobró, cuándo y con qué medio.
        </li>
        <li>
          <strong>Anotaciones de sesión:</strong> el texto que escribís, con sus versiones. Son datos de salud: datos{" "}
          <strong>sensibles</strong> según la Ley 25.326, alcanzados por el secreto profesional (Ley 23.277) y parte de
          la historia clínica (Ley 26.529).
        </li>
        <li>
          <strong>Seguridad y funcionamiento:</strong> un registro de las modificaciones de los datos (qué cambió y
          cuándo), los dispositivos donde activaste las notificaciones, los dispositivos de la verificación en dos pasos
          y las notificaciones enviadas.
        </li>
      </ul>

      <h2>4. Para qué los usamos</h2>
      <p>
        Solo para prestarte el servicio: mostrarte tu agenda, tus pacientes y tus anotaciones, enviarte los
        recordatorios y los mails de la cuenta (confirmación, recuperación de contraseña, avisos de seguridad) y
        mantener la app segura. No vendemos datos, no los usamos para publicidad y no analizamos el contenido de tus
        anotaciones. Solo accedemos a datos de tu cuenta si vos nos lo pedís (por ejemplo, para darte soporte) o si una
        autoridad competente lo exige conforme a la ley.
      </p>

      <h2>5. Dónde se guardan: proveedores</h2>
      <p>Para funcionar, Profesio usa estos proveedores:</p>
      <ul>
        <li>
          <strong>Supabase</strong>: la base de datos y el inicio de sesión. Los datos se guardan en sus servidores de{" "}
          <strong>São Paulo, Brasil</strong>, con copias de seguridad diarias.
        </li>
        <li>
          <strong>Vercel</strong>: aloja y sirve la aplicación web; por sus servidores pasan las pantallas que ves.
          También mide cuánto tardan en cargar (Speed Insights): tiempos de carga, tipo de dispositivo, navegador y
          país, sin cookies y sin datos de pacientes (de la dirección de cada pantalla se quitan los identificadores).
        </li>
        <li>
          <strong>Resend</strong>: envía los mails de la cuenta (desde servidores en São Paulo, Brasil).
        </li>
        <li>
          <strong>Cloudflare</strong>: administra el dominio miprofesio.com y reenvía los mails que nos escribís.
        </li>
        <li>
          <strong>El servicio de notificaciones de tu navegador</strong> (Google, Apple o Mozilla, según el
          dispositivo): entrega los recordatorios. Solo llevan la hora, la modalidad y, si lo elegís, el nombre y la
          inicial del apellido del paciente; nunca el contenido de las anotaciones.
        </li>
      </ul>
      <p>
        Estos proveedores están fuera de la Argentina, por lo que hay una <strong>transferencia internacional</strong>{" "}
        de datos. La hacemos solo para prestar el servicio, con proveedores que aplican medidas de seguridad acordes, y
        al aceptar esta política la consentís.
      </p>

      <h2>6. Cómo los protegemos</h2>
      <ul>
        <li>La conexión entre tu dispositivo y Profesio está cifrada (HTTPS).</li>
        <li>
          Las reglas de acceso están en la base de datos: cada cuenta solo puede leer y modificar sus propios datos.
        </li>
        <li>Verificación en dos pasos opcional, con una app de códigos.</li>
        <li>Cierre de sesión por inactividad, de 15 minutos a 4 horas según tu preferencia.</li>
        <li>Las anotaciones finalizadas no se pueden modificar ni borrar; las correcciones quedan como versiones nuevas.</li>
        <li>Cada modificación de los datos queda registrada.</li>
        <li>
          La app no guarda datos de tus pacientes en el dispositivo para usarlos sin conexión: sin internet, no se ve
          nada.
        </li>
      </ul>
      <p>
        Ningún sistema es infalible. Si detectamos un incidente de seguridad que afecte tus datos, te vamos a avisar.
      </p>

      <h2>7. Cookies y almacenamiento en tu navegador</h2>
      <p>Profesio usa solo lo necesario para funcionar:</p>
      <ul>
        <li>
          <strong>Sesión</strong>: cookies de Supabase que mantienen tu sesión iniciada.
        </li>
        <li>
          <strong>Inactividad</strong>: la hora de tu última actividad y el límite elegido, para cerrar la sesión si
          queda sin usar.
        </li>
        <li>
          <strong>Preferencias de pantalla</strong>: el tema (claro u oscuro), el tamaño de letra y si el panel lateral
          está abierto o cerrado.
        </li>
      </ul>
      <p>No usamos cookies de publicidad, de análisis ni de rastreo de terceros.</p>

      <h2>8. Cuánto tiempo los guardamos</h2>
      <p>
        Mientras tengas tu cuenta. Si la das de baja, eliminamos tus datos, salvo las anotaciones de sesión, que forman
        parte de la historia clínica: la Ley 26.529 exige conservarlas al menos diez años, y las mantenemos guardadas y
        protegidas durante ese plazo, a tu disposición. Ver los <Link href="/terminos">Términos</Link>.
      </p>

      <h2>9. Tus derechos</h2>
      <p>
        Podés pedir <strong>acceso</strong> a tus datos, su <strong>rectificación</strong> o su{" "}
        <strong>supresión</strong> (artículos 14 a 16 de la Ley 25.326) escribiendo a {mail}. El acceso es gratuito
        cada seis meses, salvo que acredites un interés legítimo para pedirlo antes. Muchos datos los podés corregir vos
        mismo desde la app.
      </p>
      <p>
        La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la
        atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por
        incumplimiento de las normas vigentes en materia de protección de datos personales.
      </p>

      <h2>10. Cambios en esta política</h2>
      <p>
        Si la cambiamos, vamos a publicar la nueva versión acá con su fecha y, si el cambio es importante, te vamos a
        avisar antes por email o dentro de la app.
      </p>

      <h2>11. Contacto</h2>
      <p>Para cualquier consulta sobre tus datos o esta política, escribinos a {mail}.</p>
    </LegalPage>
  );
}
