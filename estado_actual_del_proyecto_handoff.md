# Estado actual del proyecto — Handoff

## 1. Resumen general

| Concepto | Estado |
| :--- | :--- |
| **Workspace** | `C:\SistemaReservas` (contiene además los dos `.md` originales) |
| **Backend MERN** | Terminado y verificado |
| **Frontend React + Vite** | Parcial (8 de 12 páginas) |
| **Pruebas backend** | 18/18 en verde (`npm test`) |
| **Dependencias backend** | Instaladas (`node_modules` presente, 269 paquetes) |
| **Dependencias frontend** | Pendientes de instalar |
| **Build frontend** | Pendiente y fallaría hoy (faltan 4 archivos importados) |
| **Node / npm** | `v22.14.0` / `10.9.2` |

> ⚠️ **Punto crítico:** `frontend/src/App.jsx` ya importa 4 páginas que no existen todavía. Mientras no se creen, `npm run build` del frontend dará error de módulo no encontrado.

---

## 2. Backend — lo que ya está hecho

**Ubicación:** `C:\SistemaReservas\backend`

### Estructura completa creada:
- `package.json`, `package-lock.json`, `.env.example`, `vitest.config.js`
- `src/config/`: `env.js`, `database.js`
- `src/utils/`: `apiError.js`, `response.js`, `asyncHandler.js`, `validate.js`, `dates.js`, `permissions.js`, `states.js`
- `src/middlewares/`: `auth.js`, `rbac.js`, `errorHandler.js`
- `src/models/` (8): `Tenant.js`, `User.js`, `Client.js`, `Professional.js`, `Service.js`, `Appointment.js`, `TokenBlacklist.js`, `ScheduleLock.js`
- `src/repositories/` (9): `baseTenantRepository.js`, `tenantRepository.js`, `userRepository.js`, `tokenBlacklistRepository.js`, `scheduleLockRepository.js`, `clientRepository.js`, `professionalRepository.js`, `serviceRepository.js`, `appointmentRepository.js`
- `src/services/` (10): `tenantService.js`, `authService.js`, `clientService.js`, `professionalService.js`, `serviceService.js`, `availabilityService.js`, `appointmentService.js`, `agendaService.js`, `dashboardService.js`, `userService.js`
- `src/controllers/` (10): uno por cada servicio
- `src/routes/`: `index.js` + 10 archivos de rutas (`tenant`, `auth`, `user`, `client`, `professional`, `service`, `availability`, `appointment`, `agenda`, `dashboard`)
- `src/app.js`, `src/server.js`, `src/seed.js`
- `tests/`: `setup.js`, `helpers.js`, `auth.test.js`, `clients.test.js`, `appointments.test.js`, `dashboard.test.js`

### Verificación ejecutada:
```bash
cd C:\SistemaReservas\backend
npm install        # → 269 paquetes, OK
npm test           # → 4 archivos, 18 tests, 18 passed ✅
```

### Errores que ya quedaron corregidos (no repetir):
1. `publicTenant` no era named export → causaba `500` en `/auth/login`.
2. `OverwriteModelError` entre archivos de test → los modelos usan `mongoose.models.X || model(...)`.
3. `userRepository.findByIdAndTenant` no existía y se llamaba con los argumentos invertidos → `401` en rutas protegidas.
4. El `ScheduleLock` no devolvía `tenantId` al liberarse → timeout de 5 s y `500` en reservas solapadas.
5. Pipeline de `$count` mal formado en `dashboardService.getConsolidated` → `500`.
6. Índice duplicado de `identifier` en `Tenant`.

---

## 3. Frontend — lo que ya está hecho

**Ubicación:** `C:\SistemaReservas\frontend`

### Creado:
- `package.json`, `vite.config.js`, `index.html`, `.env.example`
- `src/main.jsx`, `src/App.jsx`, `src/styles.css`
- `src/utils/session.js`
- `src/services/api.js`, `catalogService.js`, `appointmentService.js`, `dashboardService.js`
- `src/context/AuthContext.jsx`
- `src/routes/ProtectedRoute.jsx`
- `src/components/Layout.jsx`, `Modal.jsx`, `PageHeader.jsx`, `StatusBadge.jsx`
- `src/pages/` (8): `Login.jsx`, `RegisterClient.jsx`, `Home.jsx`, `Profile.jsx`, `Services.jsx`, `Clients.jsx`, `Professionals.jsx`, `Users.jsx`

> **Último archivo escrito antes del corte:** `frontend/src/pages/Users.jsx`.

---

## 4. Lo que falta exactamente (en orden)

