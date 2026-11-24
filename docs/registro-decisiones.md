# Registro de decisiones arquitecturales

Este documento consolida las **cinco decisiones bloqueadas** del proyecto, tomadas en la fase de planificación y aplicadas en la implementación. Sirve como referencia para evitar reintroducir alternativas descartadas.

| # | Tema | Decisión cerrada |
| :-- | :--- | :--- |
| 1 | Estructura del proyecto | `backend/` + `frontend/` con `package.json` propios |
| 2 | US-11 (borrado de clientes) | Borrado lógico (`soft delete`) con `deletedAt` |
| 3 | US-21.4 (concurrencia) | Transacción MongoDB + bloqueo por profesional/fecha + rangos `[start, end)` |
| 4 | Pruebas y aceptación | Suite crítica automatizada + 118 escenarios Gherkin documentados |
| 5 | Fuente de verdad funcional | Matriz de 29 historias de usuario, con US-05 explícita |

---

## 1. Estructura `backend/` + `frontend/`

**Contexto:** se evaluó un único proyecto full-stack contra dos paquetes independientes.

**Decisión:** dos carpetas hermanas con dependencias y scripts propios. Backend en Node.js (ES Modules) + Express; frontend en React 18 + Vite.

**Implicaciones:**
- `backend/package.json`: `dev`, `start`, `seed`, `test`.
- `frontend/package.json`: `dev`, `build`, `preview`.
- El frontend consume la API por `VITE_API_URL` (por defecto `http://localhost:4000/api`).
- No se usa SQLite ni Vanilla JS; la persistencia es MongoDB Atlas con Mongoose.

---

## 2. US-11 — Borrado lógico de clientes

**Contexto:** eliminar físicamente un cliente con historial de citas rompe la integridad referencial y la trazabilidad.

**Decisión:** `Client.deletedAt` marca la baja. Ninguna operación de usuario ejecuta `deleteOne` sobre clientes.

**Implicaciones:**
- Los repositorios excluyen `deletedAt != null` en búsquedas activas (`excludeDeleted: true`).
- `ClientService.remove()` calcula `physicalDeleteBlocked` cuando existen citas asociadas y devuelve un mensaje explicativo.
- Las citas históricas conservan `clientName` y `document` mediante populate/sanitize.
- El campo `active` expuesto al frontend se deriva de `!client.deletedAt`.

**No hacer:** borrar el documento de `clients` aunque el cliente tenga cero citas.

---

## 3. US-21.4 — Transacción + bloqueo para prevención de doble reserva

**Contexto:** dos peticiones simultáneas podían pasar la comprobación de disponibilidad y generar dos citas solapadas.

**Decisión:** `withScheduleLock(tenantId, professionalId, dateKey, callback)` + `mongoose.startSession().withTransaction(...)`.

**Implicaciones:**
- Candado por `{ tenantId, professionalId, fecha }` con timeout y reintentos configurables (`LOCK_TIMEOUT_MS`, `LOCK_RETRY_MS`).
- Transacción con `readConcern: 'snapshot'` y `writeConcern: 'majority'`.
- Solapamiento estricto con intervalo semiabierto: `start < otherEnd && end > otherStart`. Por tanto, un inicio que coincide con el fin anterior **sí** es válido.
- `assertSlotFree` excluye la propia cita en reprogramaciones y ignora estados `cancelada` / `no asistió`.
- `ScheduleLock` se libera en `finally` y devuelve `tenantId` para evitar timeouts.
- Requiere replica set: MongoDB Atlas en producción y `MongoMemoryReplSet` en pruebas.

**No hacer:** sustituir el bloqueo por una simple comprobación `findOne` previa a la escritura.

---

## 4. Pruebas críticas + documentación Gherkin

**Contexto:** 29 historias × 4 escenarios + 2 adicionales de US-24 = 118 criterios de aceptación que deben ser trazables.

**Decisión:** automatizar los flujos críticos con Vitest + Supertest + `MongoMemoryReplSet`, y documentar los 118 escenarios en formato Gherkin.

**Implicaciones:**
- Suite backend: 7 archivos (`auth`, `clients`, `appointments`, `dashboard`, `matrix`, `recommendations`, `validation`), **131/131 pruebas en verde**.
- Cobertura automatizada: autenticación JWT y escalada de roles, RBAC, aislamiento por `tenantId`, soft delete, solapamientos, transiciones de estado, reprogramación y dashboard.
- `docs/escenarios-gherkin.md`: 118 escenarios numerados `US-01-E1` … `US-29-E4` (US-24 llega hasta `E6`), con etiquetas por tipo de ruta (happy path, alternativa, error, caso límite) y por decisión (`@soft-delete`, `@concurrencia`, `@aislamiento`).
- Cada escenario referencia el contrato real de la API (envelope, códigos HTTP y cabeceras).

---

## 5. Matriz de 29 HU como fuente de verdad

**Contexto:** el enunciado original y el Prompt Maestro listan historias de forma dispersa; existía riesgo de omitir US-05.

**Decisión:** `matriz-historias-usuario.md` es la fuente canónica de las 29 historias (US-01 a US-29), con US-05 implementada explícitamente como historia de aislamiento e integridad entre inquilinos.

**Implicaciones:**
- US-05 no es un requisito implícito: tiene sus propios cuatro escenarios Gherkin y se verifica en las pruebas de clientes y citas.
- Épicas: 1 autenticación/RBAC/multiinquilino (US-01..08), 2 catálogos (US-09..14), 3 citas (US-15..21), 4 agenda (US-22..25), 5 dashboard (US-26..29).
- Cualquier cambio funcional debe actualizar primero la matriz y luego el código y los escenarios.

---

## Ajuste posterior registrado: lectura de catálogos por el rol Cliente

**Contexto:** la matriz asigna a Cliente las historias US-15 (consultar disponibilidad) y US-16 (registrar cita), pero la matriz inicial de permisos no incluía `professional.read` ni `service.read`, por lo que el portal de autoservicio recibía HTTP 403 al cargar los selectores.

**Decisión:** conceder a Cliente únicamente permisos de **lectura** de profesionales y servicios en `backend/src/utils/permissions.js`.

**Alcance:** no modifica contratos de respuesta, no habilita escritura en catálogos y no altera las decisiones 1 a 5. Se mantienen las denegaciones de acciones administrativas (US-06-E3) y la escalada de privilegios (US-06-E4).
