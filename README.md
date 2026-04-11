# PERRY APP 🏗️

**Sistema de Gestión de Actividades de Ingeniería**

Aplicación web completa para registrar, almacenar y analizar actividades de un equipo de ingenieros que también realiza labores de venta y ejecución.

---

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+ (recomendado v20)
- npm 9+

### Pasos para ejecutar

```bash
# 1. Instalar dependencias
npm install

# 2. Generar cliente Prisma
npx prisma generate

# 3. Crear la base de datos y aplicar schema
npx prisma db push

# 4. Poblar con datos de ejemplo
npx prisma db seed

# 5. Iniciar la aplicación
npm run dev
```

La app estará disponible en **http://localhost:3000**

---

## 🔐 Credenciales de Acceso (Seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Admin** | admin@perryapp.com | admin123 |
| **Supervisor** | supervisor@perryapp.com | super123 |
| **Ingeniero** | pedro@perryapp.com | ing123 |
| **Ingeniero** | ana@perryapp.com | ing123 |
| **Ingeniero** | ricardo@perryapp.com | ing123 |

---

## 📋 Funcionalidades

### 1. Autenticación y Roles
- Login con email y contraseña
- Tres roles: Admin, Supervisor, Ingeniero
- Admin ve todo; Supervisor ve su equipo; Ingeniero solo sus datos
- Protección de rutas con middleware
- Sesión persistente con JWT

### 2. Dashboard
- Total de actividades, horas registradas, oportunidades
- Lead time promedio (visita → cotización)
- Pendientes de cotización y oportunidades atrasadas
- Gráfico de pastel por tipo de actividad
- Gráfico de barras por responsable
- Desglose por tipo (visitas, cotizaciones, ejecuciones, planeación)
- Estado de oportunidades
- Tabla de actividades recientes

### 3. Captura de Actividades
- Formulario completo con todos los campos requeridos
- Selección de cliente, contacto, oportunidad
- Cálculo automático de duración
- Edición y eliminación
- Filtros por tipo, estatus, responsable, cliente, fecha, texto

### 4. Importación de Reportes WhatsApp
- Pegar texto libre
- Análisis y clasificación automática por heurísticas
- Previsualización editable línea por línea
- Cambio de tipo, cliente y contacto antes de guardar
- Guardado masivo de actividades
- Persistencia del texto original

### 5. Oportunidades Comerciales
- Seguimiento de visita → cotización
- Cronología visual con estados
- Cálculo automático de lead time
- Semáforo de vencimiento (verde/amarillo/rojo)
- Relación con actividades vinculadas
- Folio auto-generado (OPP-YYYY-NNN)

### 6. Analítica
- Métricas de conversión (visita → cotización → cierre)
- Embudo de conversión visual
- Tendencia mensual por tipo de actividad
- Horas por tipo (gráfico de pastel)
- Rendimiento por responsable
- Tiempo promedio de respuesta

### 7. Exportación CSV
- Exportar actividades filtradas a CSV
- Exportar oportunidades filtradas a CSV
- Formato compatible con Excel (UTF-8 con BOM)

---

## 🏗️ Arquitectura

### Stack
| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v3 |
| ORM | Prisma 5 |
| Base de datos | SQLite (desarrollo) |
| Auth | NextAuth.js v5 (beta) |
| Formularios | React Hook Form + Zod |
| Gráficos | Recharts |

### Estructura del proyecto
```
PERRY_APP/
├── prisma/
│   ├── schema.prisma        # Modelo de datos
│   ├── seed.ts              # Datos de ejemplo
│   └── dev.db               # BD SQLite
├── src/
│   ├── app/
│   │   ├── (dashboard)/     # Rutas protegidas
│   │   │   ├── actividades/
│   │   │   ├── analitica/
│   │   │   ├── dashboard/
│   │   │   ├── oportunidades/
│   │   │   └── reportes/
│   │   ├── api/              # API Routes
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── forms/            # Formularios
│   │   └── layout/           # Sidebar, Header
│   ├── lib/
│   │   ├── auth.ts           # NextAuth config
│   │   ├── classifier.ts     # Clasificador heurístico
│   │   ├── parser.ts         # Parser WhatsApp
│   │   ├── prisma.ts         # Prisma client
│   │   ├── utils.ts          # Utilidades
│   │   └── validators.ts     # Schemas Zod
│   ├── middleware.ts          # Protección de rutas
│   └── types/
├── .env                      # Variables de entorno
├── docker-compose.yml        # PostgreSQL (opcional)
└── package.json
```

### Modelo de datos
- **User** — Usuarios con roles (Admin, Supervisor, Ingeniero)
- **Client** — Clientes con código único
- **Contact** — Contactos por cliente
- **DailyReport** — Reportes diarios con texto original
- **Activity** — Actividades con tipo, estatus, duración, vinculaciones
- **Opportunity** — Oportunidades con cronología visita→cotización

---

## 🛠️ Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo
npm run build      # Build de producción
npm run start      # Servidor de producción
npm run lint       # Linter

# Prisma
npm run db:generate   # Generar cliente
npm run db:push       # Sincronizar schema
npm run db:seed       # Ejecutar seed
npm run db:studio     # Prisma Studio (GUI)
npm run db:reset      # Resetear BD completa
```

---

## 📊 Variables de entorno

```env
DATABASE_URL="file:./dev.db"           # SQLite (desarrollo)
AUTH_SECRET="your-secret-key"          # Secreto para JWT
NEXTAUTH_URL="http://localhost:3000"   # URL base
AUTH_TRUST_HOST=true                   # Confiar en el host
```

Para PostgreSQL (producción):
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/perry_app"
```

---

## 🔄 Migración a PostgreSQL

Si deseas usar PostgreSQL en producción:

1. Instala Docker y levanta el contenedor:
   ```bash
   docker-compose up -d
   ```

2. Cambia el datasource en `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Actualiza `.env`:
   ```env
   DATABASE_URL="postgresql://perry:perry_secret_2024@localhost:5432/perry_app"
   ```

4. Regenera y migra:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

---

## 📱 Diseño

- Interfaz completamente en español
- Diseño responsive (mobile-first)
- Navegación lateral en desktop, bottom nav en mobile
- Colores profesionales con gradientes
- Animaciones sutiles
- Glassmorphism en login
- Badges con colores por tipo y estatus

---

## 📝 Heurísticas de clasificación

Las reglas para auto-clasificar actividades desde texto libre están en `src/lib/classifier.ts`:

| Tipo | Palabras clave |
|------|---------------|
| VISITA_CAMPO | reunión, visita, levantamiento, se atiende |
| COTIZACION | cotización, propuesta, presupuesto, precio |
| EJECUCION | instalación, reemplazo, conexión, mantenimiento |
| PLANEACION | planeación, permisos, materiales, solicitud, coordinación |

Para añadir o modificar reglas, edita el array `CLASSIFICATION_RULES`.

---

## 📄 Licencia

Proyecto interno — Todos los derechos reservados.
