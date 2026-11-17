# 📋 Plan de Ejecución y Decisiones Arquitecturales - Sistema Web de Reservas de Citas (MERN Stack)

Este documento registra las **decisiones arquitecturales bloqueadas**, la **estructura del proyecto** y el **orden de ejecución en 8 fases (Fase 0 a Fase 7)** para guiar al agente de IA (OpenCode) durante el desarrollo del proyecto.

---

## 🔒 1. Decisiones Arquitecturales Bloqueadas

| Tema | Decisión Seleccionada | Implicación Técnica |
| :--- | :--- | :--- |
| **Estructura** | `backend/` + `frontend/` | Dos carpetas independientes con `package.json` propios. Node.js (ESM) en backend y React + Vite en frontend. |
| **US-11 (Borrado)** | Borrado Lógico (`Soft Delete`) | Inclusión del campo `deletedAt` / `isActive` en el modelo `Client`. Los repositorios excluyen registros eliminados de las búsquedas activas, manteniendo el historial de citas intacto. |
| **US-21.4 (Concurrencia)** | Transacción + Bloqueo | Uso de `session.withTransaction`, `readConcern: 'snapshot'`, `writeConcern: 'majority'`. Candado por `{ tenantId, professionalId, fecha }` y solapamiento de rangos semiabiertos `[start, end)`. |
| **Pruebas** | Críticos + Gherkin | Cobertura de 116 escenarios documentados y suite de pruebas automatizadas con Vitest + Supertest + MongoMemoryServer para Auth, Tenant, Solapamiento, RBAC y Dashboard. |
| **Fuente de Verdad** | Matriz (29 HU) | La **US-05** se implementa explícitamente como la historia de aislamiento e integridad entre inquilinos (`tenantId`). |

---

## 📁 2. Estructura de Directorios del Proyecto

```text
C:\SistemaReservas\
├── backend/
│   ├── src/
│   │   ├── config/          # Conexión a MongoDB Atlas, variables de entorno y constantes
│   │   ├── models/          # Esquemas Mongoose (Tenant, User, Client, Employee, Service, Appointment)
│   │   ├── repositories/    # Capa DAO con inyección obligatoria de tenantId
│   │   ├── services/        # Lógica de negocio, algoritmo de slots y transacciones
│   │   ├── controllers/     # Controladores HTTP (req, res, next)
│   │   ├── routes/          # Definición de rutas API REST agrupadas por módulos
│   │   ├── middlewares/     # Auth JWT, RBAC, validación de tenantId y manejo global de errores
│   │   └── utils/           # Manejador de respuestas estándar, ApiError y validadores
│   ├── tests/               # Pruebas automatizadas (Vitest + Supertest + MongoMemoryServer)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables JSX (Modales, Tablas, Forms, Layout)
│   │   ├── pages/           # Vistas principales (Login, Dashboard, Agenda, Clientes, Servicios)
│   │   ├── context/         # AuthContext (JWT, tenantId, rol global)
│   │   ├── hooks/           # Custom Hooks para fetching y manejo de estado
│   │   ├── services/        # Cliente Axios/Fetch configurado hacia la API Backend
│   │   ├── routes/          # Rutas protegidas por rol con React Router
│   │   └── utils/           # Formateadores de fecha (Day.js), SweetAlert2 y Toastify
│   └── package.json
└── docs/                    # 116 escenarios de aceptación Gherkin + Registro de decisiones
```

---

## 🛠️ 3. Orden de Ejecución Confirmado (Fases de Desarrollo)

### **Fase 0 — Base y Configuración Inicial**
- Configuración de ESM en Node.js y lectura de variables de entorno con `.env`.
- Definición de clase personalizada `ApiError` y estructura de respuesta uniforme: `{ success: boolean, data: any, message: string, errors?: any }`.
- Middleware global de manejo de errores y utilidades de validación (`validator.js`).

### **Fase 1 — Autenticación, Seguridad y Tenants (US-01 a US-08 + US-05)**
- Modelos Mongoose para `Tenant` y `User`.
- Autenticación mediante **JWT** inyectando `tenantId` y `rol` en el payload.
- Hashing de contraseñas con **Bcrypt**.
- Mecanismo de invalidez de sesión (blacklist de tokens para Logout en US-07).
- Middlewares de autorización y Control de Acceso Basado en Roles (**RBAC**).
- Script de inicialización (*Seed*) para crear el primer Tenant y usuario Administrador.

### **Fase 2 — Catálogos del Sistema (US-09 a US-14)**
- Modelo `Client` con borrado lógico (`deletedAt`).
- Modelo `Employee`/`Professional` con asignación de jornadas laborales y servicios habilitados.
- Modelo `Service` con definición de duración (minutos), costo y restricción de unicidad por `tenantId`.
- Asociación de relación M:N entre profesionales y servicios.

### **Fase 3 — Core de Citas y Control de Concurrencia (US-15 a US-21)**
- Algoritmo generador de bloques de tiempo libres (*slots*).
- Cálculo automático de hora final de cita según duración del servicio.
- Prevención estricta de solapamientos mediante **Transacciones en MongoDB Atlas** (`session.withTransaction`).
- Funcionalidad de reprogramación y cancelación idempotente.
- Máquina de estados para citas (`programada` -> `confirmada` -> `completada` / `cancelada`).

### **Fase 4 — Módulo de Agenda Interactiva (US-22 a US-25)**
- Endpoints para vistas de agenda por Día, Semana y Mes con soporte de filtros combinables.
- Preparación de payloads estructurados para la integración directa con **FullCalendar**.

### **Fase 5 — Dashboard de Indicadores (US-26 a US-29)**
- Consultas de agregación en Mongoose utilizando `$match: { tenantId }`.
- Cálculo de volumen total de citas, ranking de servicios más solicitados e identificación de clientes frecuentes (con gestión completa de empates).

### **Fase 6 — Frontend SPA (React + Vite)**
- `AuthContext` para propagar de forma segura el token JWT, `tenantId` y `rol` en las cabeceras HTTP.
- Enrutamiento y protección de vistas según rol de usuario.
- Interfaces CRUD para clientes, profesionales, servicios y citas.
- Integración de **FullCalendar** (`@fullcalendar/react`) con funcionalidad Drag & Drop para reprogramación y reversión automática en caso de error.
- Integración de **SweetAlert2** (cuadros de diálogo) y **Toastify** (notificaciones flotantes).

### **Fase 7 — Verificación, Cobertura y Entrega Final**
- Consolidación de documentación de escenarios Gherkin.
- Ejecución de la suite de pruebas críticas automatizadas.
- Confección del archivo `README.md` final y comprobación integral del flujo.

---

## ⚙️ 4. Supuestos y Parámetros Técnicos

- **Base de Datos:** MongoDB Atlas configurada mediante la variable `MONGODB_URI` en `.env` (gestionable vía **MongoDB Compass**).
- **Granularidad de Horarios:** Slots de tiempo configurables con valor predeterminado de **30 minutos**.
- **Zona Horaria:** Controlada mediante la variable `TZ` (predeterminado `UTC`).
- **Datos Iniciales:** Script Seed habilitado para desplegar el Tenant inicial y su cuenta de Administrador.

---

> 🚀 **Comando de Inicio / Reanudación para OpenCode:**  
> *"Ejecuta el plan a partir de la Fase 0, explicando la arquitectura de cada fase antes de entregar el código completo sin placeholders."*



