@AGENTS.md

# Profesio

Agenda y gestión de pacientes para psicólogos (MVP). Web app instalable (PWA) para PC y celular.
Solo la usa el psicólogo; los pacientes no tienen cuenta.

Documentación funcional y técnica: *Propuesta integral – App de gestión para psicólogos* (proyecto Profesio en claude.ai).

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**. Ver `AGENTS.md`: esta versión cambió mucho.
  - La protección de rutas está en `src/proxy.ts` (antes `middleware.ts`).
  - `params` y `searchParams` son `Promise`: usar `PageProps<"/ruta/[id]">` y `await params`.
- **Supabase**: PostgreSQL + Auth + RLS. Cliente con `@supabase/ssr`.
- **Tailwind CSS 4** + **shadcn/ui con Base UI** (preset Nova, íconos Lucide).
- **Zod 4** para validación, **date-fns / date-fns-tz** para fechas, **libphonenumber-js** para teléfonos.
- **FullCalendar 6** (no la 7) para el calendario.
- Deploy en **Vercel**; cada PR tiene preview.

## Comandos

```bash
npm run dev          # desarrollo en http://localhost:3000
npm run build        # compilación de producción (correr antes de abrir un PR)
npm run lint

npx supabase migration new nombre   # nueva migración (vacía)
npx supabase db push                 # aplica migraciones al proyecto vinculado
npx supabase gen types typescript --linked | Out-File -Encoding utf8 src/lib/database.types.ts

npx supabase start -x realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npm run test:db                      # tests de la base (pgTAP), contra el Supabase local
npx supabase db reset                # aplica de nuevo todas las migraciones en el local
npx supabase stop
```

**Tests de la base** (`supabase/tests/database/`, pgTAP): corren contra un Supabase **local** (necesita Docker Desktop
abierto), nunca contra el proyecto vinculado. `supabase start` aplica todas las migraciones desde cero; después de crear
una migración, `db reset` la aplica también en el local. Cada archivo corre en una transacción que se descarta al final,
crea sus psicólogos en `auth.users` y actúa como ellos con `set local role authenticated` + `request.jwt.claims`.
Una regla nueva del dominio va con su test en el mismo PR. Antes del PR: `npm run test:db`.

En PowerShell 5.1, `>` guarda el archivo en UTF-16 y git lo trata como binario (diffs ilegibles): usar `Out-File -Encoding utf8`.

Si Next no toma archivos nuevos (sobre todo `proxy.ts`), borrar la caché: `.next`.
El equipo trabaja en **Windows / PowerShell**.

## Estructura

```
src/
  proxy.ts                       Sesión de Supabase, login, inactividad y verificación en dos pasos (lib/supabase/proxy.ts)
  app/
    (auth)/                      Login, registro, /login/verificar (código MFA), /recuperar, /nueva-contrasena y sus acciones
    auth/confirm/route.ts        Links de los mails (confirmación y recuperación; respeta `next`)
    api/cron/notifications/      Cron de notificaciones (Vercel, cada minuto; protegido con CRON_SECRET)
    (app)/                       Pantallas con sesión iniciada (layout con panel lateral)
      page.tsx                   Calendario (vista principal)
      pacientes/                 Listado, alta, ficha, edición, archivados, anotaciones
      sesiones/                  Lista de próximas sesiones + acciones de sesiones
      ingresos/                  Resumen de cobros del mes, quiénes adeudan + acciones de cobro
      perfil/                    Datos profesionales (nombre, apellido, matrícula)
      configuracion/             Preferencias: Personalización, Calendario, Sesiones, Vacaciones, Cuenta
                                 (account-actions.ts: contraseña, MFA, cerrar sesión en todos los dispositivos)
  components/
    ui/                          Componentes de shadcn (generados por la CLI)
    calendar/                    Calendario, panel de sesión, agendar, reprogramar/cancelar
    notes/                       Editor de anotaciones de sesión
    payments/                    Botones de cobro y cobro dentro del panel de sesión
    pwa/                         Registro del service worker, instalar la app, aviso sin conexión
    profile-defaults-provider.tsx  Duración y valor por defecto del perfil (los carga el layout)
    idle-logout.tsx              Aviso y cierre de sesión por inactividad (en el layout de (app))
  lib/
    supabase/{client,server,proxy}.ts
    supabase/admin.ts            Cliente con la secret key: SOLO para /api/cron/*
    push.ts  push-client.ts  notifications.ts   Envío y textos (servidor), suscripción (navegador), opciones
    database.types.ts            Generado por Supabase: NO editar a mano
    phone.ts  format.ts  form-state.ts  theme.ts  schedule.ts  payments.ts  calendar-views.ts  vacations.ts  modality.ts
    zoned.ts  timezones.ts       Fechas en la zona del perfil y zonas para elegir
    idle.ts  idle-cookies.ts     Cierre por inactividad: cookies y opciones (compartido) / escritura desde el servidor
    auth.ts  mfa.ts  safe-path.ts  Errores y validación de contraseñas, códigos TOTP, destino `next` seguro
    sign-out.ts  pending-saves.ts  Cerrar sesión desde el navegador (guarda lo pendiente y desuscribe el dispositivo)
supabase/migrations/             Toda la estructura de la base, en orden
supabase/tests/database/         Tests de la base (pgTAP): RLS, agenda, cobros, anotaciones, vacaciones, modalidad, MFA
```

