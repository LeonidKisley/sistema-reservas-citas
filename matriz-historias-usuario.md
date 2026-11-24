# Matriz de Historias de Usuario y Criterios de Aceptación (Gherkin)

## 1. Resumen Ejecutivo y Especificaciones del Proyecto

El presente documento constituye la especificación funcional completa y la matriz de criterios de aceptación para el **Sistema Web de Reservas de Citas Multiinquilino SaaS**. El diseño sigue los principios de la arquitectura por capas (**Controller-Service-Repository**), principios **SOLID** y control de acceso basado en roles (**RBAC**), garantizando el aislamiento de datos por organización mediante la clave `tenantId`.

### Indicadores Globales de la Matriz

| Indicador | Valor / Cantidad | Descripción / Alcance |
| --- | --- | --- |
| **Historias de Usuario (US)** | 29 | Cobertura desde US-01 hasta US-29 |
| **Épicas Funcionales** | 5 | Módulos principales de arquitectura y negocio |
| **Roles Principales (RBAC)** | 4 | Administrador, Recepcionista, Profesional y Cliente |
| **Escenarios por Historia** | 4 | Happy Path, Alternative Path, Error Path y Edge Case |
| **Escenarios Gherkin Totales** | 118 | Pruebas ejecutables (29 Historias × 4 Escenarios + 2 adicionales de US-24) |

### Distribución de Historias de Usuario por Rol

| Rol de Usuario | Historias Asignadas | Cantidad | Enfoque Operativo |
| --- | --- | --- | --- |
| **Administrador** | US-01, US-06, US-12, US-13, US-14, US-26, US-27, US-28, US-29 | 9 | Configuración del tenant, RBAC, servicios, personal y dashboard analítico. |
| **Recepcionista** | US-09, US-10, US-11, US-15, US-16, US-17, US-18, US-19, US-22, US-25 | 10 | Operación diaria del mostrador, agendamiento, catálogo de clientes y calendario. |
| **Cliente** | US-03, US-04, US-15, US-16, US-18 | 5 | Portal de autoservicio para registro, autenticación, consulta y reserva de turnos. |
| **Profesional** | US-19, US-22 | 2 | Consulta de agenda diaria de trabajo y actualización del estado de atención. |
| **Usuario / Autenticado / Sistema** | US-02, US-05, US-07, US-08, US-20, US-21, US-23, US-24 | 8 | Procesos transversales, reglas automatizadas de no solapamiento y vistas compartidas. |

## 2. Matriz Consolidada de Historias de Usuario por Épica

### Épica 1: Autenticación, RBAC y Multiinquilino
Establece la infraestructura de seguridad, registro de organizaciones (tenants), emisión de tokens JWT, control de acceso basado en roles (RBAC) y gestión de credenciales.

| ID | Rol | Funcionalidad / Característica | Razón / Resultado Esperado |
| --- | --- | --- | --- |
| **US-01** | Administrador | Registrar organización | para crear un nuevo inquilino (tenant) con sus datos iniciales. |
| **US-02** | Usuario | Iniciar sesión con JWT | para acceder de forma segura según su organización y rol. |
| **US-03** | Cliente | Registrarse como cliente | para crear una cuenta y poder acceder al sistema y reservar citas. |
| **US-04** | Cliente | Iniciar sesión como cliente | para acceder de forma segura a su cuenta, consultar disponibilidad y gestionar sus citas. |
| **US-05** | Usuario autenticado | Acceder solo a recursos de su tenant | para garantizar el aislamiento absoluto de los datos entre distintas organizaciones. |
| **US-06** | Administrador | Gestionar permisos mediante RBAC | para que cada usuario solo pueda ejecutar las acciones autorizadas por su rol. |
| **US-07** | Usuario autenticado | Cerrar sesión | para finalizar de forma segura su sesión. |
| **US-08** | Usuario | Actualizar contraseña | para mantener protegida su cuenta. |

### Épica 2: Gestión de Catálogos (CRUD)
Permite la administración de las entidades maestras del sistema, incluyendo el registro de clientes, personal profesional, servicios (duración y costo) y sus respectivas relaciones.

| ID | Rol | Funcionalidad / Característica | Razón / Resultado Esperado |
| --- | --- | --- | --- |
| **US-09** | Recepcionista | Registrar cliente | para disponer de sus datos al momento de gestionar citas. |
| **US-10** | Recepcionista | Buscar y listar clientes | para localizar rápidamente la información de un cliente. |
| **US-11** | Recepcionista | Actualizar o eliminar cliente | para mantener el catálogo de clientes actualizado. |
| **US-12** | Administrador | Gestionar empleados y profesionales | para administrar al personal que atenderá las citas. |
| **US-13** | Administrador | Gestionar servicios | para definir los servicios disponibles, su duración y costo. |
| **US-14** | Administrador | Asociar profesionales con servicios | para definir qué servicios puede atender cada profesional. |

