import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader from '../components/PageHeader.jsx';
import ServiceCard from '../components/catalog/ServiceCard.jsx';
import { categoryLabel, categoryStyle, SERVICE_CATEGORIES } from '../data/serviceCategories.js';
import { errorMessage } from '../services/api.js';
import { getServices } from '../services/catalogService.js';

export default function Catalogo() {
  const [services, setServices] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('todos');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getServices()
      .then((response) => {
        if (!active) return;
        const activeServices = (response.data || [])
          .filter((item) => item.active !== false)
          .sort((first, second) => first.name.localeCompare(second.name, 'es'));
        setServices(activeServices);
      })
      .catch((error) => {
        if (active) toast.error(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    return services
      .filter((item) => category === 'todos' || (item.category || 'otros') === category)
      .filter((item) => !trendingOnly || item.trending)
      .filter((item) => !needle || (
        `${item.name} ${item.description || ''} ${categoryLabel(item.category)}`
          .toLocaleLowerCase('es')
          .includes(needle)
      ))
      .sort((first, second) => (
        Number(Boolean(second.trending)) - Number(Boolean(first.trending))
        || (first.order ?? 0) - (second.order ?? 0)
        || first.name.localeCompare(second.name, 'es')
      ));
  }, [services, query, category, trendingOnly]);

  return (
    <>
      <PageHeader
        eyebrow="Experiencias"
        title="Nuestros servicios"
        subtitle="Descubre lo que podemos hacer por ti y elige el momento que mejor te quede."
      />
      <div className="card catalog-filters">
        <button
          type="button"
          className={`catalog-chip ${category === 'todos' ? 'is-active' : ''}`}
          aria-pressed={category === 'todos'}
          onClick={() => setCategory('todos')}
        >
          Todos
        </button>
        {SERVICE_CATEGORIES.map((item) => (
          <button
            key={item.slug}
            type="button"
            className={`catalog-chip ${category === item.slug ? 'is-active' : ''}`}
            style={categoryStyle(item.slug)}
            aria-pressed={category === item.slug}
            onClick={() => setCategory(item.slug)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={`catalog-chip catalog-chip--trending ${trendingOnly ? 'is-active' : ''}`}
          aria-pressed={trendingOnly}
          onClick={() => setTrendingOnly((current) => !current)}
        >
          🔥 Solo tendencias
        </button>
      </div>
      <div className="card catalog-toolbar">
        <label className="input-shell catalog-toolbar__search">
          <Search size={17} strokeWidth={1.75} className="input-shell__icon" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar un servicio…"
            aria-label="Buscar un servicio"
          />
        </label>
        <span className="badge badge--soft">{filtered.length} servicios</span>
      </div>

      {loading ? (
        <div className="card empty">Cargando servicios…</div>
      ) : filtered.length ? (
        <div className="catalog-grid">
          {filtered.map((service) => <ServiceCard key={service.id} service={service} />)}
        </div>
      ) : (
        <div className="card empty">No encontramos servicios con ese nombre. Prueba con otra búsqueda.</div>
      )}
    </>
  );
}
