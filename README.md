# Profesio

Agenda y gestión de pacientes para psicólogos. Reemplaza la agenda en papel con una app web instalable (PWA) que se usa desde la computadora y el celular.

**Stack:** Next.js + TypeScript · Supabase (PostgreSQL, Auth, RLS) · Tailwind CSS + shadcn/ui · Vercel

La documentación funcional y técnica completa está en *Propuesta integral – App de gestión para psicólogos* (proyecto Profesio).

---

## Levantar el proyecto en una computadora nueva

### Requisitos

- [Node.js](https://nodejs.org) LTS (22 o superior)
- Git
- VS Code con las extensiones ESLint, Prettier y Tailwind CSS IntelliSense

### Pasos

```bash
git clone https://github.com/tomypedreira-a11y/Profesio.git profesio
cd profesio
npm install
```

Crear el archivo `.env.local` en la raíz, copiando `.env.example` y completando los valores del proyecto `profesio-dev` de Supabase (*Project Settings → API Keys*). Los valores se comparten por un canal privado, **nunca** por el repo.

```bash
npm run dev
```

La app queda en http://localhost:3000.

---

## Estructura

```
src/
  app/                   Rutas y pantallas (App Router de Next.js)
  components/ui/         Componentes de shadcn/ui
  lib/
    supabase/client.ts   Conexión a Supabase desde el navegador
    supabase/server.ts   Conexión a Supabase desde el servidor
    database.types.ts    Tipos generados desde la base (no editar a mano)
supabase/
  migrations/            Cambios de estructura de la base, en orden
```

---

## Base de datos

Toda la estructura de la base vive en `supabase/migrations/`. **Nadie modifica tablas a mano en el panel de Supabase.**

Configuración inicial de la CLI (una sola vez, pide la contraseña de la base):

```bash
npx supabase login
npx supabase link --project-ref <id-del-proyecto-dev>
```

Para hacer un cambio en la base:

```bash
npx supabase migration new nombre_del_cambio   # crea el archivo vacío
# escribir el SQL en el archivo creado
npx supabase db push                            # aplica la migración
npx supabase gen types typescript --linked > src/lib/database.types.ts
```

La migración y los tipos actualizados van en el mismo PR que el código que los usa.

### Reglas del modelo de datos

- Todas las tablas tienen **Row Level Security**: cada psicólogo solo ve y modifica sus propios datos.
- Las sesiones no pueden superponerse (restricción en la base).
- Las notas finalizadas no se modifican ni se borran; una corrección se guarda como versión nueva.
- Los pacientes se archivan (`active = false`), no se borran.
- Toda modificación queda en `audit_log`.

---

## Forma de trabajo

1. `main` siempre funciona. Nadie sube cambios directo ahí.
2. Antes de empezar algo nuevo:
   ```bash
   git checkout main
   git pull
   git checkout -b feature/nombre-de-lo-nuevo
   ```
3. Cada funcionalidad entra por Pull Request, vinculado a su Issue (`Closes #12`).
4. El otro revisa y aprueba el PR antes de mergear. Cada PR tiene su preview en Vercel para probarlo.
5. Las claves van en `.env.local` y en Vercel, nunca en Git.
6. En desarrollo se usan solo datos ficticios, nunca pacientes reales.

### Nombres de ramas

- `feature/...` para funcionalidades nuevas (`feature/pacientes`)
- `fix/...` para correcciones (`fix/calendario-colores`)