### Épica 3: Programación y Gestión de Citas
Constituye el motor central de reservas, controlado por la verificación de disponibilidad en tiempo real, reprogramaciones, cancelaciones, cambios de estado y la validación automatizada contra doble reserva.

| ID | Rol | Funcionalidad / Característica | Razón / Resultado Esperado |
| --- | --- | --- | --- |
| **US-15** | Cliente/Recepcionista | Consultar disponibilidad | para conocer horarios libres antes de reservar. |
| **US-16** | Cliente/Recepcionista | Registrar cita | para reservar un horario disponible con un profesional. |
| **US-17** | Recepcionista | Reprogramar cita | para cambiar la fecha u horario de una cita cuando sea necesario. |
| **US-18** | Cliente/Recepcionista | Cancelar cita | para liberar el horario cuando una cita ya no se realizará. |
| **US-19** | Recepcionista/Profesional | Actualizar estado de cita | para reflejar el estado real de atención. |
| **US-20** | Usuario autorizado | Consultar citas | para revisar las citas según sus permisos y filtros. |
| **US-21** | Sistema | Evitar doble reserva | para impedir que un profesional tenga dos citas que se superpongan. |

### Épica 4: Agenda Visual e Interactiva
Proporciona la interfaz de usuario basada en calendario (diario, semanal, mensual) con capacidades de filtrado y manipulación visual interactiva.

| ID | Rol | Funcionalidad / Característica | Razón / Resultado Esperado |
| --- | --- | --- | --- |
| **US-22** | Recepcionista/Profesional | Visualizar agenda diaria | para consultar las citas del día de forma ordenada. |
| **US-23** | Usuario autorizado | Visualizar agenda semanal y mensual | para planificar y revisar la carga de trabajo. |
| **US-24** | Usuario autorizado | Filtrar agenda | para encontrar citas específicas por profesional, servicio, cliente o rango de fechas. |
| **US-25** | Recepcionista | Interactuar con el calendario | para consultar detalles y reprogramar citas de forma visual. |

### Épica 5: Dashboard e Indicadores
Ofrece herramientas analíticas y de inteligencia de negocio para el rol Administrador, consolidando volumen de citas, demanda de servicios y recurrencia de clientes.

| ID | Rol | Funcionalidad / Característica | Razón / Resultado Esperado |
| --- | --- | --- | --- |
| **US-26** | Administrador | Consultar total de citas | para conocer el volumen de atención de la organización. |
| **US-27** | Administrador | Consultar servicios más solicitados | para identificar la demanda de los servicios. |
| **US-28** | Administrador | Consultar clientes frecuentes | para identificar a los clientes con mayor recurrencia. |
| **US-29** | Administrador | Consultar dashboard consolidado | para obtener una visión general de los principales indicadores. |

## 3. Criterios de Aceptación Detallados en Formato Gherkin

A continuación se especifican los 118 escenarios de prueba BDD (*Behavior-Driven Development*) estructurados en la sintaxis **Dado que... Cuando... Entonces...** para cada una de las 29 historias de usuario.

---
## Épica 1: Autenticación, RBAC y Multiinquilino

### US-01: Registrar organización
* **Rol**: Administrador
* **Propósito**: para crear un nuevo inquilino (tenant) con sus datos iniciales.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Registro exitoso de organización | Dado que el administrador está autenticado | Cuando registra una organización con nombre y datos válidos | Entonces el sistema crea el tenant y genera su identificador único |
| **2** | Registro con datos opcionales válidos | Dado que el administrador completó datos obligatorios y opcionales válidos | Cuando confirma el registro de la organización | Entonces el sistema crea el tenant y conserva los datos obligatorios y opcionales válidos |
| **3** | Datos obligatorios incompletos | Dado que el administrador intenta registrar una organización sin un dato obligatorio | Cuando envía el formulario | Entonces el sistema rechaza la operación e informa el campo faltante |
| **4** | Prevención de duplicados por nombre o identificador | Dado que ya existe un tenant con el mismo nombre o identificador | Cuando se intenta registrar nuevamente | Entonces el sistema rechaza el registro por duplicado y muestra un mensaje de conflicto sin crear otro tenant |

