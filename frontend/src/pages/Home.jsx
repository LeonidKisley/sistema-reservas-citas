import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';

const LINKS = [
  { to: '/agenda', title: 'Agenda interactiva', description: 'Vistas diaria, semanal y mensual con FullCalendar.', icon: '📅' },
  { to: '/citas', title: 'Gestión de citas', description: 'Registra, reprograma, cancela y cambia estados.', icon: '🧾' },
  { to: '/disponibilidad', title: 'Consultar disponibilidad', description: 'Bloques horarios libres por profesional y fecha.', icon: '⏰' },
  { to: '/clientes', title: 'Clientes', description: 'Catálogo de clientes del tenant.', icon: '👥', roles: ['Administrador', 'Recepcionista'] },
  { to: '/dashboard', title: 'Dashboard', description: 'Indicadores y rankings del negocio.', icon: '📊', roles: ['Administrador'] }
];

export default function Home() {
  const { user } = useAuth();
  const links = LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));

  return (
    <>
      <PageHeader
        title={`Hola, ${user?.email}`}
        subtitle={`Organización: ${user?.tenant?.name} · Rol: ${user?.role}`}
      />
      <div className="grid grid-3">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="card" style={{ transition: 'transform .15s' }}>
            <div style={{ fontSize: 28 }}>{link.icon}</div>
            <h3 style={{ margin: '12px 0 6px' }}>{link.title}</h3>
            <p style={{ color: 'var(--muted)', margin: 0 }}>{link.description}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