## Base de datos

**Toda modificación de la base va como migración** en `supabase/migrations/`, dentro del PR.
Nunca modificar tablas desde el panel de Supabase. Después de cada migración, regenerar
`database.types.ts` y commitearlo en el mismo PR.

### Tablas

| Tabla | Contenido |
|---|---|
| `profiles` | Psicólogo (1 a 1 con `auth.users`, lo crea un trigger al registrarse). Tema, zona horaria (`timezone`), duración (`default_session_minutes`) y valor (`default_session_fee`) habituales de las sesiones, vista inicial del calendario (`calendar_view`), cierre por inactividad (`idle_timeout_minutes`: 15, 30, 60, 120 o 240). |
| `patients` | Pacientes. `active = false` = archivado. Teléfono en E.164. `modality`: `in_person` (por defecto) o `virtual`. |
| `session_series` | Horario fijo semanal (día, hora y duración). Un paciente puede tener varios. `end_date is null` = vigente. |
| `sessions` | Cada sesión concreta (suelta o generada por una serie). Duración en `duration_minutes` (`ends_at` lo calcula un trigger). Cobro: `fee`, `paid_at`, `payment_method`. `modality` null = la del paciente. |
| `session_notes` | Anotaciones de sesión (historia clínica), con versiones. |
| `vacations` | Períodos de vacaciones del psicólogo (`start_date`/`end_date`, fechas de reloj, sin superponerse). |
| `push_subscriptions` | Dispositivos con las notificaciones activadas (endpoint y claves de Web Push). |
| `notification_log` | Notificaciones ya enviadas (las escribe solo el cron; evita repetir envíos). |
| `audit_log` | Registro de modificaciones (lo escriben triggers). |

Vistas (todas `security_invoker = true`): `patient_list`, `calendar_sessions`, `session_book`, `session_payments`.

### Reglas que no se pueden romper

- **RLS en todas las tablas.** Cada fila tiene `psychologist_id` (default `auth.uid()`) y la política
  es `psychologist_id = (select auth.uid())`. Una tabla nueva sin política no se mergea.
- **Las tablas nuevas no se exponen solas** (está desactivado en Supabase, y las migraciones le quitan
  todo al rol `anon`, también por defecto). Cada migración que crea una tabla, vista o función debe incluir
  sus `grant ... to authenticated`.
  Las funciones: `revoke execute ... from public, anon` + `grant execute ... to authenticated`.
  `01_rls.test.sql` falla si `anon` puede usar algo del esquema `public`.
- Funciones SQL: `set search_path = ''` y nombres calificados (`public.tabla`).
  `security invoker` salvo que sea imprescindible (solo `handle_new_user`, `write_audit_log`, `due_notifications`
  y `mfa_enabled` son `security definer`; `due_notifications`, ejecutable solo por `service_role`).
- **Verificación en dos pasos en la base:** cada tabla tiene, además de la de "lo propio", una política
  `as restrictive` que exige `aal2` si el usuario tiene un factor verificado (`public.mfa_enabled()`).
  Una tabla nueva lleva las dos (ver `20261001150646_account_security.sql`) y su caso en `09_account_security.test.sql`.