### Paso 1 — Crear los 4 archivos que faltan en `frontend/src/pages/`

| Archivo | Contenido esperado |
| :--- | :--- |
| **`Availability.jsx`** | Formulario `professionalId`, `serviceId`, `date` → `getAvailability()` → lista de slots clicables |
| **`Appointments.jsx`** | Filtros (cliente, profesional, servicio, desde/hasta), tabla con `StatusBadge`, modal de nueva cita (consulta disponibilidad), reprogramar, cancelar con SweetAlert2, cambiar estado |
| **`Agenda.jsx`** | `<FullCalendar>` con vistas day/week/month + `dayGridPlugin`, `timeGridPlugin`, `interactionPlugin`; filtros; `eventClick` → Swal con detalle; `eventDrop` → `rescheduleAppointment()` y `info.revert()` si falla |
| **`Dashboard.jsx`** | Rango de fechas → `getConsolidatedDashboard()`; tarjetas KPI (total citas) + tablas de servicios y clientes con rank |

### Paso 2 — Instalar y verificar frontend
```bash
cd C:\SistemaReservas\frontend
npm install
npm run build
```
*Corregir cualquier error de import (sobre todo los de FullCalendar v6, que no requiere imports CSS explícitos — ya se retiraron de `main.jsx`).*

### Paso 3 — Fase 7: documentación
Crear carpeta `C:\SistemaReservas\docs` con:
- `README.md` (instalación, `.env`, comandos, credenciales seed, arquitectura por capas)
- `registro-decisiones.md` (las 5 decisiones cerradas: estructura, US-11 soft delete, transacción+bloqueo, pruebas críticas+Gherkin, matriz como fuente de 29 HU)
- `escenarios-gherkin.md` con los 116 escenarios (29 HU × 4) — aún no redactados; el Prompt Maestro y `matriz-historias-usuario.md` tienen el listado base.

### Paso 4 — Puesta en marcha real
1. Copiar `backend/.env.example` → `backend/.env` y poner `MONGODB_URI` de Atlas, `JWT_SECRET`, `CORS_ORIGIN`.
2. Copiar `frontend/.env.example` → `frontend/.env` con `VITE_API_URL=http://localhost:4000/api`.
3. Ejecutar `npm run seed` en `backend` (crea tenant demo, admin, profesional, servicios, cliente).
4. Ejecutar `npm run dev` en `backend` (puerto `4000`) y `npm run dev` en `frontend` (puerto `5173`).

---

## 5. Contratos técnicos que debes respetar al continuar

| Item | Valor |
| :--- | :--- |
| **Base URL API** | `http://localhost:4000/api` |
| **Envelope JSON** | `{ success, data, message, errors? }` |
| **Headers inyectados** | `Authorization: Bearer <token>`, `X-Tenant-Id`, `X-Role` |
| **Login** | `POST /auth/login` con `{ tenant, email, password }` (slug del tenant) |
| **Registro cliente** | `POST /auth/register-client` |
| **Seed** | tenant `demo` · admin `admin@demo.local` / `Admin1234` · cliente `cliente@demo.local` / `Cliente1234` |
| **Aislamiento** | Todo repo Mongoose exige `tenantId`; `aggregate` hace `$match` inicial |
| **Concurrencia** | `ScheduleLock` + `withTransaction` + solapamiento `[start, end)` |
| **US-11** | Borrado lógico (`deletedAt`), jamás borrado físico |
| **US-05** | Incluida como historia explícita (fuente: `matriz-historias-usuario.md`, 29 HU) |
| **Pruebas** | Vitest + Supertest + `MongoMemoryReplSet` (replica set para transacciones) |

---

## 6. Cómo retomar en otra sesión

Cuando cambies de agente/sesión, copia y pega esto:

> Continúa el proyecto desde el estado actual en `C:\SistemaReservas`. El backend está terminado con 18/18 tests en verde y `node_modules` instalado. El frontend tiene 8 de 12 páginas; faltan `Availability.jsx`, `Appointments.jsx`, `Agenda.jsx` y `Dashboard.jsx`, que ya están importados en `App.jsx`. Créalos, ejecuta `npm install && npm run build` en frontend, y luego completa la documentación Gherkin de 116 escenarios y el README. Respeta los contratos de API y las decisiones ya cerradas (soft delete, transacción+bloqueo, matriz de 29 HU como fuente).

*Nota: Estoy en modo planificación, así que en esta sesión no he tocado ningún archivo al redactar este resumen. Para que otra sesión pueda escribir el código restante, deberás cambiar de agente allí también.*