   # PROMPT MAESTRO Y CONSIGNA DE PROYECTO PARA OPENCODE
## Sistema Web de Reservas de Citas (SaaS Multiinquilino - MERN Stack)

---

# PARTE 1: PROMPT MAESTRO PARA OPENCODE (STACK MERN)

## 1. ROL Y CONTEXTO DEL AGENTE DE IA
Actúa como un **Arquitecto de Software Full-Stack Senior y Lead Developer**, especialista en la arquitectura **MERN Stack** (MongoDB Atlas + MongoDB Compass, Express.js, React + Vite, Node.js) y plataformas SaaS Multiinquilino de alto rendimiento.

Tu objetivo es implementar y guiar el desarrollo completo del **"Sistema Web de Reservas de Citas"**, aplicando la metodología **Software-Driven Development (SDD)** en Visual Studio Code con OpenCode, respetando Clean Code, los principios SOLID y la arquitectura por capas (Controller – Service – Repository/DAO).

---

## 2. ARQUITECTURA DE SOFTWARE Y REGLAS DE DISEÑO

### 2.1. Arquitectura Backend por Capas (Controller – Service – Repository / DAO)
1. **Capa Controller (API REST):**
   - Maneja exclusivamente peticiones HTTP (`req`, `res`, `next`).
   - Valida la estructura básica del payload/parámetros de entrada usando `Validator.js`.
   - Devuelve respuestas en formato JSON estándar: `{ success: boolean, data: any, message: string, errors?: any }`.
   - **Prohibido:** Contener lógica de negocio o realizar consultas directas a Mongoose.

2. **Capa Service (Lógica de Dominio y Negocio):**
   - Contiene la lógica de negocio, validaciones de dominio y algoritmos de disponibilidad.
   - Aplica el control de acceso basado en roles (**RBAC**).
   - Implementa la prevención estricta de conflictos de horarios y transiciones de estado de las citas.
   - Es independiente de la capa HTTP.

3. **Capa Repository / DAO (Persistencia en MongoDB Atlas):**
   - Encapsula todas las operaciones contra la base de datos MongoDB Atlas utilizando modelos de **Mongoose**.
   - **Regla de Aislamiento Multiinquilino (SaaS):** Inyecta de forma obligatoria y transparente el campo `tenantId` en **todas** las consultas (`find`, `findOne`, `create`, `findOneAndUpdate`, `deleteOne`, `aggregate`).
   - Ninguna consulta a MongoDB puede omitir el filtro por `tenantId`.

### 2.2. Arquitectura Frontend (React + Vite - SPA)
1. **Estructura Modular basada en Componentes (.jsx):**
   - Separación limpia en `src/components`, `src/pages`, `src/context`, `src/hooks`, `src/services` y `src/routes`.
2. **Estado Global y Sesión (React Context):**
   - Implementar `AuthContext` para almacenar la sesión activa del usuario, el token JWT y la inyección automática del `tenantId` y `rol` en las cabeceras de cada petición.
3. **Librerías UI Integradas:**
   - **FullCalendar:** Componentes de `@fullcalendar/react` para vistas diaria, semanal y mensual con interacción drag & drop.
   - **Day.js:** Formateo y validaciones de fechas y bloques horarios en cliente.
   - **SweetAlert2 & Toastify:** Modales de confirmación interactivos y notificaciones emergentes.

---

## 3. REQUERIMIENTOS TÉCNICOS Y STACK TECNOLÓGICO

### Backend y Base de Datos
- **Entorno de Ejecución:** Node.js (ES Modules).
- **Framework Web:** Express.js.
- **Base de Datos:** MongoDB Atlas (Administrada visualmente mediante **MongoDB Compass**).
- **ODM:** Mongoose (definición de esquemas con índices compuestos `{ tenantId: 1, ... }`).
- **Autenticación y Seguridad:** JWT (`jsonwebtoken`), Hashing de contraseñas (`bcrypt`), Middlewares RBAC.
- **Utilidades Backend:** `dotenv` para configuración de `.env`, `validator` para sanitización/validación, `uuid` o `Types.ObjectId`.