### US-02: Iniciar sesión con JWT
* **Rol**: Usuario
* **Propósito**: para acceder de forma segura según su organización y rol.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Credenciales válidas | Dado que existe un usuario activo con credenciales válidas | Cuando envía su correo y contraseña | Entonces el sistema autentica al usuario y devuelve un JWT con su tenantId y rol |
| **2** | Restricción de acceso exclusivo según rol | Dado que el usuario autenticado tiene JWT con tenantId y rol | Cuando intenta acciones permitidas y no permitidas | Entonces el sistema permite solo las autorizadas por su rol y deniega las demás |
| **3** | Contraseña incorrecta o usuario inexistente | Dado que el correo no corresponde a un usuario o la contraseña es incorrecta | Cuando intenta iniciar sesión | Entonces el sistema rechaza la autenticación y no emite un JWT válido |
| **4** | Token expirado | Dado que el JWT de una sesión ha expirado | Cuando el usuario intenta acceder a un recurso protegido | Entonces el sistema rechaza la solicitud y solicita autenticarse nuevamente |

### US-03: Registrarse como cliente
* **Rol**: Cliente
* **Propósito**: para crear una cuenta y poder acceder al sistema y reservar citas.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Registro exitoso | Dado que el cliente proporciona sus datos personales y credenciales válidas | Cuando envía el formulario de registro | Entonces el sistema crea su cuenta y la asocia al tenant correspondiente |
| **2** | Datos existentes | Dado que ya existe una cuenta con el mismo correo o documento dentro del tenant | Cuando el cliente intenta registrarse nuevamente | Entonces el sistema rechaza el registro e informa que los datos ya están registrados |
| **3** | Datos obligatorios incompletos | Dado que el cliente deja uno o más campos obligatorios vacíos | Cuando envía el formulario | Entonces el sistema rechaza el registro e indica los campos que debe completar |
| **4** | Contraseña no válida | Dado que la contraseña no cumple las reglas de seguridad establecidas | Cuando el cliente intenta crear su cuenta | Entonces el sistema rechaza el registro e informa los requisitos de la contraseña |

### US-04: Iniciar sesión como cliente
* **Rol**: Cliente
* **Propósito**: para acceder de forma segura a su cuenta, consultar disponibilidad y gestionar sus citas.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Credenciales válidas | Dado que el cliente tiene una cuenta activa y credenciales correctas | Cuando ingresa su correo y contraseña | Entonces el sistema autentica al cliente y emite un JWT con su tenantId y rol |
| **2** | Contraseña incorrecta | Dado que el cliente proporciona un correo registrado | Cuando ingresa una contraseña incorrecta | Entonces el sistema rechaza el acceso y no emite un JWT válido |
| **3** | Cuenta inexistente o inactiva | Dado que no existe una cuenta activa con el correo proporcionado | Cuando el cliente intenta iniciar sesión | Entonces el sistema rechaza la autenticación e informa que las credenciales no son válidas |
| **4** | Token expirado | Dado que el cliente tenía una sesión cuyo JWT ya expiró | Cuando intenta acceder a una funcionalidad protegida | Entonces el sistema rechaza la solicitud y solicita iniciar sesión nuevamente |

### US-05: Acceder solo a recursos de su tenant
* **Rol**: Usuario autenticado
* **Propósito**: para garantizar el aislamiento absoluto de los datos entre distintas organizaciones.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1.0** | Acceso permitido a datos del propio tenant | Dado que el usuario autenticado posee un JWT con un tenantId válido | Cuando solicita recursos o registros del sistema | Entonces el sistema filtra la consulta y devuelve únicamente la información asociada a su tenantId |
| **2.0** | Intento de acceso a recursos de otro tenant | Dado que un usuario autenticado intenta consultar un recurso con UUID perteneciente a otra organización | Cuando envía la petición HTTP a la API REST | Entonces el middleware de aislamiento rechaza la solicitud devuelviendo un código de estado 403 Forbidden |
| **3.0** | Petición sin cabecera o token de tenant | Dado que se envía una solicitud a un endpoint protegido sin incluir el token JWT de autenticación | Cuando el servidor procesa la petición | Entonces el sistema deniega el acceso con un código 401 Unauthorized |
| **4.0** | Consulta en tenant recién registrado sin datos | Dado que una organización recién creada aún no registra clientes ni servicios | Cuando el usuario autenticado consulta los listados principales | Entonces el sistema responde exitosamente con colecciones vacías sin generar excepciones de servidor |

### US-06: Gestionar permisos mediante RBAC
* **Rol**: Administrador
* **Propósito**: para que cada usuario solo pueda ejecutar las acciones autorizadas por su rol.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Administrador realiza acción permitida | Dado que el usuario tiene rol Administrador | Cuando ejecuta una operación administrativa autorizada | Entonces el sistema permite la operación |
| **2** | Recepcionista realiza acción permitida | Dado que el usuario tiene rol Recepcionista | Cuando consulta o gestiona una funcionalidad permitida para su rol | Entonces el sistema permite la operación |
| **3** | Cliente intenta acción administrativa | Dado que el usuario tiene rol Cliente | Cuando intenta gestionar empleados o servicios | Entonces el sistema deniega la operación por falta de permisos |
| **4** | Usuario intenta modificar su rol | Dado que un usuario autenticado intenta enviar un rol diferente al que posee | Cuando solicita modificar sus permisos mediante la petición | Entonces el sistema rechaza la escalada de privilegios |

