# Imágenes del carrusel «Noticias y novedades»

Aquí viven las fotos optimizadas que se muestran en `/home` (carrusel de novedades, hero e inspiración) y en el panel visual de login/registro.

## Imágenes incluidas

| Archivo | Uso |
|---|---|
| `01-spa-relax.jpg` | Novedades + foto tenue del hero de `/home` |
| `02-spa-bienestar.jpg` | Novedades + fondo de «Inspiración de hoy» |
| `03-cuidado-facial.jpg` | Novedades |
| `04-manicura.jpg` | Novedades + tarjeta de foto en registro |
| `05-cosmetica-rosa.jpg` | Novedades + tarjeta de foto en login |

Son copias reducidas (máx. 1600 px, calidad JPEG 80) de los originales que están en `frontend/src/assets/`. Los originales no se modificaron.

## Agregar o cambiar fotos

El archivo `src/data/news.js` detecta automáticamente todos los `.jpg`, `.jpeg`, `.png`, `.webp` y `.avif` de esta carpeta y los ordena por nombre. No hay que importarlos a mano: Vite los incluye al compilar.

- El número al inicio define el orden (`01-`, `02-`, …).
- Para cambiar título, descripción y texto alternativo, edita el objeto `COPY` en `src/data/news.js`. La clave es el nombre del archivo sin extensión.
- Si un archivo nuevo no está en `COPY`, se genera un título a partir de su nombre.
- Si la carpeta queda vacía, el carrusel muestra un estado «Próximamente» en vez de romperse.

## Consejos

- Usá imágenes horizontales (16:9 o 4:3) para que se vean bien en el carrusel.
- Pesos recomendados: menos de 250 KB por foto para no frenar la carga.
- Si agregas fotos con `npm run dev` en marcha, reinicia el servidor para que Vite las detecte.