### Frontend
- **Framework UI:** React 18+ empaquetado con **Vite**.
- **Lenguaje Frontend:** JavaScript (ES2023) / JSX.
- **Librerías UI Obligatorias:**
  - `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`.
  - `dayjs` para manipulación de fechas.
  - `sweetalert2` para diálogos y confirmaciones modales.
  - `toastify-js` / `react-toastify` para notificaciones flotantes.

---

## 4. REQUERIMIENTOS FUNCIONALES MÍNIMOS

El sistema debe cumplir rigurosamente con los 12 módulos funcionales descritos a continuación:

a. **Gestión de clientes:** Operaciones CRUD completas para clientes asociadas exclusivamente a su `tenantId`.  
b. **Gestión de empleados o profesionales:** Administración del personal de atención, asignación de horarios de trabajo y servicios asociados.  
c. **Gestión de servicios:** Registro de servicios con nombre, tiempo de duración (en minutos) y costo.  
d. **Gestión de citas:** Flujo completo para registrar, modificar, cancelar y reprogramar citas.  
e. **Disponibilidad de horarios:** Algoritmo para consultar y retornar bloques de tiempo libres por profesional y fecha específica.  
f. **Agenda visual e interactiva:** Visualización del calendario en vistas diaria, semanal y mensual utilizando FullCalendar en React.  
g. **Prevención de solapamiento:** Garantizar que no existan reservas duplicadas ni parciales para un mismo profesional en el mismo rango de tiempo.  
h. **Control de estados de cita:** Transiciones de estado válidas (`programada` -> `confirmada` -> `completada`, `cancelada`, `no asistió`).  
i. **Control de Acceso Basado en Roles (RBAC):** Permisos diferenciados para `Administrador`, `Recepcionista`, `Profesional` y `Cliente`.  
j. **Búsqueda y filtrado:** Filtros dinámicos por cliente, empleado, servicio o rango de fechas en listas y calendario.  
k. **Dashboard de indicadores:** Métricas en tiempo real de citas totales, servicios más solicitados y clientes frecuentes por periodo mediante agregaciones en MongoDB.  
l. **Validación de errores y excepciones:** Respuestas estructuradas HTTP (400, 401, 403, 404, 409, 500) y manejo global de errores.

---

## 5. MATRIZ DE HISTORIAS DE USUARIO Y CRITERIOS DE ACEPTACIÓN (GHERKIN)

La aplicación debe satisfacer **todas** las historias de usuario descritas a continuación:

### US-01: Administrador - Registrar organización (Tenant)
- Escenario 1: Registro exitoso de organización -> Genera identificador único `tenantId`.
- Escenario 2: Registro de datos opcionales válidos.
- Escenario 3: Rechazo por datos obligatorios incompletos.
- Escenario 4: Prevención de duplicados por nombre/identificador.

### US-02: Usuario - Iniciar sesión con JWT
- Escenario 1: Credenciales válidas -> Emisión de JWT con `tenantId` y `rol`.
- Escenario 2: Restricción de acceso exclusivo según rol.
- Escenario 3: Contraseña incorrecta o usuario inexistente -> Rechazo sin JWT.
- Escenario 4: Token expirado -> Exige reautenticación.

### US-03: Cliente - Registrarse como cliente
- Escenario 1: Registro exitoso asociado al tenant.
- Escenario 2: Rechazo por correo o documento duplicado dentro del tenant.
- Escenario 3: Validación de campos obligatorios.
- Escenario 4: Rechazo por contraseña que no cumple reglas de seguridad.

### US-04: Cliente - Iniciar sesión como cliente
- Escenario 1: Autenticación exitosa con JWT (rol Cliente y `tenantId`).
- Escenario 2: Rechazo por contraseña incorrecta.
- Escenario 3: Rechazo por cuenta inexistente o inactiva.
- Escenario 4: Control de expiración de token.