### US-07: Cerrar sesión
* **Rol**: Usuario autenticado
* **Propósito**: para finalizar de forma segura su sesión.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Cierre de sesión exitoso | Dado que el usuario tiene una sesión autenticada | Cuando solicita cerrar sesión | Entonces el sistema finaliza la sesión y deja de aceptar el token según la política implementada |
| **2** | Cierre con sesión ya finalizada | Dado que el usuario ya cerró su sesión | Cuando vuelve a solicitar el cierre | Entonces el sistema responde sin generar una nueva sesión |
| **3** | Token inválido al cerrar sesión | Dado que la petición contiene un token inválido | Cuando solicita cerrar sesión | Entonces el sistema rechaza la petición |
| **4** | Reutilización de token invalidado | Dado que un token fue invalidado al cerrar sesión | Cuando se intenta reutilizar para acceder a un recurso protegido | Entonces el sistema deniega el acceso |

### US-08: Actualizar contraseña
* **Rol**: Usuario
* **Propósito**: para mantener protegida su cuenta.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Cambio de contraseña exitoso | Dado que el usuario conoce su contraseña actual | Cuando ingresa una nueva contraseña válida y confirma el cambio | Entonces el sistema actualiza la contraseña de forma segura |
| **2** | Almacenamiento seguro del nuevo hash | Dado que el usuario validó su contraseña actual y proporcionó una nueva contraseña válida | Cuando confirma el cambio | Entonces el sistema almacena el nuevo hash con bcrypt de forma segura |
| **3** | Contraseña actual incorrecta | Dado que la contraseña actual proporcionada es incorrecta | Cuando el usuario intenta cambiarla | Entonces el sistema rechaza el cambio y conserva la contraseña anterior |
| **4** | Nueva contraseña inválida o igual a la actual | Dado que la nueva contraseña no cumple las reglas de seguridad o es igual a la actual | Cuando confirma el cambio | Entonces el sistema rechaza la operación, informa el motivo y conserva la contraseña anterior |

---
## Épica 2: Gestión de Catálogos (CRUD)

### US-09: Registrar cliente
* **Rol**: Recepcionista
* **Propósito**: para disponer de sus datos al momento de gestionar citas.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Registro exitoso | Dado que la recepcionista está autenticada | Cuando registra un cliente con datos válidos | Entonces el sistema crea el cliente asociado al tenant actual |
| **2** | Almacenamiento de datos opcionales válidos | Dado que la recepcionista proporciona datos obligatorios y opcionales válidos | Cuando confirma el registro | Entonces el sistema crea el cliente en el tenant actual y guarda los datos opcionales válidos |
| **3** | Datos obligatorios faltantes | Dado que falta un dato obligatorio del cliente | Cuando envía el formulario | Entonces el sistema rechaza el registro e indica el dato requerido |
| **4** | Prevención de duplicados por documento | Dado que ya existe un cliente con el mismo número de documento en el tenant | Cuando se intenta registrar nuevamente | Entonces el sistema evita el duplicado e informa el conflicto |

### US-10: Buscar y listar clientes
* **Rol**: Recepcionista
* **Propósito**: para localizar rápidamente la información de un cliente.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Listado de clientes | Dado que existen clientes en el tenant | Cuando la recepcionista consulta el listado | Entonces el sistema muestra únicamente los clientes del tenant |
| **2** | Búsqueda por nombre o documento | Dado que existen varios clientes | Cuando busca por nombre o documento | Entonces el sistema devuelve las coincidencias correspondientes |
| **3** | Búsqueda sin coincidencias | Dado que no existe ningún cliente que coincida con el criterio | Cuando ejecuta la búsqueda | Entonces el sistema muestra que no se encontraron resultados |
| **4** | Consulta con tenant sin datos | Dado que el tenant no tiene clientes registrados | Cuando consulta el listado | Entonces el sistema devuelve una lista vacía sin error |