- Las vistas siempre con `with (security_invoker = true)`.
- **La `service_role` / secret key (`SUPABASE_SECRET_KEY`) se usa SOLO en `src/lib/supabase/admin.ts`**, que solo
  importan las rutas `src/app/api/cron/*` (ESLint lo impide en el resto). Nunca en componentes, Server Actions de
  usuario ni con prefijo `NEXT_PUBLIC`. Lo que toque, a través de funciones acotadas y tablas sin datos clínicos.
- Relaciones entre tablas con FK compuesta `(id, psychologist_id)`: impiden vincular datos de otro psicólogo.

### Reglas del dominio

- **Sesiones:** inicio y fin escritos como `HH:MM`; una sesión no cruza la medianoche.
  El fin es **opcional**: vacío = inicio + duración habitual del perfil (45, 50, 60, 75 o 90 min).
  La interfaz lo completa con `resolveEnd` (`lib/schedule.ts`, duración vía `useSessionLength()`
  de `components/profile-defaults-provider.tsx`, que carga el layout);
  en la base, sin fin, `schedule_session` y los horarios fijos usan `default_session_minutes()`.
  Reprogramar sin fin (llamando directo a la base) conserva la duración.
  La base impide sesiones superpuestas no canceladas (restricción de exclusión).
  Los choques devuelven errores con `hint = 'schedule_conflict'`; mostrarlos tal cual al usuario.
- **Horarios fijos:** se generan filas reales en `sessions` (no recurrencias calculadas al vuelo).
  Se generan 12 meses; `extend_series()` (llamada al abrir el calendario) extiende cuando quedan menos de 3.
  Un paciente puede tener varios horarios fijos (ej. martes y jueves 18:00); `patient_list.schedules` los trae todos
  (`weekday`/`start_time` solo el más reciente, por compatibilidad). Formato: `[{ weekday, start_time, end_time }]` (`lib/schedule.ts`).
  Usar las funciones existentes: `create_patient_with_schedules`, `update_patient_with_schedules` (deja exactamente
  los horarios indicados), `add_patient_schedules` (suma horarios), `schedule_session`, `reschedule_session`,
  `reschedule_series_from`, `cancel_series_from`, `set_patient_archived`.
  `create_patient`, `update_patient` y `set_patient_schedule` quedan solo por compatibilidad: no usarlas.
- **Agregar sesión:** el mismo panel (`components/calendar/add-session-dialog.tsx`) en Sesiones, Calendario y la ficha
  del paciente; el formulario de paciente usa sus mismos campos (`session-plan-fields.tsx`).
  Regular = suma días fijos; irregular = una sesión suelta.
- **Valor por sesión:** `patients.session_fee is null` = usa `profiles.default_session_fee` (no se copia al paciente,
  así un cambio de valor en el perfil alcanza a todos los que no tienen uno propio). En la interfaz, `useDefaultFee()`.
- **Cobros:** se cobra cada sesión entera (`mark_sessions_paid(ids, método)`, `mark_session_unpaid`), realizada,
  futura (cobro por adelantado) o cancelada (ej. cancelación tardía); medios: `cash`, `transfer`, `other` (`lib/payments.ts`).
  `session_payments` trae todas las sesiones (pasadas, futuras y canceladas) con su valor
  (`coalesce(sessions.fee, patients.session_fee, profiles.default_session_fee)`) y su `status`:
  para las realizadas, filtrar `status = 'scheduled'` y `starts_at <= now()`.
  En Ingresos, "Cobrado" va por fecha de cobro (`paid_at`, incluye canceladas cobradas); "Pendiente" y "Adeudan",
  por sesiones realizadas (una cancelada sin cobrar no es deuda).
  El valor de una sesión se fija en `sessions.fee` al cobrarla o cuando cambia el valor del paciente/perfil
  (triggers): las sesiones ya pasadas conservan el valor que regía. Una sesión cobrada no se cancela ni se borra
  (trigger `sessions_payment_guard`): primero se deshace el cobro. Sí se reprograma mientras no se haya realizado,
  y una cancelada cobrada puede volver a agendarse (el cobro la acompaña).
- **Modalidad (presencial / virtual):** obligatoria en el paciente (presencial por defecto). Cada sesión usa la del
  paciente salvo que se cambie para ella (`set_session_modality`, "solo esta" o "esta y las siguientes": esta última
  cambia la del paciente de ahí en adelante). Como con el valor, al cambiar la del paciente las sesiones ya realizadas
  conservan la que tuvieron (trigger). `calendar_sessions.modality` trae la que corresponde. Valores en `lib/modality.ts`.
