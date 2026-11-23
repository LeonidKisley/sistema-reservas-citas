import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
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
import BeautySilhouette from '../components/ui/BeautySilhouette.jsx';
import FloralBloom from '../components/ui/FloralBloom.jsx';
import HomeCarousel from '../components/home/HomeCarousel.jsx';
import HomeNews from '../components/home/HomeNews.jsx';
import heroPhoto from '../assets/news/01-spa-relax.jpg';
import inspirationPhoto from '../assets/news/02-spa-bienestar.jpg';
import { getAppointments } from '../services/appointmentService.js';
import { getProfessionals, getServices } from '../services/catalogService.js';

dayjs.extend(utc);

const GROUPS = ['Tu día a día', 'Tu negocio'];
const LINKS = [
  { to: '/agenda', title: 'Agenda interactiva', description: 'Visualiza tu día, semana o mes y reorganiza citas con facilidad.', icon: CalendarDays, group: GROUPS[0] },
  { to: '/citas', title: 'Gestión de citas', description: 'Registra, reprograma, cancela y actualiza cada reserva.', icon: CalendarCheck2, group: GROUPS[0] },
  { to: '/disponibilidad', title: 'Disponibilidad', description: 'Descubre los horarios libres de cada profesional.', icon: Clock3, group: GROUPS[0] },
  { to: '/clientes', title: 'Clientes', description: 'Conoce a las personas que hacen crecer tu salón.', icon: Users, group: GROUPS[1], roles: ['Administrador', 'Recepcionista'] },
  { to: '/servicios', title: 'Servicios', description: 'Cuida tu catálogo, duraciones y precios.', icon: Sparkles, group: GROUPS[1], roles: ['Administrador', 'Recepcionista'] },
  { to: '/profesionales', title: 'Profesionales', description: 'Organiza el equipo, jornadas y especialidades.', icon: Scissors, group: GROUPS[1], roles: ['Administrador', 'Recepcionista'] }
];

const INSPIRATION = [
  'Un rincón ordenado transmite calma: prepara tu estación antes de abrir.',
  'Confirma con antelación las citas de hoy: reduces ausencias y ganas tranquilidad.',
  'Una recomendación a tiempo convierte una visita en una clienta que regresa.'
];

const EMPTY_HOME = { appointments: [], professionals: [], services: [] };

