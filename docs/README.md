# Sistema Web de Reservas de Citas (SaaS Multiinquilino)

Aplicación MERN para gestionar citas de múltiples organizaciones (**tenants**) de forma aislada: clientes, profesionales, servicios, disponibilidad, prevención de solapamientos, agenda interactiva y dashboard analítico.

- **Backend:** Node.js (ESM) + Express + MongoDB Atlas (Mongoose) + JWT + RBAC.
- **Frontend:** React 18 + Vite + React Router + Agenda Interactiva propia (CSS Grid) + Day.js + SweetAlert2 + React-Toastify.
- **Arquitectura:** Controller → Service → Repository/DAO, con `tenantId` obligatorio en toda consulta.
- **Cobertura:** 116/116 pruebas backend en verde y 116 escenarios Gherkin documentados.

---

## 1. Estructura

```text
.
├── backend/
│   ├── src/
│   │   ├── config/        # entorno y conexión MongoDB
│   │   ├── models/        # esquemas Mongoose (Tenant, User, Client, Professional, ...)
│   │   ├── repositories/  # DAO con inyección transparente de tenantId
│   │   ├── services/      # reglas de negocio, slots, transacciones y RBAC
│   │   ├── controllers/   # req/res/next y envelope de respuesta
│   │   ├── routes/        # rutas REST por módulo
│   │   ├── middlewares/   # verifyToken, requirePermission, errorHandler
│   │   └── utils/         # ApiError, response, validate, dates, states
│   └── tests/             # Vitest + Supertest + MongoMemoryReplSet
├── frontend/
│   └── src/
│       ├── components/    # Layout, Modal, BookingModal, agenda/ (grilla + modal propia)
│       ├── pages/         # 12 páginas (Login, Citas, Agenda, Dashboard, ...)
│       ├── context/       # AuthContext (JWT, tenantId, rol) y AppointmentsContext (revision)
│       ├── routes/        # ProtectedRoute
│       ├── services/      # cliente Axios + servicios por dominio
│       └── utils/         # sesión en localStorage
└── docs/
    ├── README.md
    ├── registro-decisiones.md
    └── escenarios-gherkin.md
```

---

## 2. Requisitos previos

- Node.js **v22.14.0** o superior (verificado con npm **10.9.2**).
- Cuenta de **MongoDB Atlas** (o MongoDB local con replica set) y **MongoDB Compass** para inspección visual.
- URLs permitidas en CORS: `http://localhost:5173` por defecto.

---

## 3. Instalación y configuración

### 3.1 Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Editar `backend/.env`:

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PORT` | Puerto de la API | `4000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `MONGODB_URI` | Cadena de conexión de Atlas (con replica set) | `mongodb+srv://...` |
| `JWT_SECRET` | Secreto largo y aleatorio; obligatorio en producción | `cambia-este-valor` |
| `JWT_EXPIRES_IN` | Vigencia del token | `1h` |
| `PLATFORM_ADMIN_EMAIL` | Correo del administrador de plataforma creado por el seed | `platform@auraria.com` |
| `PLATFORM_ADMIN_PASSWORD` | Contraseña del administrador de plataforma creado por el seed | `Platform1234` |
| `SLOT_MINUTES` | Granularidad de horarios | `30` |
| `DEFAULT_SERVICE_DURATION` | Duración por defecto si no se elige servicio | `30` |
| `TZ` | Zona horaria de cálculo de fechas | `UTC` |
| `LOCK_TIMEOUT_MS` | Timeout del candado de agenda | `5000` |
| `LOCK_RETRY_MS` | Reintento al adquirir candado | `25` |
| `CORS_ORIGIN` | Origen autorizado del frontend | `http://localhost:5173` |

### 3.2 Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:4000/api
```

> La Agenda es un componente propio construido con CSS Grid: siete columnas de lunes a domingo y una fila por hora de 08:00 a 19:59. No se instalan librerías de calendario.

---

## 4. Comandos

| Acción | Comando | Directorio |
| :--- | :--- | :--- |
| Instalar dependencias | `npm install` | `backend` y `frontend` |
| Puesta en marcha API | `npm run dev` | `backend` |
| Puesta en marcha SPA | `npm run dev` | `frontend` |
| Cargar datos semilla | `npm run seed` | `backend` |
| Ejecutar pruebas | `npm test` | `backend` |
| Build de producción | `npm run build` | `frontend` |
| Servir build | `npm run preview` | `frontend` |
| Iniciar API en producción | `npm start` | `backend` |

### Orden recomendado de arranque

1. Configurar `backend/.env` (`MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`).
2. Configurar `frontend/.env`.
3. `npm run seed` en `backend`.
4. `npm run dev` en `backend` (puerto `4000`).
5. `npm run dev` en `frontend` (puerto `5173`).

---

## 5. Credenciales de la semilla

| Concepto | Valor |
| :--- | :--- |
| Tenant / identificador para login | `auraria` (también acepta `auraria.com`) |
| Organización | Auraria · Salón de belleza |
| Dominio del negocio | `auraria.com` (cada salón usa `<nombrenegocio>.com`) |
| Administrador | `admin@auraria.com` / `Admin1234` |
| Administrador de plataforma | `platform@auraria.com` / `Platform1234` (sin `tenantId`, alto total de tenants) |
| Clientes con cuenta | `cliente@auraria.com`, `laura.martinez@auraria.com` y 4 más / `Cliente1234` |
| Profesionales | 13 (Carlos Profesional, Lucía, Marta, Sofía, Carolina Díaz, …) / `Profesional1234`, jornada lun–sáb |
| Servicios | 17 servicios de belleza (corte, color, uñas, faciales, masajes, spa, …), cada profesional ofrece solo los suyos |

El seed es idempotente: si existe el tenant `demo` se migra a `Auraria` (`auraria.com`) actualizando correos; si el tenant ya existe, omite la creación del administrador, crea los servicios que falten y actualiza los profesionales con sus servicios. Puedes cambiar el nombre/dominio con `SEED_TENANT_NAME` y `SEED_TENANT_SLUG`.

---

## 6. Contrato de API

**Base URL:** `http://localhost:4000/api`

