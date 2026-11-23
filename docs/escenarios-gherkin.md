# Escenarios Gherkin — Sistema Web de Reservas de Citas

> **Fuente de verdad:** `matriz-historias-usuario.md` (29 historias de usuario) y Prompt Maestro, Parte 1, sección 5.
> **Total:** 116 escenarios = 29 HU × 4 escenarios.
> **Convención de trazabilidad:** `US-XX-E1`happy path · `E2` ruta alternativa · `E3`ruta de error · `E4` caso límite/aislamiento.
> **Palabras clave:** `Característica`, `Escenario`, `Dado`, `Cuando`, `Entonces`, `Y` (Gherkin en español).
> **Decisiones vinculantes aplicadas:** soft delete en US-11, transacción + bloqueo en US-21.4, matriz de 29 HU como fuente (US-05 explícita).

---

## Épica 1 — Autenticación, RBAC y Multiinquilino

### US-01: Administrador — Registrar organización (Tenant)

```gherkin
@US-01 @happy-path
Escenario: US-01-E1 Registro exitoso de organización
  Dado que el administrador está autenticado y proporciona nombre, slug y correo de contacto válidos
  Cuando confirma el registro de la organización
  Entonces el sistema crea el tenant con estado activo
  Y genera un identificador único tenantId vinculado al usuario administrador inicial

@US-01 @alternative-path
Escenario: US-01-E2 Registro de datos opcionales válidos
  Dado que el administrador completa los campos opcionales identificador, teléfono y dirección
  Cuando envía el registro de la organización
  Entonces el sistema persiste tanto los datos obligatorios como los opcionales
  Y el tenant queda disponible para el inicio de sesión con su slug

@US-01 @error-path
Escenario: US-01-E3 Rechazo por datos obligatorios incompletos
  Dado que el administrador omite el nombre o el correo del administrador inicial
  Cuando envía el formulario de registro
  Entonces el sistema rechaza la operación con HTTP 400
  Y detalla el campo obligatorio faltante en el envelope errors

@US-01 @edge-case
Escenario: US-01-E4 Prevención de duplicados por nombre o identificador
  Dado que ya existe un tenant con el mismo slug o identificador
  Cuando el administrador intenta registrarlo nuevamente
  Entonces el sistema evita el duplicado con HTTP 409
  Y no crea un segundo tenant ni un segundo administrador
```

### US-02: Usuario — Iniciar sesión con JWT

```gherkin
@US-02 @happy-path
Escenario: US-02-E1 Credenciales válidas emiten JWT con tenantId y rol
  Dado que existe un usuario activo con correo y contraseña válidos en el tenant demo
  Cuando envía POST /auth/login con tenant, email y password
  Entonces el sistema responde HTTP 200 con un JWT firmado
  Y el payload incluye tenantId, role, clientId o professionalId según corresponda

@US-02 @alternative-path
Escenario: US-02-E2 Restricción de acceso exclusivo según rol
  Dado que el usuario autenticado posee un rol con permisos limitados
  Cuando intenta acceder a un endpoint fuera de sus permisos
  Entonces el middleware RBAC deniega la operación con HTTP 403
  Y el token emitido continúa siendo válido para las operaciones autorizadas

@US-02 @error-path
Escenario: US-02-E3 Contraseña incorrecta o usuario inexistente
  Dado que las credenciales son incorrectas o el correo no existe en el tenant
  Cuando intenta iniciar sesión
  Entonces el sistema responde HTTP 401 con un mensaje genérico de credenciales inválidas
  Y no emite ningún JWT utilizable

@US-02 @edge-case
Escenario: US-02-E4 Token expirado exige reautenticación
  Dado que el JWT de una sesión anterior ya expiró
  Cuando el usuario intenta acceder a un recurso protegido
  Entonces verifyToken rechaza la petición con HTTP 401
  Y el frontend limpia la sesión y redirige a /login
```

### US-03: Cliente — Registrarse como cliente

```gherkin
@US-03 @happy-path
Escenario: US-03-E1 Registro exitoso asociado al tenant
  Dado que una persona proporciona nombre, apellido, documento, correo y contraseña segura
  Cuando envía POST /auth/register-client indicando el slug del tenant
  Entonces el sistema crea el cliente y su cuenta de usuario con rol Cliente
  Y ambos quedan asociados al tenantId correspondiente

@US-03 @error-path
Escenario: US-03-E2 Rechazo por correo o documento duplicado dentro del tenant
  Dado que ya existe en el tenant un cliente con el mismo documento o correo
  Cuando la persona intenta registrarse nuevamente
  Entonces el sistema rechaza el registro con HTTP 409
  Y el mismo documento podría existir en otro tenant sin causar conflicto

@US-03 @error-path
Escenario: US-03-E3 Validación de campos obligatorios
  Dado que faltan nombre, apellido, documento o contraseña
  Cuando se envía el formulario de registro
  Entonces el sistema responde HTTP 400 indicando los campos requeridos
  Y no crea cliente ni usuario

@US-03 @edge-case
Escenario: US-03-E4 Rechazo por contraseña que no cumple reglas de seguridad
  Dado que la contraseña no alcanza la longitud mínima o carece de mayúscula, minúscula o dígito
  Cuando el cliente intenta crear su cuenta
  Entonces el sistema rechaza el registro e informa los requisitos de seguridad
  Y la contraseña nunca se almacena en texto plano
```

### US-04: Cliente — Iniciar sesión como cliente

