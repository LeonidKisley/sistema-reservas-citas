# Estado actual del proyecto — Handoff

## 1. Resumen general

| Concepto | Estado |
| :--- | :--- |
| **Workspace** | `C:\sistema-reservas-citas` |
| **Backend MERN** | Terminado y verificado |
| **Frontend React + Vite** | Terminado y verificado |
| **Matriz** | 29 historias de usuario / 118 escenarios (US-24 tiene 6), usada como fuente de verdad |
| **Pruebas backend** | 131/131 en verde (`npm test`, 7 archivos: 94 tests generados desde la matriz + 37 de regresión/fases 2, 2b y 2c) |
| **Pruebas frontend** | 20/20 en verde (`npm test`, 4 archivos de utilidades) |
| **Build frontend** | Correcto (`npm run build`; aviso no bloqueante de chunk > 500 kB) |
| **Motor de agenda** | Grid propio con CSS Grid, vista semanal LUN–DOM y celdas horarias 08:00–19:59 |
| **Fase 2 — filtros dashboard** | Completada: profesionales, servicio, cliente y estado; KPIs, gráficos y rankings filtrados |
| **Fase 2b — confirmación drag & drop** | Completada: `RescheduleConfirmModal` con confirmar/cancelar y sin mutación optimista |
| **Fase 2c — RBAC tenants** | Completada: `tenant.read` requerido en `tenantService` |
| **Fase 3 — demo en vivo** | Ejecutada y verificada contra API/frontend locales; ver sección 6 |
| **Documentación** | `docs/README.md` y `docs/escenarios-gherkin.md` actualizados |

> No se han realizado commits. La decisión de arquitectura, estilos y contratos de API se mantuvo intacta; la agenda conserva el diseño propio aprobado y no usa librerías de calendario. Los archivos `.env` y logs temporales quedan fuera del repositorio por `.gitignore`.

---

## 2. Backend completado

**Ubicación:** `C:\sistema-reservas-citas\backend`

### Decisiones y ajustes cerrados
- Superadmin de plataforma con `platformAdmin`, permiso `platform.tenant.manage`, rutas `/api/platform/tenants` y seed con `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`.
- Alta de tenants disponible tanto para el superadmin como para el registro público/autoadministrado.
- Aislamiento estricto: `tenantId` obligatorio en repositorios, `aggregate` con `$match` inicial y helper `assertTenantOwnership`.
- Recurso ajeno al tenant: `403 Forbidden` sin filtrar datos; recurso inexistente o excluido dentro del tenant: `404`.
- JWT con `tokenVersion` invalidado en cambios de contraseña; `JWT_SECRET` obligatorio en producción.
- Reserva con `ScheduleLock` + `withTransaction` (`readConcern: snapshot`, `writeConcern: majority`) + solapamiento semiabierto `[start, end)`. Sin soporte de transacciones se devuelve error controlado.
- `PATCH /api/users` y `DELETE /api/users` usan `findUser` con filtro por `tenantId` y verificación de propiedad; `PATCH /api/clients` acepta campos parciales validados con `patchSchema`.
- Validación de fechas pasadas, paginación en listados, rango `from`/`to` con `buildRange` y búsqueda de clientes con regex escapada.

### Verificación ejecutada
```powershell
cd C:\sistema-reservas-citas\backend
npm test
```
Resultado: **7 archivos de prueba, 131 tests, 131 passed**. Incluye regresión de Fase 2 (filtros combinados y aislamiento), Fase 2c (`tenant.read`) y contratos de reserva/reprogramación/cancelación. Dependencias instaladas con `npm install` (Vitest 5.1.1).

---

## 3. Frontend completado

**Ubicación:** `C:\sistema-reservas-citas\frontend`

