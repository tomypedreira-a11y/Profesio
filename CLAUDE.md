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
```

En PowerShell 5.1, `>` guarda el archivo en UTF-16 y git lo trata como binario (diffs ilegibles): usar `Out-File -Encoding utf8`.

Si Next no toma archivos nuevos (sobre todo `proxy.ts`), borrar la caché: `.next`.
El equipo trabaja en **Windows / PowerShell**.

## Estructura

```
src/
  proxy.ts                       Sesión de Supabase + redirección al login
  app/
    (auth)/                      Login, registro y sus acciones
    auth/confirm/route.ts        Link del mail de confirmación
    (app)/                       Pantallas con sesión iniciada (layout con panel lateral)
      page.tsx                   Calendario (vista principal)
      pacientes/                 Listado, alta, ficha, edición, archivados, informes
      sesiones/                  Lista de próximas sesiones + acciones de sesiones
      perfil/                    Perfil del psicólogo
      configuracion/             Preferencias, en secciones (hoy: Personalización: modo y paleta)
  components/
    ui/                          Componentes de shadcn (generados por la CLI)
    calendar/                    Calendario, panel de sesión, agendar, reprogramar/cancelar
    notes/                       Editor de informes de sesión
  lib/
    supabase/{client,server,proxy}.ts
    database.types.ts            Generado por Supabase: NO editar a mano
    phone.ts  format.ts  form-state.ts  theme.ts  palettes.ts  schedule.ts
supabase/migrations/             Toda la estructura de la base, en orden
```

## Base de datos

**Toda modificación de la base va como migración** en `supabase/migrations/`, dentro del PR.
Nunca modificar tablas desde el panel de Supabase. Después de cada migración, regenerar
`database.types.ts` y commitearlo en el mismo PR.

### Tablas

| Tabla | Contenido |
|---|---|
| `profiles` | Psicólogo (1 a 1 con `auth.users`, lo crea un trigger al registrarse). Tema y zona horaria. |
| `patients` | Pacientes. `active = false` = archivado. Teléfono en E.164. |
| `session_series` | Horario fijo semanal (día, hora y duración). Un paciente puede tener varios. `end_date is null` = vigente. |
| `sessions` | Cada sesión concreta (suelta o generada por una serie). Duración en `duration_minutes` (`ends_at` lo calcula un trigger). |
| `session_notes` | Informes de sesión, con versiones. |
| `audit_log` | Registro de modificaciones (lo escriben triggers). |

Vistas (todas `security_invoker = true`): `patient_list`, `calendar_sessions`, `session_book`.

### Reglas que no se pueden romper

- **RLS en todas las tablas.** Cada fila tiene `psychologist_id` (default `auth.uid()`) y la política
  es `psychologist_id = (select auth.uid())`. Una tabla nueva sin política no se mergea.
- **Las tablas nuevas no se exponen solas** (está desactivado en Supabase). Cada migración que crea
  una tabla, vista o función debe incluir sus `grant ... to authenticated`.
  Las funciones: `revoke execute ... from public, anon` + `grant execute ... to authenticated`.
- Funciones SQL: `set search_path = ''` y nombres calificados (`public.tabla`).
  `security invoker` salvo que sea imprescindible (solo `handle_new_user` y `write_audit_log` son `security definer`).
- Las vistas siempre con `with (security_invoker = true)`.
- **Nunca** usar la `service_role` / secret key en el código de la app.
- Relaciones entre tablas con FK compuesta `(id, psychologist_id)`: impiden vincular datos de otro psicólogo.

### Reglas del dominio

- **Sesiones:** la duración la elige el usuario (inicio y fin, escritos como `HH:MM`); una sesión no cruza la medianoche.
  Sin fin, `schedule_session` usa 45 minutos y reprogramar conserva la duración (compatibilidad).
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
- **Estados de sesión:** solo `scheduled` y `cancelled`. Una sesión pasada no cancelada se considera realizada.
  La "próxima sesión" se calcula (primera futura con `scheduled`); no se guarda.
- **Informes (historia clínica, Ley 26.529):** un borrador (`draft`) se edita; uno finalizado (`final`)
  **no se modifica ni se borra** (lo impide un trigger). Para corregir, se inserta una fila nueva con
  `supersedes_id`. Las sesiones con informe nunca se borran.
- **Pacientes:** se archivan, no se borran. Archivar quita las sesiones futuras de su horario fijo.
- **Teléfonos:** se guardan en E.164 (`+5491123456789`) usando `normalizePhone` de `lib/phone.ts`.
  Argentina por defecto; a los números argentinos sin 9 se les agrega (se asumen celulares, para WhatsApp).
- **Fechas:** la base guarda `timestamptz`. Las horas "de reloj" se convierten con la zona horaria
  de `profiles.timezone` (por defecto `America/Argentina/Buenos_Aires`).
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
  Las opciones se aplican al instante y se guardan en `profiles` con una Server Action.
- **Paletas de color** (independientes del modo claro/oscuro): `<html data-palette="…">`, aplicado desde el servidor
  con la cookie `palette` (sin parpadeo) y sincronizado con `profiles.palette`. Para agregar una: sus colores
  en `src/app/palettes.css` (plantilla adentro, claro y oscuro) y su entrada en `PALETTES` (`lib/palettes.ts`);
  no hace falta migración. Se elige en Configuración → Personalización (`components/palette-selector.tsx`).
- **Colores: siempre con las variables del tema** (`bg-primary`, `text-muted-foreground`, `var(--border)`…),
  nunca fijos (`bg-blue-500`, `#fff`), para que respeten el modo y la paleta.
- Comentarios breves en castellano explicando el *porqué*.

## Flujo de trabajo (Git)

- `main` siempre funciona y está protegida: todo entra por Pull Request aprobado por el otro.
- Antes de empezar: `git checkout main && git pull && git checkout -b feature/nombre`.
- Ramas `feature/...` y `fix/...`. Verificar con `git status` que no se commitea en `main`.
- `.env.local` nunca se sube (el repo tiene `.env.example`).
- Antes del PR: `npm run build` y `npm run lint` sin errores.

## Pendientes conocidos

- Etapa 7: PWA (manifest e íconos), separar `profesio-prod`, SMTP propio (mails en castellano),
  prueba con un psicólogo real.
- Guardado automático del borrador del informe.
- Auditoría de lecturas (hoy solo se registran modificaciones).
- El calendario usa la zona horaria del dispositivo (no la del perfil).
