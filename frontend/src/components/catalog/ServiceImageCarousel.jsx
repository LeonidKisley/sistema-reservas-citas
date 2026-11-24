import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const ROTATE_MS = 1500;

export default function ServiceImageCarousel({ images = [], name = 'Servicio' }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const count = images.length;
  const signature = images.join('|');

  useEffect(() => {
    setIndex(0);
    setCycle((value) => value + 1);
  }, [signature]);

  useEffect(() => {
    if (count < 2 || paused || typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % count);
      setCycle((value) => value + 1);
    }, ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [index, cycle, count, paused]);

  if (!count) {
    return (
      <div className="service-card__media service-card__media--empty" aria-label={`Sin fotos para ${name}`}>
        <Sparkles size={26} strokeWidth={1.5} />
        <span>Próximamente</span>
      </div>
    );
  }

  const goTo = (position) => {
    setIndex(position % count);
    setCycle((value) => value + 1);
  };

  return (
    <div
      className="service-card__media"
      role="group"
      aria-roledescription="carrusel"
      aria-label={`Fotos de ${name}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {images.map((src, position) => (
        <img
          key={src}
          className={`service-card__image ${position === index ? 'is-active' : ''}`}
          src={src}
          alt={`${name} · imagen ${position + 1} de ${count}`}
          loading={position === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {count > 1 && (
        <>
          <div className="service-card__dots" role="tablist" aria-label={`Imágenes de ${name}`}>
            {images.map((src, position) => (
              <button
                key={src}
                type="button"
                role="tab"
                className={`service-card__dot ${position === index ? 'is-active' : ''}`}
                aria-selected={position === index}
                aria-label={`Ver imagen ${position + 1} de ${count}`}
                onClick={() => goTo(position)}
              />
            ))}
          </div>
          <div className="service-card__progress" aria-hidden="true">
            <span
              key={`${index}-${cycle}`}
              className="service-card__progress-fill"
              style={{ animationDuration: `${ROTATE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