```gherkin
@US-04 @happy-path
Escenario: US-04-E1 Autenticación exitosa con JWT de rol Cliente
  Dado que el cliente tiene una cuenta activa y credenciales correctas
  Cuando inicia sesión indicando tenant, correo y contraseña
  Entonces el sistema emite un JWT con role Cliente, tenantId y clientId
  Y el frontend habilita el portal de autoservicio de citas

@US-04 @error-path
Escenario: US-04-E2 Rechazo por contraseña incorrecta
  Dado que el cliente proporciona un correo registrado pero una contraseña errónea
  Cuando intenta autenticarse
  Entonces el sistema responde HTTP 401 y no emite JWT
  Y se incrementa ningún contador de sesión válida

@US-04 @error-path
Escenario: US-04-E3 Rechazo por cuenta inexistente o inactiva
  Dado que no existe una cuenta activa con el correo proporcionado en el tenant
  Cuando el cliente intenta iniciar sesión
  Entonces el sistema rechaza la autenticación con HTTP 401
  Y el mensaje no revela si el correo existe o no

@US-04 @edge-case
Escenario: US-04-E4 Control de expiración de token de cliente
  Dado que el JWT del cliente expiró según JWT_EXPIRES_IN
  Cuando intenta consultar sus citas
  Entonces el sistema exige iniciar sesión nuevamente
  Y el cliente solo vuelve a ver las citas asociadas a su clientId
```

### US-05: Usuario autenticado — Acceder solo a recursos de su tenant

```gherkin
@US-05 @happy-path @aislamiento
Escenario: US-05-E1 Acceso permitido a datos del propio tenant
  Dado que el usuario posee un JWT con un tenantId válido
  Cuando solicita clientes, citas o dashboard
  Entonces cada repositorio inyecta tenantId en la consulta
  Y el sistema devuelve únicamente registros de esa organización

@US-05 @error-path @aislamiento
Escenario: US-05-E2 Intento de acceso a recurso de otro tenant
  Dado que un usuario autenticado envía el ObjectId de un recurso de otra organización
  Cuando realiza la petición HTTP a la API
  Entonces el repositorio no encuentra el registro dentro de su tenantId
  Y el middleware de aislamiento responde HTTP 403 Forbidden sin filtrar datos ajenos

@US-05 @error-path @seguridad
Escenario: US-05-E3 Petición sin token o cabecera de tenant
  Dado que se envía una solicitud a un endpoint protegido sin Authorization: Bearer
  Cuando el servidor procesa la petición
  Entonces verifyToken deniega el acceso con HTTP 401
  Y no se ejecuta ninguna consulta a MongoDB

@US-05 @edge-case @aislamiento
Escenario: US-05-E4 Tenant recién registrado sin datos
  Dado que una organización nueva no tiene clientes, servicios ni citas
  Cuando el usuario autenticado consulta los listados principales y el dashboard
  Entonces el sistema responde HTTP 200 con colecciones vacías y totales en cero
  Y no se produce ningún error de servidor
```

### US-06: Administrador — Gestionar permisos mediante RBAC

```gherkin
@US-06 @happy-path @rbac
Escenario: US-06-E1 Administrador ejecuta operaciones permitidas
  Dado que el usuario tiene rol Administrador
  Cuando crea un profesional, un servicio o consulta el dashboard
  Entonces el middleware requirePermission autoriza cada operación
  Y las acciones quedan registradas por updatedBy en la auditoría

@US-06 @alternative-path @rbac
Escenario: US-06-E2 Recepcionista ejecuta operaciones autorizadas
  Dado que el usuario tiene rol Recepcionista
  Cuando gestiona clientes, registra citas o consulta la agenda
  Entonces el sistema permite las operaciones de su matriz de permisos
  Y deniega crear servicios o profesionales con HTTP 403

@US-06 @error-path @rbac
Escenario: US-06-E3 Denegación de acciones administrativas a rol Cliente
  Dado que el usuario tiene rol Cliente
  Cuando intenta crear un servicio o modificar un profesional
  Entonces el sistema responde HTTP 403 con el permiso faltante
  Y no se modifica ningún registro

@US-06 @edge-case @rbac
Escenario: US-06-E4 Bloqueo de escalada de privilegios en peticiones HTTP
  Dado que un usuario autenticado envía un campo role distinto al de su token
  Cuando intenta modificar sus permisos mediante la petición
  Entonces el sistema ignora el campo role y aplica el rol del JWT
  Y la escalada queda rechazada sin cambios en la base de datos
```

### US-07: Usuario autenticado — Cerrar sesión

```gherkin
@US-07 @happy-path
Escenario: US-07-E1 Cierre de sesión exitoso e invalidación de token
  Dado que el usuario tiene una sesión autenticada con token vigente
  Cuando solicita POST /auth/logout
  Entonces el sistema añade el hash del token a TokenBlacklist con su expiración
  Y incrementa tokenVersion para invalidar sesiones anteriores

@US-07 @alternative-path
Escenario: US-07-E2 Manejo de cierre de sesión previa finalizada
  Dado que el usuario ya cerró sesión y el cliente conserva el estado local
  Cuando vuelve a solicitar el cierre
  Entonces el frontend limpia la sesión local sin generar una nueva
  Y no se emite un token de reemplazo

@US-07 @error-path
Escenario: US-07-E3 Rechazo de petición con token inválido
  Dado que la petición de logout contiene un token manipulado o expirado
  Cuando el servidor la procesa
  Entonces verifyToken responde HTTP 401
  Y no se registra ninguna entrada nueva en la blacklist

@US-07 @edge-case
Escenario: US-07-E4 Denegación ante reutilización de token invalidado
  Dado que un token fue revocado en un cierre de sesión anterior
  Cuando se intenta reutilizar para acceder a un recurso protegido
  Entonces el middleware detecta la blacklist o el tokenVersion desactualizado
  Y el acceso es denegado con HTTP 401
```