### US-11: Actualizar o eliminar cliente
* **Rol**: Recepcionista
* **Propósito**: para mantener el catálogo de clientes actualizado.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Actualización exitosa | Dado que existe un cliente perteneciente al tenant | Cuando la recepcionista modifica datos válidos | Entonces el sistema actualiza la información del cliente |
| **2** | Eliminación exitosa | Dado que existe un cliente sin información que impida su eliminación | Cuando la recepcionista solicita eliminarlo | Entonces el sistema elimina o desactiva el registro según la política definida |
| **3** | Cliente inexistente | Dado que el UUID del cliente no existe en el tenant | Cuando intenta actualizarlo o eliminarlo | Entonces el sistema informa que el recurso no existe |
| **4** | Cliente con citas asociadas | Dado que el cliente tiene citas asociadas | Cuando intenta eliminarlo | Entonces el sistema impide la eliminación física si compromete la integridad de las citas y muestra el motivo |

### US-12: Gestionar empleados y profesionales
* **Rol**: Administrador
* **Propósito**: para administrar al personal que atenderá las citas.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Registrar profesional | Dado que el administrador está autenticado | Cuando registra un profesional con datos válidos | Entonces el sistema crea el profesional dentro del tenant |
| **2** | Actualizar profesional | Dado que existe un profesional registrado | Cuando el administrador actualiza sus datos válidos | Entonces el sistema guarda los cambios |
| **3** | Datos inválidos | Dado que los datos del profesional no cumplen las validaciones | Cuando intenta guardarlos | Entonces el sistema rechaza la operación e informa los errores |
| **4** | Intento de gestionar profesional de otro tenant | Dado que el UUID del profesional pertenece a otro tenant | Cuando el administrador intenta modificarlo | Entonces el sistema deniega la operación |

### US-13: Gestionar servicios
* **Rol**: Administrador
* **Propósito**: para definir los servicios disponibles, su duración y costo.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Registrar servicio | Dado que el administrador está autenticado | Cuando registra un servicio con nombre, duración y costo válidos | Entonces el sistema crea el servicio asociado al tenant |
| **2** | Actualizar servicio | Dado que existe un servicio registrado | Cuando modifica su duración o costo con valores válidos | Entonces el sistema actualiza el servicio |
| **3** | Duración o costo inválido | Dado que la duración es cero o el costo es negativo | Cuando intenta guardar el servicio | Entonces el sistema rechaza los valores inválidos |
| **4** | Servicio duplicado | Dado que ya existe un servicio con el mismo nombre dentro del tenant | Cuando intenta registrarlo nuevamente | Entonces el sistema evita la duplicación |

### US-14: Asociar profesionales con servicios
* **Rol**: Administrador
* **Propósito**: para definir qué servicios puede atender cada profesional.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Asociación exitosa | Dado que existen un profesional y un servicio del mismo tenant | Cuando el administrador los asocia | Entonces el sistema registra la relación |
| **2** | Consultar servicios asociados | Dado que el profesional ya tiene otros servicios asociados | Cuando agrega un nuevo servicio válido | Entonces el sistema conserva las asociaciones anteriores y agrega la nueva |
| **3** | Rechazo si el profesional o servicio no existe | Dado que el profesional o el servicio no existe en el tenant | Cuando se intenta crear la asociación | Entonces el sistema rechaza la operación e informa el recurso inexistente |
| **4** | Evitar duplicación de relaciones | Dado que la relación profesional-servicio ya existe en el mismo tenant | Cuando se intenta crearla nuevamente | Entonces el sistema evita la duplicación y mantiene una sola relación |

---
## Épica 3: Programación y Gestión de Citas

### US-15: Consultar disponibilidad
* **Rol**: Cliente/Recepcionista
* **Propósito**: para conocer horarios libres antes de reservar.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Consultar disponibilidad | Dado que existe un profesional con servicios y disponibilidad configurada | Cuando se consulta una fecha válida | Entonces el sistema devuelve los horarios disponibles |
| **2** | Filtrar por fecha y profesional | Dado que se selecciona un profesional y una fecha específica | Cuando se consulta su disponibilidad | Entonces el sistema filtra los horarios para ese profesional y fecha |
| **3** | Rechazo ante fecha no válida o pasada | Dado que la fecha solicitada es no válida o pasada | Cuando se consulta la disponibilidad | Entonces el sistema rechaza la consulta e informa el error |
| **4** | Profesional sin disponibilidad | Dado que el profesional no tiene bloques libres para la fecha consultada | Cuando se consulta su disponibilidad | Entonces el sistema devuelve una lista vacía sin error |

