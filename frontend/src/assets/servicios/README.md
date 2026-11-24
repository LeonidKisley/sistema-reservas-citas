# Imágenes del catálogo de servicios

Cada servicio de la base de datos tiene una carpeta aquí. El nombre de la carpeta es el
**nombre del servicio normalizado** (sin tildes, sin `ñ`, en minúsculas y con guiones).

## Convenio

- Una carpeta por servicio: `assets/servicios/<slug-del-servicio>/`.
- Dos imágenes por carpeta, numeradas `01.jpg` y `02.jpg` (también se aceptan `.jpeg`, `.png`, `.webp` y `.avif`).
- Se muestran en orden alfabético de nombre de archivo y cambian cada 1,5 segundos.
- Si hay una sola foto, se muestra quieta. Si no hay carpeta, la tarjeta muestra un placeholder floral.

## Servicios sembrados

| Servicio en la BD | Carpeta |
|---|---|
| Corte de cabello | `corte-de-cabello` |
| Coloración | `coloracion` |
| Mechas y reflejos | `mechas-y-reflejos` |
| Tratamientos capilares | `tratamientos-capilares` |
| Manicura | `manicura` |
| Pedicura | `pedicura` |
| Uñas y diseño | `unas-y-diseno` |
| Maquillaje profesional | `maquillaje-profesional` |
| Tratamientos faciales | `tratamientos-faciales` |
| Masajes y relax | `masajes-y-relax` |
| Depilación | `depilacion` |
| Microblading | `microblading` |
| Spa y bienestar | `spa-y-bienestar` |
| Estilismo y peinado | `estilismo-y-peinado` |

## Agregar fotos

1. Entrar en la carpeta del servicio.
2. Copiar `01.jpg` y `02.jpg` (recomendado: 1200×800 px, menos de 200 KB cada una).
3. Reiniciar `npm run dev` para que Vite detecte los archivos nuevos.

No hay que editar imports ni código: `src/data/serviceImages.js` descubre las imágenes automáticamente.

Si se renombra un servicio en el panel de gestión, hay que renombrar también su carpeta para que vuelva a coincidir.