### US-08: Usuario — Actualizar contraseña

```gherkin
@US-08 @happy-path
Escenario: US-08-E1 Actualización exitosa al confirmar contraseña actual
  Dado que el usuario conoce su contraseña actual y proporciona una nueva válida
  Cuando confirma el cambio de contraseña
  Entonces el sistema valida la contraseña actual con bcrypt.compare
  Y actualiza la credencial del usuario en su tenant

@US-08 @alternative-path @seguridad
Escenario: US-08-E2 Almacenamiento seguro del nuevo hash con bcrypt
  Dado que la nueva contraseña cumple las reglas de seguridad
  Cuando se confirma el cambio
  Entonces el sistema guarda únicamente el hash bcrypt con factor de coste 10
  Y en ninguna respuesta se devuelve la contraseña o su hash

@US-08 @error-path
Escenario: US-08-E3 Rechazo si la contraseña actual es incorrecta
  Dado que el usuario introduce una contraseña actual errónea
  Cuando intenta cambiar su credencial
  Entonces el sistema rechaza la operación con HTTP 400
  Y conserva el hash anterior sin modificaciones

@US-08 @edge-case
Escenario: US-08-E4 Rechazo si la nueva contraseña es inválida o igual a la actual
  Dado que la nueva contraseña no cumple las reglas o coincide con la vigente
  Cuando el usuario confirma el cambio
  Entonces el sistema informa el motivo del rechazo
  Y mantiene la contraseña anterior activa
```

---

## Épica 2 — Gestión de Catálogos (CRUD)

### US-09: Recepcionista — Registrar cliente

```gherkin
@US-09 @happy-path
Escenario: US-09-E1 Registro exitoso de cliente asociado al tenant actual
  Dado que la recepcionista está autenticada en el tenant demo
  Cuando registra un cliente con nombre, apellido y documento válidos
  Entonces el sistema crea el cliente con tenantId del usuario activo
  Y el cliente queda disponible para agendar citas

@US-09 @alternative-path
Escenario: US-09-E2 Almacenamiento de datos opcionales válidos
  Dado que la recepcionista proporciona correo, teléfono, dirección y notas
  Cuando confirma el registro del cliente
  Entonces el sistema guarda los datos opcionales sin requerir una cuenta de usuario
  Y el campo active se calcula como verdadero al no existir deletedAt

@US-09 @error-path
Escenario: US-09-E3 Notificación de campos obligatorios faltantes
  Dado que falta el nombre, el apellido o el documento del cliente
  Cuando se envía el formulario
  Entonces el sistema responde HTTP 400 e indica el campo requerido
  Y no se crea ningún cliente

@US-09 @edge-case
Escenario: US-09-E4 Prevención de duplicados por documento en el mismo tenant
  Dado que ya existe un cliente con ese documento en el tenant activo
  Cuando la recepcionista intenta registrarlo nuevamente
  Entonces el sistema responde HTTP 409 y evita el duplicado
  Y el mismo documento en otro tenant no genera conflicto
```

### US-10: Recepcionista — Buscar y listar clientes

```gherkin
@US-10 @happy-path @aislamiento
Escenario: US-10-E1 Listado filtrado únicamente por tenantId
  Dado que existen clientes en varios tenants
  Cuando la recepcionista consulta GET /clients
  Entonces el repositorio aplica $match por tenantId
  Y el sistema devuelve solo los clientes de la organización activa

@US-10 @alternative-path
Escenario: US-10-E2 Búsqueda dinámica por nombre o documento
  Dado que existen varios clientes en el tenant
  Cuando la recepcionista envía search con un nombre, apellido o documento
  Entonces el sistema devuelve únicamente las coincidencias insensibles a mayúsculas
  Y el total de resultados corresponde al filtro aplicado

@US-10 @error-path
Escenario: US-10-E3 Respuesta adecuada ante búsqueda sin coincidencias
  Dado que ningún cliente coincide con el criterio de búsqueda
  Cuando se ejecuta la consulta
  Entonces el sistema responde HTTP 200 con items vacío y total cero
  Y la interfaz muestra "No se encontraron clientes"

@US-10 @edge-case
Escenario: US-10-E4 Lista vacía en tenant sin clientes registrados
  Dado que el tenant activo nunca registró clientes
  Cuando se consulta el listado
  Entonces el sistema devuelve una colección vacía sin excepción de servidor
  Y se respeta el límite y la paginación solicitados
```

### US-11: Recepcionista — Actualizar o eliminar cliente (soft delete)

```gherkin
@US-11 @happy-path
Escenario: US-11-E1 Edición exitosa de datos de cliente dentro del tenant
  Dado que existe un cliente activo perteneciente al tenant
  Cuando la recepcionista modifica sus datos personales con valores válidos
  Entonces el sistema actualiza el registro con updatedBy y updatedAt
  Y conserva el tenantId original sin cambios

@US-11 @alternative-path @soft-delete
Escenario: US-11-E2 Eliminación lógica exitosa sin borrado físico
  Dado que existe un cliente activo en el tenant
  Cuando la recepcionista solicita eliminarlo
  Entonces el sistema marca deletedAt y lo excluye de búsquedas activas
  Y el documento del cliente permanece en MongoDB para auditoría histórica

@US-11 @error-path
Escenario: US-11-E3 Error al modificar o eliminar cliente inexistente
  Dado que el ObjectId del cliente no existe en el tenant activo
  Cuando se intenta actualizarlo o eliminarlo
  Entonces el sistema responde HTTP 404 con "Cliente no encontrado"
  Y no se produce ninguna escritura

@US-11 @edge-case @soft-delete
Escenario: US-11-E4 Protección de integridad con citas asociadas
  Dado que el cliente tiene una o más citas registradas en el tenant
  Cuando la recepcionista intenta eliminarlo
  Entonces physicalDeleteBlocked es verdadero y se aplica soft delete
  Y las citas históricas conservan el nombre y documento del cliente
```