### US-16: Registrar cita
* **Rol**: Cliente/Recepcionista
* **Propósito**: para reservar un horario disponible con un profesional.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Registro de cita exitoso | Dado que existe un cliente, profesional y servicio válidos | Cuando selecciona un horario disponible y registra la cita | Entonces el sistema crea la cita con su hora de inicio, fin calculado y estado programada |
| **2** | Confirmación en horario libre alternativo | Dado que el horario inicial no está disponible pero existe otro horario libre válido | Cuando se confirma la reserva en ese horario alternativo | Entonces el sistema crea la cita allí con su hora fin calculada y estado programada |
| **3** | Rechazo por horario ocupado | Dado que el horario seleccionado ya está ocupado | Cuando se intenta registrar la cita | Entonces el sistema rechaza la reserva e informa el conflicto de horario |
| **4** | Cita que termina fuera del horario disponible | Dado que la duración del servicio hace que la cita termine fuera del horario permitido | Cuando intenta registrarla | Entonces el sistema rechaza la cita |

### US-17: Reprogramar cita
* **Rol**: Recepcionista
* **Propósito**: para cambiar la fecha u horario de una cita cuando sea necesario.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Reprogramación exitosa | Dado que existe una cita reprogramable | Cuando selecciona una nueva fecha y horario disponible | Entonces el sistema actualiza la cita con el nuevo horario |
| **2** | Conservación de cliente y servicio al cambiar la programación | Dado que existe una cita reprogramable y un nuevo horario libre | Cuando se reprograma la cita | Entonces el sistema cambia solo la fecha/hora y conserva cliente y servicio |
| **3** | Rechazo si el nuevo horario está ocupado | Dado que el nuevo horario seleccionado está ocupado | Cuando se intenta reprogramar | Entonces el sistema rechaza el cambio y conserva la programación original |
| **4** | Rechazo si está cancelada o excede la jornada disponible | Dado que la cita está cancelada o que la nueva duración excede la jornada disponible | Cuando se solicita reprogramarla | Entonces el sistema rechaza la operación y conserva la cita sin cambios |

### US-18: Cancelar cita
* **Rol**: Cliente/Recepcionista
* **Propósito**: para liberar el horario cuando una cita ya no se realizará.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Cancelación exitosa | Dado que existe una cita activa | Cuando un usuario autorizado solicita cancelarla | Entonces el sistema cambia su estado a cancelada y libera el horario |
| **2** | Cancelación permitida según reglas de rol y tiempo | Dado que existe una cita programada, el usuario tiene rol autorizado y la cancelación está dentro de la ventana permitida | Cuando solicita cancelarla | Entonces el sistema registra la cancelación y libera el bloque horario |
| **3** | Cita inexistente | Dado que la cita no existe en el tenant | Cuando intenta cancelarla | Entonces el sistema rechaza la solicitud |
| **4** | Control de idempotencia ante citas canceladas | Dado que la cita ya está cancelada | Cuando se vuelve a solicitar su cancelación | Entonces el sistema no duplica la operación y mantiene el estado cancelada |

### US-19: Actualizar estado de cita
* **Rol**: Recepcionista/Profesional
* **Propósito**: para reflejar el estado real de atención.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Cambiar a confirmada | Dado que existe una cita programada | Cuando el usuario autorizado cambia su estado a confirmada | Entonces el sistema actualiza el estado correctamente |
| **2** | Cambiar a completada | Dado que una cita confirmada ya fue atendida | Cuando el profesional la marca como completada | Entonces el sistema registra el estado completada |
| **3** | Estado no permitido | Dado que el usuario intenta establecer un estado fuera del catálogo permitido | Cuando envía la actualización | Entonces el sistema rechaza el valor |
| **4** | Intentar modificar una cita cancelada | Dado que una cita está cancelada | Cuando intenta marcarla como completada | Entonces el sistema impide una transición de estado no permitida |

### US-20: Consultar citas
* **Rol**: Usuario autorizado
* **Propósito**: para revisar las citas según sus permisos y filtros.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Listado de citas | Dado que el usuario tiene permisos para consultar citas | Cuando solicita el listado | Entonces el sistema devuelve las citas permitidas de su tenant |
| **2** | Filtrar por cliente/profesional/servicio/fecha | Dado que existen múltiples criterios de búsqueda | Cuando filtra por cliente, profesional, servicio o rango de fechas | Entonces el sistema devuelve las citas que cumplen los filtros |
| **3** | Validación y rechazo de rango de fechas invertido o inválido | Dado que el rango de fechas está invertido o es inválido | Cuando se ejecuta la consulta | Entonces el sistema rechaza el filtro e informa el error |
| **4** | Garantía de aislamiento: nunca retornar citas de otros tenants | Dado que existe una cita perteneciente a otro tenant | Cuando el usuario consulta citas con su tenant activo | Entonces el repositorio inyecta tenantId y nunca devuelve la cita ajena, sin exponer datos cruzados |