- **Vacaciones:** en vacaciones no hay sesiones de horarios fijos; las sueltas sí (urgencias, de cualquier paciente).
  `add_vacation` borra las futuras de horario fijo en esas fechas (si alguna está cobrada o tiene anotación, no carga nada),
  `generate_series_sessions` saltea los días de vacaciones y el trigger `sessions_vacation_guard` impide agendar,
  reprogramar o reactivar una de horario fijo ahí (`hint = 'vacation'`). `remove_vacation` las vuelve a generar.
  Las canceladas de horario fijo se conservan y el calendario las oculta en esos días. La interfaz las lee con
  `useVacations()` (`components/vacations-provider.tsx`, las carga el layout) y las pinta con `--vacation` (`calendar.css`).
- **Estados de sesión:** solo `scheduled` y `cancelled`. Una sesión pasada no cancelada se considera realizada.
  La "próxima sesión" se calcula (primera futura con `scheduled`); no se guarda.
- **Anotaciones (historia clínica, Ley 26.529):** en la interfaz se llaman "anotaciones" (no "informes"); en el código y la base, `notes` / `session_notes`. Un borrador (`draft`) se edita; uno finalizado (`final`)
  **no se modifica ni se borra** (lo impide un trigger). Para corregir, se inserta una fila nueva con
  `supersedes_id`. Las sesiones con anotación nunca se borran.
  El borrador se guarda solo (`note-editor.tsx`): 3 s después de dejar de escribir, al ocultar la app y al cerrar
  el editor, de a uno por vez (cola), así una corrección crea una sola versión nueva y después la actualiza.
  Cada guardado queda en `audit_log`: no guardar por tecla. Una corrección en borrador se puede descartar
  (`discardCorrection`); solo se revalidan las pantallas al finalizar o descartar.
- **Pacientes:** se archivan, no se borran. Archivar quita las sesiones futuras de su horario fijo.
- **Teléfonos:** se guardan en E.164 (`+5491123456789`) usando `normalizePhone` de `lib/phone.ts`.
  Argentina por defecto; a los números argentinos sin 9 se les agrega (se asumen celulares, para WhatsApp).
- **Fechas y zona horaria:** la base guarda `timestamptz`. Las horas "de reloj" se convierten con la zona horaria
  de `profiles.timezone` (la del navegador al registrarse; si no, `America/Argentina/Buenos_Aires`), que se cambia
  en Configuración (`set_timezone`: las sesiones futuras y los horarios fijos conservan su hora de reloj).
  **Toda la app usa la zona del perfil, nunca la del dispositivo:** el calendario (FullCalendar con `timeZone` y
  `time-zone-plugin.ts`), "hoy" y los selectores de fecha. En el navegador, los días se manejan "de reloj" con
  `lib/zoned.ts` (`toWall`, `fromWall`, `todayIn`; zona vía `useTimeZone()`): no usar `new Date()` ni
  `startOfDay(new Date())` para saber qué día es. Zonas para elegir: `lib/timezones.ts`.
- Datos de prueba ficticios; **nunca pacientes reales** fuera de producción.

## Convenciones de código

- **Textos de la interfaz en castellano rioplatense con voseo** ("Elegí", "Guardá", "Tu perfil").
  Los nombres en el código (variables, tablas, columnas) en inglés.
- **Lectura de datos:** en Server Components con `createClient()` de `lib/supabase/server.ts`.
  En componentes cliente que cargan datos al navegar (ej. el calendario), `lib/supabase/client.ts`.
- **Escrituras:** Server Actions (`"use server"`) que validan con Zod, llaman a Supabase y hacen `revalidatePath`.
- **Formularios:** `useActionState` + tipo `FormState` (`lib/form-state.ts`): `error`, `fieldErrors`,
  `success` y `values` (para no perder lo escrito si hay error). Errores por campo con `<FieldError>`.
- **shadcn con Base UI (no Radix):**
  - No existe `asChild`: se usa la prop `render`, ej. `<Button render={<Link href="/x" />} nativeButton={false}>`.
  - Un ítem de menú que navega: `onClick={() => router.push(...)}`, no un `<Link>` adentro.
  - Agregar componentes con `npx shadcn@latest add <nombre>`; no copiarlos a mano.