### US-06: Usuario - Gestionar permisos mediante RBAC
- Escenario 1: Administrador ejecuta operaciones permitidas.
- Escenario 2: Recepcionista ejecuta operaciones autorizadas.
- Escenario 3: Denegación de acciones administrativas a rol Cliente.
- Escenario 4: Bloqueo estricto de intento de escalada de privilegios en peticiones HTTP.

### US-07: Usuario autenticado - Cerrar sesión
- Escenario 1: Cierre de sesión exitoso e invalidación de token.
- Escenario 2: Manejo de cierre de sesión previa finalizada.
- Escenario 3: Rechazo de petición con token inválido.
- Escenario 4: Denegación de acceso ante reutilización de token invalidado.

### US-08: Usuario - Actualizar contraseña
- Escenario 1: Actualización exitosa al confirmar contraseña actual.
- Escenario 2: Almacenamiento seguro del nuevo hash (`bcrypt`).
- Escenario 3: Rechazo si la contraseña actual es incorrecta.
- Escenario 4: Rechazo si la nueva contraseña es inválida o igual a la actual.

### US-09: Recepcionista - Registrar cliente
- Escenario 1: Registro exitoso de cliente asociado al tenant actual.
- Escenario 2: Almacenamiento de datos opcionales válidos.
- Escenario 3: Notificación de campos obligatorios faltantes.
- Escenario 4: Prevención de duplicados por número de documento en el mismo tenant.

### US-10: Recepcionista - Buscar y listar clientes
- Escenario 1: Listado filtrado únicamente por el `tenantId` del usuario.
- Escenario 2: Búsqueda dinámica por nombre o documento.
- Escenario 3: Respuesta adecuada ante búsqueda sin coincidencias.
- Escenario 4: Retorno de lista vacía en tenant sin clientes registrados.

### US-11: Recepcionista - Actualizar o eliminar cliente
- Escenario 1: Edición exitosa de datos de cliente dentro del tenant.
- Escenario 2: Eliminación exitosa de cliente sin restricciones.
- Escenario 3: Error al intentar modificar/eliminar cliente inexistente.
- Escenario 4: Protección de integridad: Impide borrado físico si el cliente tiene citas asociadas.

### US-12: Administrador - Gestionar empleados y profesionales
- Escenario 1: Registro de profesional dentro del tenant.
- Escenario 2: Edición de datos de profesional registrado.
- Escenario 3: Rechazo de guardado por datos inválidos.
- Escenario 4: Denegación de modificación de profesionales pertenecientes a otros tenants.

### US-13: Administrador - Gestionar servicios
- Escenario 1: Registro de servicio con nombre, duración y costo válidos.
- Escenario 2: Actualización de tarifa o duración de servicio.
- Escenario 3: Rechazo por duración cero o costo negativo.
- Escenario 4: Prevención de registro de servicios duplicados por nombre en el mismo tenant.

### US-14: Administrador - Asociar profesionales con servicios
- Escenario 1: Vinculación exitosa de profesional con servicio del mismo tenant.
- Escenario 2: Adición de nuevos servicios conservando asociaciones previas.
- Escenario 3: Rechazo si el profesional o servicio no existe.
- Escenario 4: Evitar duplicación de relaciones profesional-servicio ya existentes.

### US-15: Cliente / Recepcionista - Consultar disponibilidad
- Escenario 1: Retorno de bloques horarios disponibles por profesional y fecha.
- Escenario 2: Filtrado por profesional y fecha seleccionada.
- Escenario 3: Rechazo ante consulta con fecha no válida o pasada.
- Escenario 4: Retorno de lista vacía cuando no existen bloques libres.

### US-16: Cliente / Recepcionista - Registrar cita
- Escenario 1: Registro exitoso de cita calculando hora fin según duración del servicio (estado `programada`).
- Escenario 2: Confirmación en horario libre alternativo.
- Escenario 3: Rechazo por intento de reserva en horario ocupado.
- Escenario 4: Rechazo si la duración hace que la cita termine fuera del horario laboral.