### US-12: Administrador — Gestionar empleados y profesionales

```gherkin
@US-12 @happy-path
Escenario: US-12-E1 Registro de profesional dentro del tenant
  Dado que el administrador está autenticado y proporciona nombre, apellido y jornada válidos
  Cuando registra el profesional
  Entonces el sistema crea el registro con tenantId y active en verdadero
  Y la jornada laboral queda disponible para calcular disponibilidad

@US-12 @alternative-path
Escenario: US-12-E2 Edición de datos de profesional registrado
  Dado que existe un profesional en el tenant
  Cuando el administrador actualiza su especialidad, horarios o servicios asignados
  Entonces el sistema guarda los cambios y devuelve el profesional sanitizado
  Y las asociaciones previas se conservan si se mantienen en el payload

@US-12 @error-path
Escenario: US-12-E3 Rechazo de guardado por datos inválidos
  Dado que el día de la jornada está fuera de 0..6 o la hora de inicio es posterior al fin
  Cuando el administrador intenta guardar el profesional
  Entonces el sistema responde HTTP 400 con el detalle de validación
  Y no se crea ni actualiza el registro

@US-12 @edge-case @aislamiento
Escenario: US-12-E4 Denegación de modificación de profesional de otro tenant
  Dado que el ObjectId pertenece a un profesional de otra organización
  Cuando el administrador intenta modificarlo
  Entonces findByIdActive con tenantId no lo localiza y responde HTTP 404
  Y la verificación adicional de tenantId bloquea cualquier modificación cruzada
```

### US-13: Administrador — Gestionar servicios

```gherkin
@US-13 @happy-path
Escenario: US-13-E1 Registro de servicio con nombre, duración y costo válidos
  Dado que el administrador proporciona nombre, durationMinutes mayor a cero y price no negativo
  Cuando crea el servicio
  Entonces el sistema lo asocia al tenant activo y lo marca como activo
  Y la duración se usa para calcular la hora fin de las citas

@US-13 @alternative-path
Escenario: US-13-E2 Actualización de tarifa o duración de servicio
  Dado que existe un servicio registrado en el tenant
  Cuando el administrador modifica su precio o duración
  Entonces el sistema actualiza el servicio con updatedAt
  Y las nuevas citas utilizan la duración actualizada

@US-13 @error-path
Escenario: US-13-E3 Rechazo por duración cero o costo negativo
  Dado que durationMinutes es cero o price es menor a cero
  Cuando se intenta guardar el servicio
  Entonces el sistema rechaza la operación con HTTP 400
  Y el servicio existente permanece sin cambios

@US-13 @edge-case
Escenario: US-13-E4 Prevención de servicios duplicados por nombre en el mismo tenant
  Dado que ya existe un servicio con el mismo nombre en el tenant
  Cuando el administrador intenta registrarlo nuevamente
  Entonces el sistema responde HTTP 409 y evita la duplicación
  Y el mismo nombre en otro tenant no genera conflicto
```

### US-14: Administrador — Asociar profesionales con servicios

```gherkin
@US-14 @happy-path
Escenario: US-14-E1 Vinculación exitosa de profesional con servicio del mismo tenant
  Dado que existen un profesional activo y un servicio activo del mismo tenant
  Cuando el administrador los asocia
  Entonces el sistema añade el serviceId al arreglo services del profesional
  Y la relación queda restringida al tenantId correspondiente

@US-14 @alternative-path
Escenario: US-14-E2 Adición de nuevos servicios conservando asociaciones previas
  Dado que el profesional ya atiende otros servicios
  Cuando se le asocia un servicio nuevo y válido
  Entonces el sistema conserva las asociaciones anteriores y agrega la nueva
  Y el profesional devuelto incluye todos los serviceId

@US-14 @error-path
Escenario: US-14-E3 Rechazo si el profesional o servicio no existe
  Dado que cualquiera de los ObjectId no existe en el tenant activo
  Cuando se intenta crear la asociación
  Entonces el sistema responde HTTP 404 e informa el recurso faltante
  Y no se modifica el arreglo de servicios

@US-14 @edge-case
Escenario: US-14-E4 Evitar duplicación de relaciones profesional-servicio
  Dado que la relación profesional-servicio ya existe
  Cuando el administrador intenta crearla nuevamente
  Entonces el sistema detecta la asociación y no inserta un duplicado
  Y responde con el profesional sin cambios en su lista de servicios
```

---

## Épica 3 — Programación y Gestión de Citas

### US-15: Cliente / Recepcionista — Consultar disponibilidad

