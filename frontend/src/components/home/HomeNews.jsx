import { Sparkles } from 'lucide-react';
import HomeCarousel from './HomeCarousel.jsx';
import { newsSlides } from '../../data/news.js';

export default function HomeNews() {
  if (!newsSlides.length) {
    return (
      <section className="home-carousel home-news--empty" aria-label="Noticias y novedades">
        <div className="home-carousel__head">
          <div>
            <span className="eyebrow">Inspiración</span>
            <h2 className="card-title">Noticias y novedades</h2>
          </div>
        </div>
        <div className="home-news__empty">
          <Sparkles size={22} strokeWidth={1.6} />
          <strong>Próximamente compartiremos novedades</strong>
          <span>Inspiración, tendencias y detalles pensados para tu salón.</span>
        </div>
      </section>
    );
  }

  const total = String(newsSlides.length).padStart(2, '0');

  const slides = newsSlides.map((slide, position) => ({
    id: slide.id,
    label: slide.title,
    content: (
      <article className="home-news__slide">
        <img className="home-news__image" src={slide.image} alt={slide.alt} loading="lazy" />
        <span className="home-news__counter" aria-hidden="true">
          {String(position + 1).padStart(2, '0')} / {total}
        </span>
        <div className="home-news__overlay">
          <span className="eyebrow">Novedades</span>
          <h3>{slide.title}</h3>
          <p>{slide.description}</p>
        </div>
      </article>
    )
  }));

  return (
    <HomeCarousel
      slides={slides}
      eyebrow="Inspiración"
      title="Noticias y novedades"
      ariaLabel="Noticias y novedades de Auraia"
      autoAdvanceMs={6500}
    />
  );
}
