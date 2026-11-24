import { ArrowRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryLabel, categoryStyle } from '../../data/serviceCategories.js';
import { serviceImagesFor } from '../../data/serviceImages.js';
import { formatPrice } from '../../utils/format.js';
import ServiceImageCarousel from './ServiceImageCarousel.jsx';

export default function ServiceCard({ service }) {
  const uploaded = (service.images || []).map((image) => image.url).filter(Boolean);
  const images = uploaded.length ? uploaded : serviceImagesFor(service.name);

  return (
    <article className="service-card">
      <div className="service-card__media-wrap">
        <ServiceImageCarousel images={images} name={service.name} />
        {service.trending && <span className="catalog-trending">🔥 En tendencia</span>}
      </div>
      <div className="service-card__body">
        <span className="catalog-chip" style={categoryStyle(service.category)}>{categoryLabel(service.category)}</span>
        <h3 className="service-card__name">{service.name}</h3>
        <p className="service-card__description">
          {service.description || 'Cuéntanos lo que necesitas y lo adaptamos para ti.'}
        </p>
        <div className="service-card__meta">
          <span className="service-card__price">{formatPrice(service.price)}</span>
          <span className="service-card__duration">
            <Clock3 size={13} strokeWidth={1.75} /> {service.durationMinutes} min
          </span>
        </div>
        <Link className="service-card__cta" to={`/citas?serviceId=${encodeURIComponent(service.id)}`}>
          Reservar <ArrowRight size={14} strokeWidth={1.75} />
        </Link>
      </div>
    </article>
  );
}
