import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const wrap = (value, size) => ((value % size) + size) % size;

export default function HomeCarousel({
  slides = [],
  autoAdvanceMs = 9000,
  eyebrow = 'Tu espacio',
  title = 'Un vistazo a tu día',
  ariaLabel = 'Resumen de tu salón',
  slidesPerView = 1,
  showProgress = false
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [responsivePerView, setResponsivePerView] = useState(slidesPerView);
  const touchStart = useRef(null);

  useEffect(() => {
    if (slidesPerView < 2) {
      setResponsivePerView(slidesPerView);
      return undefined;
    }
    const wide = window.matchMedia('(min-width: 1101px)');
    const medium = window.matchMedia('(min-width: 701px)');
    const update = () => setResponsivePerView(
      wide.matches ? slidesPerView : medium.matches ? Math.min(2, slidesPerView) : 1
    );
    update();
    wide.addEventListener('change', update);
    medium.addEventListener('change', update);
    return () => {
      wide.removeEventListener('change', update);
      medium.removeEventListener('change', update);
    };
  }, [slidesPerView]);

  const visibleCount = Math.max(1, Math.min(responsivePerView, slides.length || 1));
  const multi = visibleCount > 1;
  const pageSize = multi ? slides.length + 1 : slides.length;
  const renderedSlides = multi ? [...slides, ...slides.slice(0, visibleCount)] : slides;

  const go = useCallback((next) => {
    if (!slides.length) return;
    setIndex(wrap(next, pageSize));
  }, [slides.length, pageSize]);

  useEffect(() => {
    if (!paused) setCycle((value) => value + 1);
  }, [paused]);

  useEffect(() => {
    if (!autoAdvanceMs || paused || slides.length < 2) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setTimeout(() => {
      setIndex((current) => wrap(current + 1, pageSize));
    }, autoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [index, cycle, autoAdvanceMs, paused, slides.length, pageSize]);

  useEffect(() => {
    if (!multi || index !== slides.length) return undefined;
    const timer = window.setTimeout(() => {
      setResetting(true);
      setIndex(0);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setResetting(false));
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [index, multi, slides.length]);

  if (!slides.length) return null;

  const isVisible = (position) => multi
    ? position >= index && position < index + visibleCount
    : position === index;

  const activeDot = multi ? index % slides.length : index;
  const dots = slides.map((slide, position) => ({
    key: slide.id,
    position,
    label: multi ? `Imagen ${position + 1}` : slide.label
  }));

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
      className={`home-carousel ${multi ? 'home-carousel--multi' : ''} ${resetting ? 'home-carousel--resetting' : ''}`}
      style={{
        '--carousel-slide-width': `${100 / visibleCount}%`,
        '--carousel-shift': `${(index * 100) / visibleCount}%`
      }}
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
          <button type="button" className="icon-button" onClick={() => go(index - 1)} aria-label="Imagen anterior">
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <button type="button" className="icon-button" onClick={() => go(index + 1)} aria-label="Imagen siguiente">
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="home-carousel__viewport">
        <div
          className="home-carousel__track"
          style={multi ? undefined : { transform: `translateX(-${index * 100}%)` }}
        >
          {renderedSlides.map((slide, position) => (
            <div
              className={`home-carousel__slide ${isVisible(position) ? 'is-active' : ''}`}
              key={`${slide.id}-${position}`}
              role="group"
              aria-label={`${(position % slides.length) + 1} de ${slides.length}: ${slide.label}`}
              aria-hidden={!isVisible(position)}
              style={{ pointerEvents: isVisible(position) ? 'auto' : 'none' }}
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      {showProgress && (
        <div className="home-carousel__progress" aria-hidden="true">
          <span
            key={`${index}-${cycle}`}
            className="home-carousel__progress-fill"
            style={{
              animationDuration: `${autoAdvanceMs}ms`,
              animationPlayState: paused ? 'paused' : 'running'
            }}
          />
        </div>
      )}

      <div className="home-carousel__dots" role="tablist" aria-label="Imágenes del carrusel">
        {dots.map((dot) => (
          <button
            key={dot.key}
            type="button"
            role="tab"
            aria-selected={dot.position === activeDot}
            aria-label={dot.label}
            className={`home-carousel__dot ${dot.position === activeDot ? 'is-active' : ''}`}
            onClick={() => go(dot.position)}
          />
        ))}
      </div>
    </section>
  );
}