```gherkin
@US-15 @happy-path
Escenario: US-15-E1 Retorno de bloques horarios disponibles por profesional y fecha
  Dado que existe un profesional con jornada configurada y sin citas en la fecha
  Cuando se consulta GET /availability con professionalId y date
  Entonces el sistema devuelve slots con start, end, startTime y endTime
  Y cada slot respeta la duración del servicio seleccionado o la duración predeterminada

@US-15 @alternative-path
Escenario: US-15-E2 Filtrado por profesional y fecha seleccionada
  Dado que existen varios profesionales y fechas en el tenant
  Cuando se consulta disponibilidad con un professionalId y una date específicos
  Entonces el sistema calcula la jornada de ese día de la semana mediante getUTCDay
  Y excluye los rangos que solapan con citas activas de ese profesional

@US-15 @error-path
Escenario: US-15-E3 Rechazo ante consulta con fecha no válida o pasada
  Dado que la fecha no usa formato YYYY-MM-DD o es anterior al día actual UTC
  Cuando se consulta la disponibilidad
  Entonces el sistema responde HTTP 400 con el motivo de la validación
  Y no se generan bloques horarios

@US-15 @edge-case
Escenario: US-15-E4 Lista vacía cuando no existen bloques libres
  Dado que el profesional no atiende ese día o toda su jornada está ocupada
  Cuando se consulta su disponibilidad
  Entonces el sistema devuelve slots como arreglo vacío con HTTP 200
  Y la interfaz informa que no hay horarios libres
```

### US-16: Cliente / Recepcionista — Registrar cita

```gherkin
@US-16 @happy-path
Escenario: US-16-E1 Registro exitoso calculando hora fin según duración del servicio
  Dado que existen cliente, profesional activo y servicio asignado en el mismo tenant
  Cuando se registra una cita en un horario libre con date y time válidos
  Entonces el sistema crea la cita con start, end = start + durationMinutes y status programada
  Y devuelve los datos sanitizados con clientName, professionalName y serviceName

@US-16 @alternative-path
Escenario: US-16-E2 Confirmación en horario libre alternativo
  Dado que el horario inicialmente elegido dejó de estar disponible
  Cuando el usuario selecciona otro slot libre y confirma la reserva
  Entonces el sistema registra la cita en el nuevo horario
  Y el bloque anterior permanece libre para otros usuarios

@US-16 @error-path
Escenario: US-16-E3 Rechazo por intento de reserva en horario ocupado
  Dado que el rango [start, end) solapa con una cita activa del profesional
  Cuando se intenta registrar la nueva cita
  Entonces el sistema responde HTTP 409 por conflicto de horario
  Y no se persiste ninguna cita duplicada

@US-16 @edge-case
Escenario: US-16-E4 Rechazo si la duración excede el horario laboral
  Dado que minutes + service.durationMinutes supera el fin de la jornada del profesional
  Cuando se intenta registrar la cita
  Entonces el sistema responde HTTP 400 indicando que excede el horario laboral
  Y tampoco se permite una cita en día sin jornada configurada
```

### US-17: Recepcionista — Reprogramar cita

```gherkin
@US-17 @happy-path
Escenario: US-17-E1 Reprogramación exitosa a nueva fecha y hora disponible
  Dado que existe una cita programada o confirmada en el tenant
  Cuando se envía PATCH /appointments/:id/reschedule con date y time libres
  Entonces el sistema actualiza start y end recalculando la duración del servicio
  Y responde HTTP 200 con la cita sanitizada

@US-17 @alternative-path
Escenario: US-17-E2 Conservación de cliente y servicio al cambiar la programación
  Dado que se reprograma una cita a otra fecha válida
  Cuando se confirma el cambio
  Entonces clientId, professionalId, serviceId y notes permanecen sin cambios
  Y únicamente se modifica start, end y updatedBy

@US-17 @error-path
Escenario: US-17-E3 Rechazo si el nuevo horario seleccionado está ocupado
  Dado que el nuevo rango solapa con otra cita activa del mismo profesional
  Cuando se intenta reprogramar
  Entonces el sistema responde HTTP 409 por conflicto
  Y la cita original conserva su horario previo

@US-17 @edge-case
Escenario: US-17-E4 Rechazo si la cita está cancelada o excede la jornada
  Dado que la cita está cancelada, fue no asistió o la nueva hora excede la jornada
  Cuando se solicita la reprogramación
  Entonces el sistema responde HTTP 409 o HTTP 400 según el caso
  Y no se modifica la cita
```

### US-18: Cliente / Recepcionista — Cancelar cita

```gherkin
@US-18 @happy-path
Escenario: US-18-E1 Cancelación exitosa y liberación inmediata del bloque horario
  Dado que existe una cita programada o confirmada
  Cuando un usuario autorizado envía PATCH /appointments/:id/cancel
  Entonces el sistema marca status cancelada, canceledAt y cancellationReason
  Y el bloque horario deja de considerarse en findOverlaps

@US-18 @alternative-path
Escenario: US-18-E2 Cancelación permitida según reglas de rol y tiempo
  Dado que la recepcionista cancela sin restricción de antelación
  O que el cliente cancela una cita futura que aún no comenzó
  Cuando confirma la cancelación con un motivo opcional
  Entonces el sistema aplica el cambio y devuelve message descriptivo
  Y el cliente no puede cancelar una cita que ya comenzó

@US-18 @error-path
Escenario: US-18-E3 Rechazo ante intento de cancelar cita inexistente en el tenant
  Dado que el ObjectId no pertenece a ninguna cita del tenant activo
  Cuando se intenta cancelar
  Entonces el sistema responde HTTP 404
  Y no se libera ningún bloque

@US-18 @edge-case
Escenario: US-18-E4 Control de idempotencia ante citas previamente canceladas
  Dado que la cita ya tenía status cancelada
  Cuando se vuelve a solicitar su cancelación
  Entonces el sistema responde HTTP 200 con idempotente verdadero y el mensaje "La cita ya estaba cancelada"
  Y no duplica canceledAt ni la operación
```

### US-19: Recepcionista / Profesional — Actualizar estado de cita