**Envelope de respuesta:**

```json
{ "success": true, "data": {}, "message": "Operación exitosa", "errors": null }
```

**Cabeceras inyectadas por el frontend:** `Authorization: Bearer <JWT>`, `X-Tenant-Id`, `X-Role`.

| Módulo | Endpoints principales |
| :--- | :--- |
| Autenticación | `POST /auth/login`, `POST /auth/register-client`, `POST /auth/logout`, `PATCH /auth/password` |
| Tenants | `POST /tenants`, `GET /tenants` (alta pública/administrativa y administración por tenant) |
| Plataforma | `POST /platform/tenants`, `GET /platform/tenants` (solo `platformAdmin`) |
| Usuarios | `GET /users`, `POST /users` |
| Clientes | `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id` |
| Profesionales | `GET/POST /professionals`, `PATCH /professionals/:id`, `POST /professionals/:id/services/:serviceId` |
| Servicios | `GET/POST /services`, `PATCH /services/:id` |
| Disponibilidad | `GET /availability?professionalId=&serviceId=&date=`, `GET /availability/recommended?date=&time=&serviceId=` (profesionales libres en un horario, ordenados por menor carga) |
| Citas | `GET/POST /appointments`, `PATCH /appointments/:id/reschedule`, `PATCH /appointments/:id/cancel`, `PATCH /appointments/:id/status` |
| Agenda | `GET /agenda?view=day\|week\|month&date=`, `GET /agenda/daily?date=` |
| Dashboard | `GET /dashboard/total`, `/top-services`, `/top-clients`, `/consolidated` |

**Códigos de estado:** `200` éxito · `201` creación · `400` validación · `401` no autenticado · `403` sin permisos · `404` no encontrado en el tenant · `409` conflicto de horario/duplicado/transición · `500` error no controlado.

---

## 7. Arquitectura y decisiones

### Capa Controller
Maneja únicamente HTTP: valida la forma básica del payload con `Validator.js` y devuelve el envelope estándar. Sin lógica de negocio ni consultas Mongoose.

### Capa Service
Contiene las reglas de dominio: RBAC, cálculo de slots, transiciones de estado (`programada → confirmada → completada`, `cancelada`, `no asistió`), reprogramación y cancelación idempotente.

### Capa Repository/DAO
Encapsula Mongoose e inyecta `tenantId` en `find`, `findOne`, `create`, `findOneAndUpdate`, `deleteOne` y `aggregate` (`$match` inicial). Ninguna consulta omite el filtro de organización.

### Decisiones bloqueadas

1. Estructura `backend/` + `frontend/`.
2. **US-11:** borrado lógico (`deletedAt`), jamás borrado físico de clientes con historial.
3. **US-21.4:** `ScheduleLock` + `withTransaction` + solapamiento semiabierto `[start, end)`.
4. Pruebas críticas automatizadas + 116 escenarios Gherkin.
5. Matriz de 29 HU como fuente de verdad, con US-05 (aislamiento) como historia explícita.
6. Alta de tenants disponible vía superadmin de plataforma y mediante registro público de salón.

Detalle completo en [`docs/registro-decisiones.md`](registro-decisiones.md).

---

## 8. Pruebas y documentación de aceptación

```powershell
cd backend
npm test
```

Resultado esperado: **6 archivos de prueba, 116 tests, 116 passed** (92 tests generados desde la matriz + 24 pruebas de regresión). Las pruebas usan `MongoMemoryReplSet` porque las transacciones requieren replica set.

Los **116 escenarios Gherkin** (29 HU × 4) están en [`docs/escenarios-gherkin.md`](escenarios-gherkin.md), con trazabilidad `US-XX-E1` … `US-XX-E4` y etiquetas para rutas exitosas, alternativas, de error y casos límite.

---

## 9. Solución de problemas

| Síntoma | Causa probable | Acción |
| :--- | :--- | :--- |
| `401` en rutas protegidas | Token expirado o ausente | Volver a iniciar sesión y verificar `JWT_SECRET` |
| `403` al crear servicios con Cliente o Recepcionista | RBAC esperado | Usar Administrador |
| Timeout al reservar horarios solapados | Falta de replica set | Usar MongoDB Atlas o `MongoMemoryReplSet` en pruebas |
| El frontend no conecta | `VITE_API_URL` incorrecto o CORS | Verificar `frontend/.env` y `CORS_ORIGIN` |
| Build del frontend falla por módulos no encontrados | Páginas faltantes o `npm install` incompleto | Reinstalar dependencias y verificar `src/pages/` |
| Fechas desplazadas | Zona horaria distinta | Mantener `TZ=UTC` y formatos `YYYY-MM-DD` / `HH:mm` |
