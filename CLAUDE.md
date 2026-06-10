# Guía de Desarrollo PERRY APP — Reglas y Comandos

Este archivo sirve como memoria y guía técnica para desarrolladores y asistentes de IA (como Antigravity/Claude/Gemini) que trabajen en este repositorio.

---

## 🚀 Comandos Útiles de Desarrollo

Para ejecutar comandos de npm/npx, se debe utilizar la ruta de Node/nvm local:
* **Entorno de desarrollo local**:
  `PATH="/Users/ivanjoselopezboyer/.nvm/versions/node/v20.20.2/bin:$PATH" npm run dev`
* **Compilación y verificación de tipos**:
  `PATH="/Users/ivanjoselopezboyer/.nvm/versions/node/v20.20.2/bin:$PATH" npx tsc --noEmit`
* **Generación de Cliente Prisma**:
  `PATH="/Users/ivanjoselopezboyer/.nvm/versions/node/v20.20.2/bin:$PATH" npx prisma generate`
* **Crear una nueva migración de base de datos**:
  `PATH="/Users/ivanjoselopezboyer/.nvm/versions/node/v20.20.2/bin:$PATH" npx prisma migrate dev`
* **Ejecutar script de RLS (Seguridad)**:
  `PATH="/Users/ivanjoselopezboyer/.nvm/versions/node/v20.20.2/bin:$PATH" npx ts-node --compiler-options '{"module":"commonjs"}' scratch/enable_rls.ts`

---

## 🔒 Directiva Crítica de Seguridad (Supabase & RLS)

> [!CAUTION]
> **Habilitar Row-Level Security (RLS) en todas las tablas del esquema `public`**
>
> Supabase expone automáticamente todas las tablas del esquema `public` a través de su API REST externa (`PostgREST`). Si RLS no está activo, cualquier usuario con la URL del proyecto y la anon key puede leer, editar o eliminar todos los registros.
>
> **Regla de Oro**:
> Cada vez que se cree una nueva tabla o se ejecute una migración (`prisma migrate dev`), **se debe ejecutar inmediatamente el script de habilitación de RLS** para asegurar las nuevas tablas:
> ```bash
> PATH="/Users/ivanjoselopezboyer/.nvm/versions/node/v20.20.2/bin:$PATH" npx ts-node --compiler-options '{"module":"commonjs"}' scratch/enable_rls.ts
> ```
> Prisma y el servidor Next.js conectan como el rol `postgres` (propietario/superuser), por lo que tienen `BYPASSRLS` automático y no se verán afectados por esta restricción.

---

## 🛠️ Reglas de Negocio Específicas

1. **Restricción de Estatus `EN_PROGRESO`**:
   * El estatus **"En Progreso"** (`EN_PROGRESO` / `ActivityStatus`) está restringido por software únicamente a actividades de tipo **"Cotización"** (`COTIZACION` / `ActivityType`).
   * No debe utilizarse ni permitirse en ningún otro tipo de actividad.
2. **Registro de Actividades Futuras**:
   * Cualquier actividad programada para una fecha posterior a la fecha local actual solo puede ser registrada inicialmente en estatus **"Pendiente"** (`PENDIENTE`).
   * El selector de estatus se deshabilita para fechas futuras durante el formulario de creación, y es validado en el endpoint `POST` del backend.
3. **Filtro de Responsables en Actividades**:
   * En la página de actividades, el dropdown de filtrado por responsable debe ser interactivo (con autocompletado y búsqueda por letras) y **excluir** al perfil `TECNICO`, ya que los técnicos no registran actividades propias directas y solo actúan como soporte de fin de semana.
4. **Remoción de Importación Múltiple**:
   * El módulo de importación de actividades a través de texto libre o chats de WhatsApp ha sido retirado por completo del frontend, endpoints y lógica de parser.
