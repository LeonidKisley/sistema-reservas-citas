import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Scissors,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import BrandLogo from '../components/ui/BrandLogo.jsx';

const LINKS = [
  { to: '/agenda', title: 'Agenda interactiva', description: 'Visualiza tu día, semana o mes y reorganiza citas con facilidad.', icon: CalendarDays },
  { to: '/citas', title: 'Gestión de citas', description: 'Registra, reprograma, cancela y actualiza cada reserva.', icon: CalendarCheck2 },
  { to: '/disponibilidad', title: 'Disponibilidad', description: 'Descubre los horarios libres de cada profesional.', icon: Clock3 },
  { to: '/clientes', title: 'Clientes', description: 'Conoce a las personas que hacen crecer tu salón.', icon: Users, roles: ['Administrador', 'Recepcionista'] },
  { to: '/servicios', title: 'Servicios', description: 'Cuida tu catálogo, duraciones y precios.', icon: Sparkles, roles: ['Administrador', 'Recepcionista'] },
  { to: '/profesionales', title: 'Profesionales', description: 'Organiza el equipo, jornadas y especialidades.', icon: Scissors, roles: ['Administrador', 'Recepcionista'] }
];

export default function Home() {
  const { user } = useAuth();
  const links = LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));
  const name = user?.firstName || user?.email?.split('@')[0] || 'belleza';
  const salon = user?.tenant?.name || 'tu salón';
  const domain = user?.tenant?.domain || (user?.tenant?.slug ? `${user.tenant.slug}.com` : null);

  return (
    <>
      <PageHeader
        eyebrow="Espacio de trabajo"
        title={`Hola, ${name}`}
        subtitle={`Bienvenida a ${salon}${domain ? ` · ${domain}` : ''} · Todo lo que necesitas para tu día, en un solo lugar.`}
      />

      <section className="hero-card">
        <div className="hero-card__copy">
          <span className="eyebrow">Auraia · Beauty &amp; Spa Management</span>
          <h2>Cada cita es una oportunidad de <em>crear belleza.</em></h2>
          <p>Organiza tu agenda con intención, conoce a tu equipo y ofrece una experiencia tan especial como tu salón.</p>
          <div className="hero-card__actions">
            <Link className="button" to="/agenda">
              Ver mi agenda <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
            <Link className="button button--ghost" to="/disponibilidad">Consultar horarios</Link>
          </div>
        </div>
        <span className="hero-card__ornament"><BrandLogo size="lg" showText={false} /></span>
      </section>

      <div className="card__header" style={{ marginTop: 26 }}>
        <div>
          <span className="eyebrow">Atajos</span>
          <h2 className="card-title">Tu estudio, al alcance</h2>
        </div>
        <span className="muted" style={{ fontSize: 11 }}>{links.length} secciones disponibles</span>
      </div>
      <div className="grid grid-3">
        {links.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="quick-card">
            <span className="quick-card__icon"><Icon size={20} strokeWidth={1.75} /></span>
            <h3>{title}</h3>
            <p>{description}</p>
            <span className="quick-card__link">Abrir sección <ArrowRight size={13} strokeWidth={1.75} /></span>
          </Link>
        ))}
      </div>
    </>
  );
}