export default function Home() {
  const { user } = useAuth();
  const [homeData, setHomeData] = useState(EMPTY_HOME);

  useEffect(() => {
    let active = true;
    const today = dayjs.utc();
    Promise.all([
      getAppointments({
        from: today.format('YYYY-MM-DD'),
        to: today.add(1, 'day').format('YYYY-MM-DD'),
        limit: 20
      }),
      getProfessionals(),
      getServices()
    ])
      .then(([appointmentsResponse, professionalsResponse, servicesResponse]) => {
        if (!active) return;
        const appointments = (appointmentsResponse.data?.items || [])
          .filter((item) => !['cancelada', 'no asistió'].includes(item.status));
        setHomeData({
          appointments,
          professionals: professionalsResponse.data || [],
          services: servicesResponse.data || []
        });
      })
      .catch(() => {
        if (active) setHomeData(EMPTY_HOME);
      });
    return () => { active = false; };
  }, []);

  const links = LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));
  const name = user?.firstName || user?.email?.split('@')[0] || 'belleza';
  const salon = user?.tenant?.name || 'tu salón';
  const domain = user?.tenant?.domain || (user?.tenant?.slug ? `${user.tenant.slug}.com` : null);
  const isStaff = ['Administrador', 'Recepcionista'].includes(user?.role);
  const professionalLink = isStaff ? '/profesionales' : '/disponibilidad';
  const serviceLink = isStaff ? '/servicios' : '/disponibilidad';
  const activeProfessionals = homeData.professionals.filter((professional) => professional.active !== false).length;

  const slides = [
    {
      id: 'overview',
      label: 'Tu día en un vistazo',
      content: (
        <div className="home-overview">
          <Link className="home-stat" to="/citas">
            <span className="home-stat__icon"><CalendarCheck2 size={18} strokeWidth={1.75} /></span>
            <strong>{homeData.appointments.length}</strong>
            <span>Citas de hoy</span>
            <small>Ver todas <ArrowRight size={12} strokeWidth={1.75} /></small>
          </Link>
          <Link className="home-stat" to={professionalLink}>
            <span className="home-stat__icon"><Users size={18} strokeWidth={1.75} /></span>
            <strong>{activeProfessionals}</strong>
            <span>Profesionales activos</span>
            <small>{isStaff ? 'Ver equipo' : 'Ver horarios'} <ArrowRight size={12} strokeWidth={1.75} /></small>
          </Link>
          <Link className="home-stat" to={serviceLink}>
            <span className="home-stat__icon"><Sparkles size={18} strokeWidth={1.75} /></span>
            <strong>{homeData.services.length}</strong>
            <span>Servicios disponibles</span>
            <small>{isStaff ? 'Ver catálogo' : 'Ver horarios'} <ArrowRight size={12} strokeWidth={1.75} /></small>
          </Link>
        </div>
      )
    },
    {
      id: 'upcoming',
      label: 'Próximas citas',
      content: (
        <div className="home-appointments">
          {homeData.appointments.length ? (
            <>
              {homeData.appointments.slice(0, 3).map((item) => (
                <div className="home-appointment" key={item.id}>
                  <span className="home-appointment__time">{dayjs.utc(item.start).format('HH:mm')}</span>
                  <span className="home-appointment__info">
                    <strong>{item.serviceName || 'Servicio'}</strong>
                    <small>{item.clientName || item.professionalName || 'Cita reservada'}</small>
                  </span>
                  <span className="badge badge--neutral">{item.status}</span>
                </div>
              ))}
              <Link className="home-carousel__cta" to="/agenda">Ver mi agenda <ArrowRight size={13} strokeWidth={1.75} /></Link>
            </>
          ) : (
            <div className="home-empty">
              <Sparkles size={20} strokeWidth={1.6} />
              <strong>Sin citas por ahora</strong>
              <span>Cuando reserves una cita, aparecerá aquí.</span>
              <Link className="home-carousel__cta" to="/disponibilidad">Consultar horarios <ArrowRight size={13} strokeWidth={1.75} /></Link>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'inspiration',
      label: 'Inspiración de hoy',
      content: (
        <div className="home-inspiration">
          <span className="home-inspiration__photo" style={{ backgroundImage: `url(${inspirationPhoto})` }} aria-hidden="true" />
          <div className="home-inspiration__content">
            <span className="eyebrow">Inspiración de hoy</span>
            <p>{INSPIRATION[dayjs.utc().date() % INSPIRATION.length]}</p>
            <Link className="home-carousel__cta" to={serviceLink}>Explorar servicios <ArrowRight size={13} strokeWidth={1.75} /></Link>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="home-page">
      <span className="home-page__watermark" aria-hidden="true"><FloralBloom /></span>

      <PageHeader
        eyebrow="Espacio de trabajo"
        title={`Hola, ${name}`}
        subtitle={`Bienvenida a ${salon}${domain ? ` · ${domain}` : ''} · Todo lo que necesitas para tu día, en un solo lugar.`}
      />

      <section className="hero-card">
        <span className="hero-card__photo" style={{ backgroundImage: `url(${heroPhoto})` }} aria-hidden="true" />
        <span className="hero-card__pattern" aria-hidden="true" />
        <span className="hero-card__silhouette" aria-hidden="true"><BeautySilhouette /></span>
        <span className="hero-card__bloom" aria-hidden="true"><FloralBloom /></span>
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
      </section>

      <div className="card__header" style={{ marginTop: 26 }}>
        <div>
          <span className="eyebrow">Atajos</span>
          <h2 className="card-title">Tu estudio, al alcance</h2>
        </div>
        <span className="muted" style={{ fontSize: 11 }}>{links.length} secciones disponibles</span>
      </div>

      {GROUPS.map((group) => {
        const items = links.filter((link) => link.group === group);
        if (!items.length) return null;
        return (
          <section className="shortcut-panel" key={group}>
            <div className="shortcut-group__title">
              <span>{group}</span>
              <span className="shortcut-group__line" />
            </div>
            <div className="grid grid-3">
              {items.map(({ to, title, description, icon: Icon }) => (
                <Link key={to} to={to} className="quick-card">
                  <span className="quick-card__number">{String(links.findIndex((link) => link.to === to) + 1).padStart(2, '0')}</span>
                  <span className="quick-card__icon"><Icon size={20} strokeWidth={1.75} /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <span className="quick-card__link">Abrir sección <ArrowRight size={13} strokeWidth={1.75} /></span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <HomeCarousel slides={slides} />
      <HomeNews />
    </div>
  );
}