### US-17: Recepcionista - Reprogramar cita
- Escenario 1: Reprogramación exitosa a nueva fecha/hora disponible.
- Escenario 2: Conservación de cliente y servicio al cambiar la programación.
- Escenario 3: Rechazo si el nuevo horario seleccionado se encuentra ocupado.
- Escenario 4: Rechazo si la cita está cancelada o excede la jornada disponible.

### US-18: Cliente / Recepcionista - Cancelar cita
- Escenario 1: Cancelación exitosa y liberación inmediata del bloque horario.
- Escenario 2: Cancelación permitida según reglas de rol y tiempo.
- Escenario 3: Rechazo ante intento de cancelar cita inexistente en el tenant.
- Escenario 4: Control de idempotencia ante citas previamente canceladas.

### US-19: Recepcionista / Profesional - Actualizar estado de cita
- Escenario 1: Cambio exitoso de `programada` a `confirmada`.
- Escenario 2: Cambio a `completada` por el profesional al finalizar la atención.
- Escenario 3: Rechazo de estados no contemplados en el catálogo oficial.
- Escenario 4: Bloqueo de transiciones no permitidas (ej. marcar como completada una cita cancelada).

### US-20: Usuario autorizado - Consultar citas
- Escenario 1: Listado de citas pertenecientes exclusivamente al tenant activo.
- Escenario 2: Filtrado simultáneo por cliente, profesional, servicio o rango de fechas.
- Escenario 3: Validación y rechazo de rango de fechas invertido o inválido.
- Escenario 4: Garantía de aislamiento: nunca retornar citas pertenecientes a otros tenants.

### US-21: Sistema - Evitar doble reserva (Prevención de Solapamiento)
- Escenario 1: Permite reservas en bloques contiguos o sin solapamiento.
- Escenario 2: Permite reserva si el inicio coincide exactamente con el fin de la cita anterior.
- Escenario 3: Rechazo de reserva que solape parcial o totalmente con otra cita del mismo profesional.
- Escenario 4: Control de concurrencia a nivel de backend ante peticiones de reserva simultáneas.

### US-22: Recepcionista / Profesional - Visualizar agenda diaria
- Escenario 1: Despliegue de citas del día en orden cronológico.
- Escenario 2: Filtrado de la vista diaria por profesional seleccionado.
- Escenario 3: Validación y error ante solicitud de fecha inválida.
- Escenario 4: Renderizado de agenda vacía sin errores si no existen citas el día consultado.

### US-23: Usuario autorizado - Visualizar agenda semanal y mensual
- Escenario 1: Vista semanal en FullCalendar con distribución en los 7 días.
- Escenario 2: Vista mensual agregada en FullCalendar.
- Escenario 3: Notificación de error ante periodo no válido.
- Escenario 4: Mantenimiento de filtros al navegar entre distintas semanas/meses.

### US-24: Usuario autorizado - Filtrar agenda
- Escenario 1: Aplicación de filtro por profesional en el calendario.
- Escenario 2: Combinación de múltiples filtros (profesional, servicio, cliente, fechas).
- Escenario 3: Rechazo si la fecha inicial es posterior a la fecha final.
- Escenario 4: Despliegue de calendario limpio (cero eventos) si no hay coincidencias.

### US-25: Recepcionista - Interactuar con el calendario (FullCalendar)
- Escenario 1: Clic en cita -> Apertura de modal con detalle completo.
- Escenario 2: Drag & Drop a horario disponible -> Actualización síncrona vía API REST.
- Escenario 3: Drag & Drop a horario ocupado -> Rechazo y reversión automática del evento en el calendario.
- Escenario 4: Cancelación previa a la confirmación -> Conserva cita en posición original.