### US-21: Evitar doble reserva
* **Rol**: Sistema
* **Propósito**: para impedir que un profesional tenga dos citas que se superpongan.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Reserva sin solapamiento | Dado que existe un horario libre | Cuando se registra una cita que no se superpone con otra | Entonces el sistema permite la reserva |
| **2** | Permite reserva si el inicio coincide con el fin de la cita anterior | Dado que una cita existente termina a las 10:30 | Cuando se registra otra de 10:30 a 11:00 para el mismo profesional | Entonces el sistema permite la reserva por ser contigua y no solapada |
| **3** | Rechazo de reserva que solape parcial o totalmente | Dado que existe una cita de 10:00 a 10:30 para un profesional | Cuando se intenta registrar 10:15-10:45 o 10:00-10:30 para ese mismo profesional | Entonces el sistema rechaza la reserva por solapamiento parcial o total |
| **4** | Control de concurrencia ante peticiones simultáneas | Dado que dos peticiones simultáneas intentan reservar el mismo bloque libre de un profesional | Cuando el backend las procesa concurrentemente | Entonces solo una se confirma y la otra se rechaza por conflicto, sin doble reserva |

---
## Épica 4: Agenda Visual e Interactiva

### US-22: Visualizar agenda diaria
* **Rol**: Recepcionista/Profesional
* **Propósito**: para consultar las citas del día de forma ordenada.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Mostrar agenda diaria | Dado que existen citas para una fecha determinada | Cuando el usuario abre la agenda diaria | Entonces el sistema muestra las citas del día en orden cronológico |
| **2** | Filtrado de la vista diaria por profesional | Dado que existen citas del día para varios profesionales | Cuando se selecciona un profesional | Entonces la agenda diaria muestra solo sus citas |
| **3** | Validación y error ante solicitud de fecha inválida | Dado que la fecha solicitada tiene formato inválido | Cuando se intenta cargar la agenda diaria | Entonces el sistema rechaza la consulta e informa el error |
| **4** | Renderizado de agenda vacía sin errores | Dado que el día consultado no tiene citas | Cuando se abre la agenda diaria | Entonces el sistema muestra la agenda vacía sin error |

### US-23: Visualizar agenda semanal y mensual
* **Rol**: Usuario autorizado
* **Propósito**: para planificar y revisar la carga de trabajo.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Vista semanal | Dado que existen citas en una semana | Cuando el usuario selecciona la vista semanal | Entonces el calendario muestra las citas de los siete días correspondientes |
| **2** | Vista mensual | Dado que existen citas en un mes | Cuando selecciona la vista mensual | Entonces el sistema muestra las citas del mes seleccionado |
| **3** | Notificación de error ante periodo no válido | Dado que el periodo solicitado no puede interpretarse correctamente | Cuando se cambia de periodo | Entonces el sistema notifica el error de consulta |
| **4** | Mantenimiento de filtros al navegar entre periodos | Dado que hay filtros activos y se navega a otra semana o mes | Cuando se cambia el periodo | Entonces el sistema conserva los mismos filtros y muestra solo las citas que coincidan |

### US-24: Filtrar agenda
* **Rol**: Usuario autorizado
* **Propósito**: para encontrar citas específicas por profesional, servicio, cliente o rango de fechas.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Aplicar un filtro | Dado que existen citas registradas | Cuando aplica un filtro por profesional | Entonces el calendario muestra únicamente las citas de ese profesional |
| **2** | Combinar varios filtros | Dado que existen varios filtros disponibles | Cuando combina profesional, servicio, cliente y rango de fechas | Entonces el sistema devuelve únicamente las citas que cumplen todos los criterios |
| **3** | Rechazo si la fecha inicial es posterior a la final | Dado que la fecha inicial del filtro es posterior a la final | Cuando se aplica el filtro | Entonces el sistema rechaza la consulta e informa el rango inválido |
| **4** | Despliegue de calendario limpio si no hay coincidencias | Dado que ninguna cita coincide con los filtros aplicados | Cuando se ejecuta la búsqueda | Entonces el calendario muestra cero eventos sin generar error |
| **5** | Agenda compartida entre clientas del mismo negocio | Dado que dos clientas pertenecen al mismo negocio y una ya reservó un horario | Cuando la otra clienta consulta la agenda | Entonces la reserva aparece marcada como ajena con `isMine: false` para evitar dobles reservas |
| **6** | Aislamiento y protección de reservas ajenas | Dado que una clienta visualiza la reserva de otra clienta de su negocio | Cuando intenta cancelarla o consulta la agenda de otro negocio | Entonces recibe HTTP 403 y no ve citas fuera de su negocio |