### Estructura principal
- `src/pages/`: Login, RegisterClient, Home, Profile, Services, Clients, Professionals, Users, Availability, Appointments, Agenda, Dashboard.
- `src/components/agenda/`: `AgendaGrid.jsx`, `AgendaBookingModal.jsx`, `RescheduleConfirmModal.jsx`, `agendaUtils.js`.
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
npm test
npm run build
```
Resultado: 4 archivos / 20 tests en verde y build correcto (Vite 6.4.6). Incluye `agendaUtils.test.js` (previsualización de reprogramación) y `reportExport.test.js` (CSV con BOM y documento de impresión).

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

## 5. Fases 2, 2b y 2c

### Fase 2 — Filtros combinados del dashboard
- `backend/src/services/dashboardService.js`: `resolveFilters` y `aggregateMatch`; un `status` explícito sustituye la exclusión por defecto de `cancelada`/`no asistió` en los rankings.
- `backend/src/repositories/appointmentRepository.js`: `countInRange(tenantId, from, to, filters = {}, options = {})`.
- `frontend/src/pages/Dashboard.jsx`: filtros por profesional, servicio, cliente y estado; botón `Limpiar`; estados vacíos y recarga con filtros activos.
- Verificado: backend 131/131, frontend 20/20 y build correcto.

### Fase 2b — Confirmación del drag & drop
- `AgendaGrid.jsx` solo emite `onRescheduleRequest`; no muta la cita.
- `Agenda.jsx` añade `requestReschedule`, `confirmReschedule` y `cancelReschedule`.
- `RescheduleConfirmModal.jsx` muestra actual → nuevo con botones `Confirmar` / `Cancelar`.
- `buildReschedulePreview` y sus pruebas en `agendaUtils.test.js`.

### Fase 2c — RBAC de tenants
- `tenantService.list` y `tenantService.getById` exigen `assertPermission(actor, 'tenant.read')`.
- `tenantController` pasa `req.user`; cobertura 401/403 en `auth.test.js`.

---

## 6. Fase 3 — demostración en vivo

Entorno usado:
- `MongoMemoryReplSet` compartido (PID `17168`) con URI guardada en `mongo-demo-uri.txt`; seed ejecutado con éxito.
- Backend `npm run dev` en `http://localhost:4000`; health check: `{"success":true,"data":{"status":"ok","service":"reservas-api"},"message":"API activa"}`.
- Frontend `npm run dev` en `http://localhost:5173`; `VITE_API_URL=http://localhost:4000/api`.
- Credenciales demo: tenant `auraria`, `admin@auraria.com` / `Admin1234`.

Scripts temporales ejecutados:
- `C:\Users\LEONID\AppData\Local\Temp\opencode\fase3-demo.mjs`
- `C:\Users\LEONID\AppData\Local\Temp\opencode\fase3-export.mjs`

Evidencia obtenida (todos los pasos OK):
- Login admin con JWT y `tenantId`.
- Altas por API de servicio, profesional y cliente.
- Disponibilidad real: `2026-11-25` con 18 huecos.
- Reserva persistida y conflicto `409` al solapar el mismo horario.
- Reprogramación confirmada `09:00 → 09:30` y rechazo `409` al horario ocupado, conservando el horario previo.
- Cancelación con liberación del bloque y estado `cancelada`.
- Dashboard con filtros combinados: `total=1`, `auditCount=1`, `byStatus={"cancelada":1}` y rankings filtrados.
- Exportación CSV con BOM y documento de impresión generados desde los datos filtrados.
- Frontend sirviendo en vivo y apuntando a la API local.
- Logout con `200`, reutilización del token con `401` y token inválido con `401`.

Evidencia puntual: fecha `2026-11-25`, cita `6b0524f434ae378f3d7c0b1d`, servicio `6b0524f434ae378f3d7c0aff`, profesional `6b0524f434ae378f3d7c0b07`, cliente `6b0524f434ae378f3d7c0b0f`.

> Los procesos temporales de la demostración (backend, frontend y Mongo en memoria) ya fueron detenidos; los puertos 4000/5173 están libres. Al retomar, reiniciar con los comandos de la sección 7.

---

## 7. Puesta en marcha

> `backend/.env` y `.env.example` usan `MONGODB_URI=` vacío y `AUTO_SEED=true`, por lo que `npm run dev` crea su propio `MongoMemoryReplSet`, siembra `auraria` si está vacío y evita el error `Organización no válida o inactiva`. No hace falta Atlas ni `npm run seed` manual en development. El watcher vigila solo `src` y cierra conexiones al recibir SIGTERM, evitando `EADDRINUSE`. El seed manual sigue siendo necesario solo si configuras Atlas.

```powershell
cd C:\sistema-reservas-citas\backend
Copy-Item .env.example .env
# MONGODB_URI= y AUTO_SEED=true; verificar JWT_SECRET y CORS_ORIGIN
npm run dev
```

```powershell
cd C:\sistema-reservas-citas\frontend
Copy-Item .env.example .env
# VITE_API_URL=http://localhost:4000/api
npm run dev
```

---

## 8. Cómo retomar en otra sesión

> Continúa desde `C:\sistema-reservas-citas`. Backend y frontend están terminados y verificados: `npm test` en backend da 131/131, `npm test` en frontend da 20/20 y `npm run build` es correcto. Fases 2, 2b, 2c y 3 están completas; la demostración en vivo dejó evidencia de reserva, conflicto 409, reprogramación con reversión, cancelación, dashboard filtrado, exportación y logout/401. La matriz de 29 HU / 118 escenarios sigue siendo la fuente de verdad, US-05 usa `403` para recursos de otro tenant, y la agenda conserva el grid semanal propio aprobado, sin librerías de calendario. No modificar estilos existentes ni realizar commits salvo petición explícita. Si los procesos ya no están activos, basta `npm run dev` en backend y frontend con la sección 7: el backend levanta y siembra su Mongo en memoria automáticamente.