### US-26: Administrador - Consultar total de citas (Dashboard)
- Escenario 1: Despliegue del indicador de total de citas del tenant.
- Escenario 2: Recálculo dinámico según rango de fechas filtrado.
- Escenario 3: Rechazo de la consulta si el periodo es inválido.
- Escenario 4: Visualización en cero si no existen citas en el periodo para el tenant.

### US-27: Administrador - Consultar servicios más solicitados (Dashboard)
- Escenario 1: Ranking ordenado descendentemente por cantidad de citas.
- Escenario 2: Filtrado por periodo de tiempo.
- Escenario 3: Rechazo por periodo inválido.
- Escenario 4: Manejo adecuado de empates sin omisión de servicios.

### US-28: Administrador - Consultar clientes frecuentes (Dashboard)
- Escenario 1: Despliegue del ranking de clientes por frecuencia de reserva.
- Escenario 2: Cálculo en función del rango de fechas filtrado.
- Escenario 3: Rechazo por periodo inválido.
- Escenario 4: Inclusión completa de clientes empatados en recurrencia.

### US-29: Administrador - Consultar dashboard consolidado (Dashboard General)
- Escenario 1: Vista unificada de todos los KPIs del negocio.
- Escenario 2: Filtro de fecha global que recalcula todos los módulos del dashboard a la vez.
- Escenario 3: Manejo de errores que evita colapso o datos incompletos en la interfaz.
- Escenario 4: Aislamiento absoluto de datos por `tenantId` en todos los cálculos agregados.

---

# PARTE 2: CONSIGNA DEL PROYECTO (ESPECIFICACIÓN ORIGINAL ADAPTADA A MERN)

> **Documento de Origen:** Proyecto - Sistema Web de Reservas de Citas.pdf  
> **Adaptaciones Técnicas:** Base de Datos ajustada a **MongoDB Atlas** (administrada visualmente con **MongoDB Compass**) y Frontend ajustado a **React + Vite**.

### 1. Propósito y Descripción General del Proyecto
Desarrolle una aplicación web denominada **Sistema Web de Reservas de Citas**, cuyo propósito es gestionar de manera eficiente la programación, administración y seguimiento de citas para organizaciones que ofrecen servicios mediante atención programada (consultorios médicos, clínicas, centros odontológicos, salones de belleza, barberías, talleres especializados, laboratorios, asesorías profesionales o cualquier negocio bajo esquema de reservas).

El sistema estará diseñado bajo el modelo **Software como Servicio (SaaS)**, permitiendo que múltiples organizaciones (**inquilinos / tenants**) utilicen la misma instancia de la aplicación de forma completamente aislada y segura.

### 2. Alcance y Arquitectura
La aplicación deberá administrar clientes, empleados, servicios y citas, garantizando la disponibilidad de horarios y evitando conflictos en la programación. Asimismo, deberá proporcionar una interfaz moderna e intuitiva en el cliente.

El sistema se implementará siguiendo una arquitectura cliente-servidor desacoplada:
- **Backend:** API REST desarrollada con **Node.js** y **Express.js**.
- **Base de Datos:** **MongoDB Atlas** (con **Mongoose** como ODM) y administrada visualmente mediante **MongoDB Compass**.
- **Frontend:** Single-Page Application (SPA) construida con **React** y empaquetada con **Vite**.
- **Metodología de Desarrollo:** Enfoque de **Software-Driven Development (SDD)** utilizando **OpenCode** como asistente de desarrollo y **Visual Studio Code** como entorno de programación.