- Tema claro/oscuro con `next-themes`; la preferencia se guarda en `profiles.theme`.
- **Configuración** (`/configuracion`): cada sección es un `<SettingsSection>` y cada opción un `<Field>` adentro.
  Las opciones se aplican al instante y se guardan en `profiles` con las acciones de `configuracion/actions.ts`
  (los textos, como el valor por sesión, al salir del campo). Mi perfil queda solo para los datos profesionales.
  Excepción: en Cuenta, la contraseña, la verificación en dos pasos y "cerrar sesión en todos los dispositivos"
  llevan botón y confirmación (diálogo). Cambiar el email, cuando se sume, también.
- Comentarios breves en castellano explicando el *porqué*.

## PWA

Profesio se instala como app (Chrome, Edge, Android; en iPhone/iPad desde Safari, "Agregar a pantalla de inicio").
- `src/app/manifest.ts` (manifest), íconos en `public/icons/` + `src/app/favicon.ico` e `icon.png`. Se generan con
  `node scripts/generate-icons.mjs` (diseño provisorio: "P" en Lora, fuente en `scripts/fonts/`); con el logo final,
  cambiar el script y volver a correrlo. Si cambian `offline.html` o los íconos, subir la versión del caché en `sw.js`.
- `public/sw.js` (lo registra `components/pwa/service-worker-register.tsx`, **solo en producción**): precachea
  `offline.html` y los íconos; las navegaciones van a la red y, sin conexión, muestran `offline.html`.
- **Regla: el service worker nunca cachea páginas de la app, respuestas de Supabase ni Server Actions.** Son datos
  clínicos y no pueden quedar guardados en el dispositivo. No es una app offline.
- `sw.js`, `offline.html` y el manifest están fuera del matcher de `proxy.ts` (se piden sin sesión).
- Instalar: `useInstallPrompt()` (`hooks/use-install-prompt.ts`), en Configuración ("Instalar la app") y en el
  menú del usuario. Sin conexión: `components/pwa/offline-banner.tsx` (con `navigator.onLine`; no se usa
  `experimental.useOffline` porque reintenta solas las Server Actions y podría repetir una escritura).
- Para probarla: `npm run build && npm run start` (en `npm run dev` no hay service worker).

## Notificaciones

Recordatorio de cada sesión y resumen del día, por Web Push (claves VAPID, librería `web-push`).
- **Cron** (`vercel.json`, cada minuto) → `src/app/api/cron/notifications/route.ts`: exige
  `Authorization: Bearer ${CRON_SECRET}` (está fuera del matcher de `proxy.ts`), llama a
  `due_notifications(now())` con el cliente admin y envía a cada dispositivo del psicólogo.
- **Deduplicación:** cada envío se registra en `notification_log` **antes** de enviarlo; los índices únicos
  (sesión + tipo, y psicólogo + tipo + día para el resumen) hacen que una corrida repetida o superpuesta choque
  (23505) y no lo vuelva a enviar. `due_notifications` tiene tolerancia (2 min el recordatorio, 10 el resumen)
  por si Vercel saltea una corrida. Las suscripciones que responden 404/410 se borran.
- **Regla: las notificaciones nunca llevan contenido de anotaciones ni datos clínicos.** Se ven en la pantalla
  bloqueada: solo hora, modalidad y, si el psicólogo lo elige (`notification_show_name`), nombre e inicial.
  Los textos se arman en `src/lib/push.ts`. En los logs del cron, solo cantidades.
- Dispositivos en `push_subscriptions` (se activan en Configuración, uno por uno; al cerrar sesión se borra el de
  ese dispositivo). Preferencias en `profiles`: `reminder_minutes`, `daily_summary_*`, `notification_show_name`.