```gherkin
@US-19 @happy-path
Escenario: US-19-E1 Cambio exitoso de programada a confirmada
  Dado que existe una cita en estado programada
  Cuando el usuario autorizado envía PATCH /appointments/:id/status con confirmada
  Entonces assertTransition valida la transición y actualiza el estado
  Y el sistema responde HTTP 200 con el nuevo estado

@US-19 @alternative-path
Escenario: US-19-E2 Cambio a completada por el profesional al finalizar la atención
  Dado que una cita confirmada ya fue atendida
  Cuando el profesional la marca como completada
  Entonces el sistema registra completada y actualiza updatedBy
  Y la cita deja de ser reprogramable o cancelable

@US-19 @error-path
Escenario: US-19-E3 Rechazo de estados no contemplados en el catálogo oficial
  Dado que el valor enviado no pertenece a programada, confirmada, completada, cancelada o no asistió
  Cuando se envía la actualización
  Entonces el sistema responde HTTP 400 con el catálogo de estados permitidos
  Y el estado original se conserva

@US-19 @edge-case
Escenario: US-19-E4 Bloqueo de transiciones no permitidas
  Dado que la cita está cancelada, completada o no asistió
  Cuando se intenta marcarla como completada o confirmada
  Entonces el sistema responde HTTP 409 con "Transición no permitida"
  Y la máquina de estados impide cualquier evolución desde estados terminales
```

### US-20: Usuario autorizado — Consultar citas

```gherkin
@US-20 @happy-path @aislamiento
Escenario: US-20-E1 Listado de citas pertenecientes exclusivamente al tenant activo
  Dado que existen citas en varios tenants
  Cuando un usuario autorizado consulta GET /appointments
  Entonces el repositorio aplica tenantId y devuelve items del tenant activo
  Y el total corresponde a ese conjunto filtrado

@US-20 @alternative-path
Escenario: US-20-E2 Filtrado simultáneo por cliente, profesional, servicio o rango de fechas
  Dado que existen múltiples criterios de búsqueda
  Cuando se combinan clientId, professionalId, serviceId, from y to
  Entonces buildFilter aplica todas las condiciones con start >= from y start < to
  Y la respuesta contiene solo las citas que cumplen todos los filtros

@US-20 @error-path
Escenario: US-20-E3 Validación y rechazo de rango de fechas invertido o inválido
  Dado que from es posterior a to o una de las fechas no usa YYYY-MM-DD
  Cuando se ejecuta la consulta
  Entonces el sistema responde HTTP 400 con el error del rango
  Y no se consulta la base de datos

@US-20 @edge-case @aislamiento
Escenario: US-20-E4 Garantía de aislamiento: nunca retornar citas de otros tenants
  Dado que un usuario de un tenant consulta citas con filtros amplios
  Cuando se construye la agregación o búsqueda
  Entonces el $match inicial y el filtro del repositorio exigen tenantId
  Y jamás se retorna una cita de otra organización
```

### US-21: Sistema — Evitar doble reserva (Prevención de Solapamiento)

```gherkin
@US-21 @happy-path
Escenario: US-21-E1 Permite reservas en bloques contiguos o sin solapamiento
  Dado que el profesional tiene citas separadas por huecos libres
  Cuando se registra una cita en un bloque sin solapamiento
  Entonces rangesOverlap devuelve falso y el sistema permite la reserva
  Y se respeta el estado programada inicial

@US-21 @alternative-path
Escenario: US-21-E2 Permite reserva si el inicio coincide exactamente con el fin de la anterior
  Dado que una cita existente termina a las 10:30
  Cuando se registra la nueva cita con inicio a las 10:30
  Entonces el intervalo semiabierto [start, end) considera que no hay solapamiento
  Y ambas citas quedan almacenadas para el mismo profesional y día

@US-21 @error-path
Escenario: US-21-E3 Rechazo de reserva que solape parcial o totalmente con otra cita
  Dado que una cita existente ocupa parte o todo el rango solicitado
  Cuando se intenta registrar la nueva cita
  Entonces assertSlotFree lanza ApiError.conflict con HTTP 409
  Y no se crea la nueva cita

@US-21 @edge-case @concurrencia
Escenario: US-21-E4 Control de concurrencia ante peticiones de reserva simultáneas
  Dado que dos peticiones intentan reservar el mismo horario del mismo profesional
  Cuando ambas llegan casi al mismo tiempo
  Entonces ScheduleLock serialize por tenantId, professionalId y fecha
  Y session.withTransaction con readConcern snapshot y writeConcern majority garantiza una sola reserva válida
```

---

## Épica 4 — Agenda Visual e Interactiva

### US-22: Recepcionista / Profesional — Visualizar agenda diaria

```gherkin
@US-22 @happy-path
Escenario: US-22-E1 Despliegue de citas del día en orden cronológico
  Dado que existen citas para una fecha determinada
  Cuando se consulta GET /agenda/daily con esa fecha
  Entonces el sistema devuelve appointments ordenados por start ascendente
  Y el grid semanal propio los muestra en su franja horaria

@US-22 @alternative-path
Escenario: US-22-E2 Filtrado de la vista diaria por profesional seleccionado
  Dado que el usuario selecciona un profesional en el filtro
  Cuando carga la agenda diaria
  Entonces el sistema aplica professionalId y la restricción de rol si corresponde
  Y solo se muestran las citas asignadas a ese profesional

@US-22 @error-path
Escenario: US-22-E3 Validación y error ante solicitud de fecha inválida
  Dado que la fecha no cumple YYYY-MM-DD
  Cuando se solicita la agenda diaria
  Entonces el sistema responde HTTP 400 con "La fecha no es válida"
  Y el calendario conserva la vista anterior sin datos erróneos

@US-22 @edge-case
Escenario: US-22-E4 Renderizado de agenda vacía sin errores
  Dado que no existen citas el día consultado
  Cuando se abre la agenda diaria
  Entonces el sistema devuelve events como arreglo vacío y count cero
  Y el calendario propio muestra la jornada sin excepciones
```

