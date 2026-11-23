# Estado actual del proyecto — Handoff

## 1. Resumen general

| Concepto | Estado |
| :--- | :--- |
| **Workspace** | `C:\sistema-reservas-citas` |
| **Backend MERN** | Terminado y verificado |
| **Frontend React + Vite** | Terminado y verificado |
| **Matriz** | 29 historias de usuario / 116 escenarios, corregida y usada como fuente de verdad |
| **Pruebas backend** | 116/116 en verde (`npm test`, 6 archivos: 92 tests de matriz + 24 de regresión) |
| **Build frontend** | Correcto (`npm run build`) |
| **Motor de agenda** | Grid propio con CSS Grid, vista semanal LUN–DOM y celdas horarias 08:00–19:59 |
| **Documentación** | `docs/README.md` y `docs/escenarios-gherkin.md` actualizados |

> No se han realizado commits. La decisión de arquitectura, estilos y contratos de API se mantuvo intacta; la agenda conserva el diseño propio aprobado y no usa librerías de calendario.

---

## 2. Backend completado

**Ubicación:** `C:\sistema-reservas-citas\backend`

### Decisiones y ajustes cerrados
- Superadmin de plataforma con `platformAdmin`, permiso `platform.tenant.manage`, rutas `/api/platform/tenants` y seed con `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`.
- Alta de tenants disponible tanto para el superadmin como para el registro público/autoadministrado.
- Aislamiento estricto: `tenantId` obligatorio en repositorios, `aggregate` con `$match` inicial y helper `assertTenantOwnership`.
- Recurso ajeno al tenant: `403 Forbidden` sin filtrar datos; recurso inexistente o excluido dentro del tenant: `404`.
- JWT con `tokenVersion` invalidado en cambios de contraseña; `JWT_SECRET` obligatorio en producción.
- Reserva con `ScheduleLock` + `withTransaction` + solapamiento semiabierto `[start, end)`. Sin soporte de transacciones se devuelve error controlado.
- Validación de fechas pasadas, paginación en listados, rango `from`/`to` con `buildRange` y búsqueda de clientes con regex escapada.

### Verificación ejecutada
```powershell
cd C:\sistema-reservas-citas\backend
npm test
```
Resultado: **6 archivos de prueba, 116 tests, 116 passed**.

---

## 3. Frontend completado

**Ubicación:** `C:\sistema-reservas-citas\frontend`

### Estructura principal
- `src/pages/`: Login, RegisterClient, Home, Profile, Services, Clients, Professionals, Users, Availability, Appointments, Agenda, Dashboard.
- `src/components/agenda/`: `AgendaGrid.jsx`, `AgendaBookingModal.jsx`, `agendaUtils.js`.
- `src/context/`: `AuthContext.jsx` y `AppointmentsContext.jsx`.
- `src/services/`: cliente Axios y servicios por dominio.
- `src/utils/appointmentDetail.js`: detalle/cancelación con SweetAlert2.
- `src/styles.css`: diseño original intacto, sin bloques de adaptación de calendario externo.

### Comportamiento implementado
- Agenda semanal propia de lunes a domingo, 08:00–19:59, con celdas individuales y tooltips.
- Selección de hueco libre para reservar; clic en evento para ver detalle; cancelación con SweetAlert2.
- Reprogramación y cambio de estado disponibles desde la pantalla de citas.
- Eventos filtrados por profesional, cliente, servicio y estado.
- Dashboard oculta los KPIs cuando falla la consolidación, evitando mostrar cifras falsas en cero.
- Pantallas y estilos existentes sin cambios visuales; Stack de iconos `lucide-react`, `Toastify` y `SweetAlert2` conservado.

### Verificación ejecutada
```powershell
cd C:\sistema-reservas-citas\frontend
npm install
npm run build
```
Resultado: build correcto.

---

## 4. Contratos técnicos que se respetaron

| Item | Valor |
| :--- | :--- |
| **Base URL API** | `http://localhost:4000/api` |
| **Envelope JSON** | `{ success, data, message, errors? }` |
| **Headers inyectados** | `Authorization: Bearer <token>`, `X-Tenant-Id`, `X-Role` |
| **Login** | `POST /auth/login` con `{ tenant, email, password }` |
| **Registro cliente** | `POST /auth/register-client` |
| **Aislamiento** | Todo repo Mongoose exige `tenantId`; `aggregate` con `$match` inicial |
| **Concurrencia** | `ScheduleLock` + `withTransaction` + solapamiento `[start, end)` |
| **US-11** | Borrado lógico (`deletedAt`), jamás borrado físico |
| **US-05** | Historia explícita; acceso a otro tenant devuelve `403` |
| **Pruebas** | Vitest + Supertest + `MongoMemoryReplSet` |

---

## 5. Puesta en marcha

```powershell
cd C:\sistema-reservas-citas\backend
Copy-Item .env.example .env
# Configurar MONGODB_URI, JWT_SECRET, CORS_ORIGIN y credenciales de plataforma
npm run seed
npm run dev
```

```powershell
cd C:\sistema-reservas-citas\frontend
Copy-Item .env.example .env
# VITE_API_URL=http://localhost:4000/api
npm run dev
```

---

## 6. Cómo retomar en otra sesión

> Continúa desde `C:\sistema-reservas-citas`. Backend y frontend están terminados y verificados: `npm test` en backend da 116/116 y `npm run build` en frontend es correcto. La matriz de 29 HU / 116 escenarios es la fuente de verdad, US-05 usa `403` para recursos de otro tenant, y la agenda conserva el grid semanal propio aprobado, sin librerías de calendario. No modificar estilos existentes ni realizar commits salvo petición explícita.