- Para probar el cron a mano: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications`
  (con `npm run build && npm run start`: sin service worker no hay notificaciones).

## Seguridad de la cuenta

- **Contraseña:** "¿Olvidaste tu contraseña?" → `/recuperar` (siempre el mismo mensaje, exista o no la cuenta) →
  mail → `/auth/confirm?next=/nueva-contrasena`. Cambiarla en Configuración pide la actual: se verifica con
  `signInWithPassword` en un cliente aparte sin cookies (con el de la sesión, la reemplazaría por una aal1).
  Mientras se use la plantilla de mail original de Supabase (`code`), el link funciona solo en el navegador donde
  se pidió; con SMTP propio y plantilla con `token_hash`, en cualquiera.
- **Cierre por inactividad** (`profiles.idle_timeout_minutes`, sin opción "nunca"): cookies `profesio_last_activity`
  (ms) y `profesio_idle_timeout` (minutos) (`lib/idle.ts`). **Lo hace cumplir el proxy**: si venció, `signOut` y
  `/login?motivo=inactividad` antes de renderizar nada, también en Server Actions (para estas responde con
  `x-action-redirect`, como hace Next con `redirect()`: un 307 haría que fetch repita el POST en el login).
  Así una pestaña dormida, un celular bloqueado o una compu sin JavaScript no pueden seguir usando la sesión.
  Cada request con sesión renueva la actividad. El navegador (`IdleLogout`) suma la actividad que no llega al
  servidor (teclas, toques, scroll; como mucho una vez por minuto), avisa un minuto antes y cierra 5 s antes del
  límite con `signOutThisDevice` (el mismo que el menú: guarda el borrador de una anotación con `pending-saves`
  y desuscribe las notificaciones). Las cookies no son httpOnly: el navegador escribe la actividad (solo permite
  extender la propia sesión). Se escriben al ingresar (login, link del mail, código MFA) y al cambiar la preferencia.
  Limitación: si la sesión ya venció en el servidor (ej. el celular estuvo bloqueado más que el límite), un borrador
  sin guardar se pierde; en la práctica no debería haberlo (se guarda a los 3 s y al ocultar la app).
- **Verificación en dos pasos (TOTP):** Configuración → Cuenta (hasta 2 dispositivos; quitar el último pide un código).
  Con un factor verificado, el login sigue en `/login/verificar` y el proxy manda ahí toda ruta privada mientras la
  sesión sea aal1. La base no devuelve nada a una sesión aal1 de ese usuario (políticas restrictivas); el cron
  (`service_role`) y las funciones `security definer` no pasan por RLS. Supabase, al verificar un factor nuevo, cierra
  las otras sesiones, y al verificar un código, invalida las sesiones aal1 del usuario.
- **Cerrar sesión:** el menú cierra solo este dispositivo (`scope: "local"`; el default de Supabase es global).
  "Cerrar sesión en todos los dispositivos" usa `scope: "global"` y borra todas las suscripciones de notificaciones.
- **Soporte — perdió la app de códigos y no tiene otro dispositivo:** verificar la identidad del psicólogo por un
  canal confiable (no alcanza con un mail desde la misma casilla) y recién entonces, solo en ese caso, quitarle el
  factor en Supabase → Authentication → Users → el usuario → MFA. Eso cierra todas sus sesiones; después vuelve a
  activarla desde Configuración.

## Flujo de trabajo (Git)

- `main` siempre funciona y está protegida: todo entra por Pull Request aprobado por el otro.
- Antes de empezar: `git checkout main && git pull && git checkout -b feature/nombre`.
- Ramas `feature/...` y `fix/...`. Verificar con `git status` que no se commitea en `main`.
- `.env.local` nunca se sube (el repo tiene `.env.example`).
- Antes del PR: `npm run build`, `npm run lint` y `npm run test:db` sin errores.
- **Configuración de Supabase (dev y prod), desde el panel:** Authentication → Multi-Factor → TOTP habilitado
  (enroll y verify); Authentication → URL Configuration → Redirect URLs con el dominio y `/**` (ej.
  `http://localhost:3000/**`), para que `/auth/confirm?next=...` sea aceptado. La plantilla "Reset password" se
  configura cuando haya SMTP propio (con `token_hash` y `type=recovery`, como la de confirmación).
- **Una migración mergeada a `main` también se aplica a `profesio-prod`:** vincular prod, `db push` y volver a
  vincular dev (verificar siempre con `npx supabase projects list` cuál está vinculado):
  `npx supabase link --project-ref <ref de prod>` → `npx supabase db push` → `npx supabase link --project-ref <ref de dev>`.

## Pendientes conocidos

- Etapa 7: separar `profesio-prod`, SMTP propio (mails en castellano), prueba con un psicólogo real.
- Logo definitivo (los íconos actuales son provisorios).
- Auditoría de lecturas (hoy solo se registran modificaciones).