### US-23: Usuario autorizado — Visualizar agenda semanal y mensual

```gherkin
@US-23 @happy-path
Escenario: US-23-E1 Vista semanal con distribución en los 7 días
  Dado que existen citas durante una semana
  Cuando el usuario selecciona la vista semanal
  Entonces la API calcula el rango de lunes a domingo desde view=week y date
  Y el grid propio distribuye los eventos en los siete días de lunes a domingo

@US-23 @alternative-path
Escenario: US-23-E2 Rango mensual soportado por la API
  Dado que existen citas repartidas en un mes
  Cuando se consulta GET /agenda con view=month y date
  Entonces el sistema calcula el rango entre el primer y último día del mes
  Y la API devuelve los eventos agrupados por fecha

@US-23 @error-path
Escenario: US-23-E3 Notificación de error ante periodo no válido
  Dado que la vista enviada no es day, week o month o el rango es inválido
  Cuando se solicita la agenda
  Entonces el sistema responde HTTP 400 y el frontend muestra un toast de error
  Y el frontend mantiene la vista anterior sin datos erróneos

@US-23 @edge-case
Escenario: US-23-E4 Mantenimiento de filtros al navegar entre semanas o meses
  Dado que el usuario aplicó filtros de profesional y servicio
  Cuando navega con prev, next o today
  Entonces la carga de agenda recalcula el rango de fechas sin perder dichos filtros
  Y los eventos se recargan para el nuevo periodo
```

### US-24: Usuario autorizado — Filtrar agenda

```gherkin
@US-24 @happy-path
Escenario: US-24-E1 Aplicación de filtro por profesional en el calendario
  Dado que existen citas de varios profesionales
  Cuando se aplica el filtro professionalId
  Entonces getAgenda incluye professionalId en filters y en la respuesta
  Y el calendario muestra únicamente las citas de ese profesional

@US-24 @alternative-path
Escenario: US-24-E2 Combinación de múltiples filtros
  Dado que están disponibles los filtros profesional, servicio, cliente y fechas
  Cuando se combinan todos ellos
  Entonces appointmentRepository.search aplica cada condición junto con tenantId
  Y el resultado contiene solo las citas que cumplen la combinación completa

@US-24 @error-path
Escenario: US-24-E3 Rechazo si la fecha inicial es posterior a la fecha final
  Dado que from es mayor que to
  Cuando se aplica el filtro de rango
  Entonces buildRange devuelve valid falso y el sistema responde HTTP 400
  Y el frontend impide la recarga mostrando un mensaje de error

@US-24 @edge-case
Escenario: US-24-E4 Despliegue de calendario limpio si no hay coincidencias
  Dado que ninguna cita satisface los filtros aplicados
  Cuando se ejecuta la búsqueda
  Entonces el sistema devuelve count cero y events vacío con HTTP 200
  Y el calendario se renderiza sin eventos y sin errores

@US-24 @happy-path
Escenario: US-24-E5 Agenda compartida entre clientas del mismo negocio
  Dado que dos clientas pertenecen al mismo tenant y una ya reservó un horario
  Cuando la otra clienta consulta GET /agenda para esa fecha
  Entonces getAgenda devuelve la cita con isMine falso y el nombre de la clienta dueña
  Y la grilla la muestra como "Reservado por otro cliente" para evitar dobles reservas

@US-24 @error-path
Escenario: US-24-E6 Reserva ajena visible pero no gestionable ni visible en otro negocio
  Dado que una clienta visualiza una cita de otra clienta de su negocio
  Cuando intenta cancelarla y luego consulta la agenda de otro tenant
  Entonces appointmentService responde HTTP 403 por assertOwnership
  Y getAgenda solo devuelve citas del tenant de la clienta autenticada
```

### US-25: Recepcionista — Interactuar con el calendario

```gherkin
@US-25 @happy-path
Escenario: US-25-E1 Clic en cita abre modal con detalle completo
  Dado que existe una cita visible en el calendario
  Cuando el usuario hace clic sobre el evento
  Entonces el clic sobre la celda abre SweetAlert2 con cliente, profesional, servicio, inicio, fin, estado y notas
  Y el evento contiene la cita sanitizada devuelta por la API

@US-25 @alternative-path
Escenario: US-25-E2 Reprogramación a horario disponible actualiza vía API REST
  Dado que una cita es reprogramable
  Cuando el usuario cambia su fecha y hora a un horario libre
  Entonces la reprogramación envía date y time a rescheduleAppointment
  Y el sistema persiste el nuevo horario y recarga los eventos

@US-25 @error-path
Escenario: US-25-E3 Reprogramación a horario ocupado se rechaza y conserva el horario
  Dado que el horario de destino está ocupado o es inválido
  Cuando se intenta reprogramar la cita allí
  Entonces la API responde HTTP 409 o HTTP 400
  Y el calendario conserva el evento en su posición original y se muestra un toast de error

@US-25 @edge-case
Escenario: US-25-E4 Cancelación de la reprogramación conserva la posición original
  Dado que el usuario inició una reprogramación
  Cuando cancela la acción antes de confirmar
  Entonces no se envía ninguna petición de reprogramación
  Y la cita permanece en su fecha y hora originales
```

---

## Épica 5 — Dashboard e Indicadores

### US-26: Administrador — Consultar total de citas (Dashboard)

