import { useEffect, useState } from 'react';
import { Check, Sparkles, UserRound } from 'lucide-react';
import Avatar from './ui/Avatar.jsx';
import { errorMessage } from '../services/api.js';
import { getRecommendedProfessionals } from '../services/appointmentService.js';

export default function RecommendedProfessionals({ date, time, serviceId, serviceName, selectedId, onSelect, compact = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!date || !time) {
      setItems([]);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');
    const params = { date, time };
    if (serviceId) params.serviceId = serviceId;

    getRecommendedProfessionals(params)
      .then((response) => {
        if (active) setItems(response.data?.professionals || []);
      })
      .catch((requestError) => {
        if (!active) return;
        setItems([]);
        setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [date, time, serviceId]);

  if (!date || !time) return null;

  return (
    <div className={compact ? 'recommendations section-spaced' : 'recommendations card section-spaced'}>
      <div className="recommendations__head">
        <div>
          <span className="eyebrow">Recomendados para ti</span>
          <div className="card-title" style={{ marginTop: 4 }}>
            Profesionales disponibles {serviceName ? `para ${serviceName} ` : ''}a las {time}
          </div>
        </div>
        {!loading && <span className="badge">{items.length} disponibles</span>}
      </div>

      {loading ? (
        <p className="muted" style={{ fontSize: 12 }}>Buscando profesionales para ese horario…</p>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : items.length ? (
        <div className="rec-list">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`rec-card ${selectedId === item.id ? 'rec-card--selected' : ''}`}
              onClick={() => onSelect?.(item)}
            >
              <Avatar name={item.name} size="sm" />
              <span className="rec-card__info">
                <strong className="rec-card__name">{item.name}</strong>
                <span className="rec-card__meta">{item.specialty}</span>
                <span className="rec-card__score">
                  {index < 3 ? '★ Recomendado · ' : ''}{item.reason}
                </span>
              </span>
              {selectedId === item.id ? <Check size={16} strokeWidth={2} /> : <UserRound size={15} strokeWidth={1.75} />}
            </button>
          ))}
        </div>
      ) : (
        <p className="empty">No hay profesionales libres en ese horario. Prueba con otra hora.</p>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
        <Sparkles size={12} strokeWidth={1.75} /> Ordenados por menor carga de trabajo ese día.
      </p>
    </div>
  );
}