### US-25: Interactuar con el calendario
* **Rol**: Recepcionista
* **Propósito**: para consultar detalles y reprogramar citas de forma visual.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Abrir detalle de cita | Dado que existe una cita visible en el calendario | Cuando el usuario hace clic sobre ella | Entonces el sistema muestra el detalle de la cita |
| **2** | Arrastrar y reprogramar | Dado que existe una cita reprogramable | Cuando el usuario la arrastra a un horario disponible | Entonces el sistema actualiza la fecha y hora de la cita |
| **3** | Nuevo horario ocupado | Dado que el nuevo horario está ocupado | Cuando intenta arrastrar la cita allí | Entonces el sistema rechaza la reprogramación y conserva el horario anterior |
| **4** | Cancelar una reprogramación | Dado que el usuario inicia una reprogramación visual | Cuando cancela la acción antes de confirmar | Entonces el sistema conserva la cita en su horario original |

---
## Épica 5: Dashboard e Indicadores

### US-26: Consultar total de citas
* **Rol**: Administrador
* **Propósito**: para conocer el volumen de atención de la organización.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Mostrar total de citas | Dado que existen citas en el tenant | Cuando el administrador consulta el dashboard | Entonces el sistema muestra el total de citas correspondiente |
| **2** | Filtrar por periodo | Dado que el administrador selecciona un periodo | Cuando aplica el filtro de fechas | Entonces el total se recalcula para ese periodo |
| **3** | Rechazo de la consulta si el periodo es inválido | Dado que el periodo consultado es inválido | Cuando se consulta el indicador | Entonces el sistema rechaza el filtro e informa el error |
| **4** | Visualización en cero si no existen citas en el periodo | Dado que el tenant activo no tiene citas en el periodo seleccionado | Cuando se consulta el total | Entonces el sistema muestra cero citas para ese tenant y periodo |

### US-27: Consultar servicios más solicitados
* **Rol**: Administrador
* **Propósito**: para identificar la demanda de los servicios.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Mostrar ranking de servicios | Dado que existen citas asociadas a distintos servicios | Cuando el administrador consulta el indicador | Entonces el sistema muestra los servicios ordenados por cantidad de solicitudes |
| **2** | Filtrado por periodo de tiempo | Dado que existen citas en varios periodos y se selecciona uno | Cuando se aplica el filtro | Entonces el ranking usa únicamente las citas de ese periodo |
| **3** | Rechazo por periodo inválido | Dado que el periodo de consulta es inválido | Cuando se solicita el ranking | Entonces el sistema rechaza la consulta e informa el error |
| **4** | Servicios con la misma cantidad | Dado que dos o más servicios tienen la misma cantidad de citas | Cuando se genera el ranking | Entonces el sistema muestra ambos servicios sin perder registros |

### US-28: Consultar clientes frecuentes
* **Rol**: Administrador
* **Propósito**: para identificar a los clientes con mayor recurrencia.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Mostrar clientes frecuentes | Dado que existen clientes con varias citas | Cuando el administrador consulta el indicador | Entonces el sistema muestra los clientes con mayor recurrencia |
| **2** | Cálculo en función del rango de fechas filtrado | Dado que se selecciona un rango de fechas | Cuando se aplica el filtro | Entonces la frecuencia de clientes se calcula usando solo las citas de ese rango |
| **3** | Rechazo por periodo inválido | Dado que el periodo es inválido | Cuando se consultan los clientes frecuentes | Entonces el sistema rechaza la consulta e informa el error |
| **4** | Empate entre clientes | Dado que varios clientes tienen la misma cantidad de citas | Cuando se genera el resultado | Entonces el sistema incluye a todos los clientes empatados |

### US-29: Consultar dashboard consolidado
* **Rol**: Administrador
* **Propósito**: para obtener una visión general de los principales indicadores.

| # | Tipo de Escenario | Given (Dado que) | When (Cuando) | Then (Entonces) |
| --- | --- | --- | --- | --- |
| **1** | Mostrar indicadores completos | Dado que el tenant tiene información registrada | Cuando el administrador abre el dashboard | Entonces el sistema muestra los indicadores consolidados disponibles |
| **2** | Aplicar filtro de periodo | Dado que el administrador selecciona un periodo | Cuando aplica el filtro | Entonces todos los indicadores se recalculan para el mismo periodo |
| **3** | Manejo de errores sin datos incompletos o incorrectos | Dado que ocurre un error al consultar los indicadores | Cuando se carga el dashboard | Entonces el sistema informa que no fue posible obtener los datos sin colapsar ni mostrar información incompleta/incorrecta |
| **4** | Aislamiento absoluto de datos por tenantId en todos los cálculos agregados | Dado que existen datos de otro tenant y datos del tenant activo | Cuando se cargan todos los indicadores agregados | Entonces cada agregación usa tenantId del activo y nunca incluye datos del otro tenant |