```gherkin
@US-26 @happy-path
Escenario: US-26-E1 Despliegue del indicador de total de citas del tenant
  Dado que existen citas registradas en el tenant
  Cuando el administrador abre el dashboard
  Entonces getConsolidatedDashboard devuelve totalAppointments
  Y la tarjeta KPI muestra el valor correspondiente al tenant activo

@US-26 @alternative-path
Escenario: US-26-E2 Recálculo dinámico según rango de fechas filtrado
  Dado que el administrador selecciona un periodo personalizado
  Cuando aplica el filtro de fechas
  Entonces resolveRange construye from y to y countInRange recuenta solo ese intervalo
  Y el total de la tarjeta se actualiza sin recargar la página

@US-26 @error-path
Escenario: US-26-E3 Rechazo de la consulta si el periodo es inválido
  Dado que from o to no usan YYYY-MM-DD o from es posterior a to
  Cuando se consulta el indicador
  Entonces el sistema responde HTTP 400 con el detalle del periodo inválido
  Y la interfaz mantiene el último valor válido

@US-26 @edge-case
Escenario: US-26-E4 Visualización en cero si no existen citas en el periodo
  Dado que el tenant no tiene citas en el rango seleccionado
  Cuando se consulta el total
  Entonces totalAppointments es cero y byStatus es un objeto vacío
  Y la tarjeta muestra 0 sin errores
```

### US-27: Administrador — Consultar servicios más solicitados (Dashboard)

```gherkin
@US-27 @happy-path
Escenario: US-27-E1 Ranking ordenado descendentemente por cantidad de citas
  Dado que existen citas asociadas a distintos servicios
  Cuando se consulta getTopServices
  Entonces la agregación agrupa por serviceId, cuenta y ordena por count descendente
  Y cada item incluye id, name, count y rank calculado con $setWindowFields

@US-27 @alternative-path
Escenario: US-27-E2 Filtrado por periodo de tiempo
  Dado que el administrador selecciona un rango de fechas
  Cuando aplica el filtro
  Entonces $match inicial restringe start al rango y excluye cancelada y no asistió
  Y el ranking considera únicamente las citas del periodo con tenantId activo

@US-27 @error-path
Escenario: US-27-E3 Rechazo por periodo inválido
  Dado que el rango de fechas es inválido o está invertido
  Cuando se solicita el ranking
  Entonces el sistema responde HTTP 400
  Y no se ejecuta la pipeline de agregación

@US-27 @edge-case
Escenario: US-27-E4 Manejo de empates sin omisión de servicios
  Dado que dos o más servicios tienen la misma cantidad de citas
  Cuando se genera el ranking
  Entonces $rank asigna el mismo rank a los empatados y el sort por name los lista sin omitirlos
  Y la tabla del dashboard muestra todas las filas empatadas
```

### US-28: Administrador — Consultar clientes frecuentes (Dashboard)

```gherkin
@US-28 @happy-path
Escenario: US-28-E1 Despliegue del ranking de clientes por frecuencia de reserva
  Dado que existen clientes con varias citas en el tenant
  Cuando se consulta getTopClients
  Entonces la agregación agrupa por clientId y devuelve name concatenando firstName y lastName
  Y el ranking incluye count y rank para cada cliente

@US-28 @alternative-path
Escenario: US-28-E2 Cálculo en función del rango de fechas filtrado
  Dado que se selecciona un periodo determinado
  Cuando se aplica el filtro de fechas
  Entonces la frecuencia se calcula solo con citas cuyo start cae en el rango
  Y se excluyen cancelada y no asistió

@US-28 @error-path
Escenario: US-28-E3 Rechazo por periodo inválido
  Dado que from o to son inválidos o from es posterior a to
  Cuando se consultan los clientes frecuentes
  Entonces el sistema responde HTTP 400 con el mensaje de periodo inválido
  Y la tabla conserva el último resultado válido

@US-28 @edge-case
Escenario: US-28-E4 Inclusión completa de clientes empatados en recurrencia
  Dado que varios clientes registran la misma cantidad de citas
  Cuando se genera el resultado
  Entonces todos conservan el mismo rank y aparecen ordenados por nombre
  Y ningún cliente empatado se omite de la respuesta
```

### US-29: Administrador — Consultar dashboard consolidado (Dashboard General)

```gherkin
@US-29 @happy-path
Escenario: US-29-E1 Vista unificada de todos los KPIs del negocio
  Dado que el tenant tiene clientes, servicios y citas registradas
  Cuando el administrador abre /dashboard
  Entonces el sistema devuelve totalAppointments, byStatus, topServices y topClients en una sola respuesta
  Y la interfaz muestra las tarjetas KPI y ambas tablas de ranking

@US-29 @alternative-path
Escenario: US-29-E2 Filtro de fecha global que recalcula todos los módulos
  Dado que el administrador selecciona un periodo global
  Cuando aplica el filtro
  Entonces getConsolidated normaliza el rango y lo reutiliza en los tres indicadores
  Y todos los módulos del dashboard reflejan el mismo periodo

@US-29 @error-path
Escenario: US-29-E3 Manejo de errores que evita colapso o datos incompletos en la interfaz
  Dado que ocurre un error al consultar alguna de las agregaciones
  Cuando se carga el dashboard
  Entonces el sistema informa el fallo mediante un toast y no muestra cifras parciales engañosas
  Y Promise.all propaga el error sin dejar la UI en estado inconsistente

@US-29 @edge-case @aislamiento
Escenario: US-29-E4 Aislamiento absoluto de datos por tenantId en todos los cálculos agregados
  Dado que otro tenant posee citas, servicios y clientes propios
  Cuando se calcula el dashboard del tenant activo
  Entonces cada $match y $lookup aplica tenantId, incluida la auditoría $count
  Y auditCount coincide con totalAppointments del tenant consultado
```
