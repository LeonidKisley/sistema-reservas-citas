# Credenciales de acceso (datos de prueba)

Pega estos valores en el login: **Identificador de tu salón**, **Correo electrónico** y **Contraseña**. El identificador acepta `auraria`, `auraria.com` o `AUR-001` (sin distinción de mayúsculas).

## Administradora del salón

```text
Salón:    auraria
Email:    admin@auraria.com
Password: Admin1234
```

## Cliente

```text
Salón:    auraria
Email:    cliente@auraria.com
Password: Cliente1234
```

## Profesionales (todos con cuenta y contraseña)

```text
Password: Profesional1234
```

```text
profesional@auraria.com
lucia.fernandez@auraria.com
marta.gomez@auraria.com
sofia.ramirez@auraria.com
elena.torres@auraria.com
carolina.diaz@auraria.com
paula.navarro@auraria.com
andrea.molina@auraria.com
natalia.rivas@auraria.com
gabriela.serrano@auraria.com
valeria.cuesta@auraria.com
jimena.lopez@auraria.com
rocio.perez@auraria.com
```

> Los 13 profesionales tienen jornada de lunes a sábado y solo los servicios que ofrecen, por lo que al elegir un servicio se recomiendan primero quienes tienen menor carga.

## Cómo probar la recomendación

1. Inicia sesión como cliente (`cliente@auraria.com` / `Cliente1234`).
2. En **Nueva cita** o **Citas**, elige primero el servicio: verás los profesionales recomendados, luego los disponibles.
3. En **Disponibilidad**, selecciona fecha, servicio y una hora, por ejemplo `10:00`.

## Notas

- Cada salón usa su propio dominio `<nombrenegocio>.com`; para el seed es `auraria.com` (`SEED_TENANT_NAME` / `SEED_TENANT_SLUG` lo cambian).
- Para cargar los datos: `cd backend` y luego `npm run seed`. Si existe el tenant `demo`, se migra a `Auraria` y se actualizan los correos al nuevo dominio.
- Frontend: `http://localhost:5173` · API: `http://localhost:4000/api`.