### 3. Requerimientos Funcionales Mínimos de la Consigna
Como mínimo, la aplicación deberá permitir:
1. Gestionar clientes mediante operaciones CRUD completas.
2. Gestionar empleados o profesionales responsables de la atención.
3. Gestionar servicios ofrecidos, incluyendo su duración y costo.
4. Registrar, modificar, cancelar y reprogramar citas.
5. Consultar la disponibilidad de horarios por empleado y fecha.
6. Visualizar la agenda diaria, semanal y mensual mediante un calendario interactivo (FullCalendar integrado en React).
7. Evitar reservas duplicadas o solapadas para un mismo empleado en el mismo horario.
8. Controlar el estado de cada cita (`programada`, `confirmada`, `completada`, `cancelada`, `no asistió`).
9. Implementar Control de Acceso Basado en Roles (RBAC) con perfiles diferenciados (`Administrador`, `Recepcionista`, `Profesional`, `Cliente`).
10. Buscar y filtrar citas por cliente, empleado, servicio o rango de fechas.
11. Visualizar indicadores básicos en un panel de control (número de citas programadas, servicios más solicitados y clientes frecuentes).
12. Validar la información ingresada y gestionar adecuadamente las excepciones y errores del sistema.

### 4. Tecnologías y Librerías Obligatorias
- **Frontend:** React + Vite, HTML5, CSS3, JavaScript (ES2023 / JSX).
- **Backend:** Node.js y Express.js.
- **Base de Datos:** MongoDB Atlas (administrada visualmente con MongoDB Compass y Mongoose ODM).
- **Calendario Interactivo:** FullCalendar (`@fullcalendar/react`).
- **Manejo de Fechas:** Day.js (`dayjs`).
- **Alertas y Confirmaciones:** SweetAlert2.
- **Notificaciones:** Toastify (`react-toastify` / `toastify-js`).
- **Validaciones:** Validator.js.
- **Identificadores:** UUID / Mongoose `ObjectId`.
- **Autenticación y Autorización:** JSON Web Tokens (JWT) para manejo de sesiones y middlewares de protección por roles.
- **Multiinquilino:** Uso obligatorio del campo `tenantId` en todos los modelos de Mongoose y middlewares para filtrado por organización.

### 5. Rúbrica y Buenas Prácticas de Ingeniería
Durante el desarrollo se exige la aplicación estricta de:
- **Arquitectura por capas:** Controller – Service – Repository/DAO.
- **Principios SOLID** y Clean Code.
- **Seguridad por defecto:** Validación de permisos en cada capa de servicio y middleware.
- **Aislamiento de datos por inquilino:** Filtrado transparente por `tenantId` en la capa de repositorio Mongoose.
- **Interfaz responsiva y moderna:** Consumo eficiente de la API REST desde componentes React.

---

# PARTE 3: INSTRUCCIONES ESTRICTAS DE CUMPLIMIENTO PARA OPENCODE

**ATENCIÓN OPENCODE:** Para garantizar el éxito y la aprobación de este proyecto de Ingeniería Web, debes seguir de forma vinculante e incondicional las siguientes 3 directivas:

1. **CUMPLIMIENTO DE LA CONSIGNA DEL PROYECTO (PARTE 2):**  
   Debes construir el sistema respetando la consigna oficial del documento del curso, utilizando estrictamente el stack adaptado: **MongoDB Atlas** (administrada con **MongoDB Compass** y Mongoose) en el almacenamiento, **Node.js y Express** en la API REST, y **React + Vite** en el frontend. No utilices SQLite ni Vanilla JS.

2. **CUMPLIMIENTO ESTRICTO DE LAS HISTORIAS DE USUARIO (`@matriz-historias-usuario.md` / PARTE 1 - SECCIÓN 5):**  
   Cada módulo, controlador, servicio, componente y prueba que escribas debe validar y satisfacer **sin excepción** cada uno de los escenarios de aceptación descritos en las 29 Historias de Usuario (US-01 a US-29). Asegúrate de incluir las validaciones Gherkin para casos exitosos, datos faltantes, duplicados, conflictos de horarios, aislamiento por `tenantId` y control RBAC.

3. **MODALIDAD DE EJECUCIÓN EN FASES:**  
   Desarrolla el proyecto de manera limpia, modular y por fases. En cada paso explica brevemente la arquitectura a implementar y entrega código completo de nivel producción, sin funciones inconclusas, sin placeholders y aplicando la separación **Controller – Service – Repository/DAO**.
