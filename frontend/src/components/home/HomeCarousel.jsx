import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HomeCarousel({
  slides = [],
  autoAdvanceMs = 9000,
  eyebrow = 'Tu espacio',
  title = 'Un vistazo a tu día',
  ariaLabel = 'Resumen de tu salón'
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(null);

  const go = useCallback((next) => {
    if (!slides.length) return;
    setIndex(((next % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (!autoAdvanceMs || paused || slides.length < 2) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, autoAdvanceMs);
    return () => window.clearInterval(timer);
  }, [autoAdvanceMs, paused, slides.length]);

  if (!slides.length) return null;

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    }
  };

  const handleTouchStart = (event) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStart.current == null) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(delta) > 45) go(delta < 0 ? index + 1 : index - 1);
    touchStart.current = null;
  };

  return (
    <section
      className="home-carousel"
      role="region"
      aria-roledescription="carrusel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="home-carousel__head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="card-title">{title}</h2>
        </div>
        <div className="home-carousel__controls">
          <button type="button" className="icon-button" onClick={() => go(index - 1)} aria-label="Diapositiva anterior">
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <button type="button" className="icon-button" onClick={() => go(index + 1)} aria-label="Diapositiva siguiente">
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="home-carousel__viewport">
        <div className="home-carousel__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, position) => (
            <div
              className={`home-carousel__slide ${position === index ? 'is-active' : ''}`}
              key={slide.id}
              role="group"
              aria-label={`${position + 1} de ${slides.length}: ${slide.label}`}
              aria-hidden={position !== index}
              style={{ pointerEvents: position === index ? 'auto' : 'none' }}
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      <div className="home-carousel__dots" role="tablist" aria-label="Diapositivas del resumen">
        {slides.map((slide, position) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={position === index}
            aria-label={slide.label}
            className={`home-carousel__dot ${position === index ? 'is-active' : ''}`}
            onClick={() => go(position)}
          />
        ))}
      </div>
    </section>
  );
}
