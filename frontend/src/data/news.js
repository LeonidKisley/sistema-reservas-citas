const imageModules = import.meta.glob('../assets/news/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default'
});

const COPY = {
  '01-spa-relax': {
    title: 'Rituales de relax',
    description: 'Nuevos tratamientos para desconectar y cuidarte.',
    alt: 'Clienta relajándose con una mascarilla en una camilla de spa'
  },
  '02-spa-bienestar': {
    title: 'Spa y bienestar',
    description: 'Espacios diseñados para que cada visita sea un respiro.',
    alt: 'Rincón de spa con elementos de bienestar y tonos suaves'
  },
  '03-cuidado-facial': {
    title: 'Cuidado facial',
    description: 'Rutinas pensadas para devolverle luz a tu piel.',
    alt: 'Tratamiento facial de belleza con productos de cuidado'
  },
  '04-manicura': {
    title: 'Manicura y diseño',
    description: 'Detalles que se notan: uñas cuidadas hasta en el último gesto.',
    alt: 'Manos con manicura cuidada y esmaltes en tonos pastel'
  },
  '05-cosmetica-rosa': {
    title: 'Cosmética en tonos rosa',
    description: 'Una selección de productos para consentir a tus clientas.',
    alt: 'Productos de cosmética en tonos rosa suave'
  }
};

const prettify = (key) => key
  .replace(/[-_]+/g, ' ')
  .replace(/^\d+\s*/, '')
  .trim()
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const newsSlides = Object.entries(imageModules)
  .sort(([first], [second]) => first.localeCompare(second, 'es', { numeric: true }))
  .map(([path, url]) => {
    const fileName = path.split('/').pop();
    const key = fileName.replace(/\.[^.]+$/, '');
    const copy = COPY[key] || {};
    const title = copy.title || prettify(key);
    return {
      id: fileName,
      image: url,
      title,
      description: copy.description || 'Descubre lo nuevo que preparamos para tu salón.',
      alt: copy.alt || title
    };
  });
