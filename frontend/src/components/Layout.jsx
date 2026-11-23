import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  BarChart3,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import BrandLogo from './ui/BrandLogo.jsx';
import Avatar, { initialsOf } from './ui/Avatar.jsx';

const NAV = [
  { to: '/home', label: 'Inicio', icon: LayoutDashboard, group: 'Reservas' },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, group: 'Reservas' },
  { to: '/citas', label: 'Citas', icon: CalendarCheck2, group: 'Reservas' },
  { to: '/disponibilidad', label: 'Disponibilidad', icon: Clock3, group: 'Reservas' },
  { to: '/clientes', label: 'Clientes', icon: Users, group: 'Negocio', roles: ['Administrador', 'Recepcionista'] },
  { to: '/profesionales', label: 'Profesionales', icon: Scissors, group: 'Negocio', roles: ['Administrador', 'Recepcionista'] },
  { to: '/servicios', label: 'Servicios', icon: Sparkles, group: 'Negocio', roles: ['Administrador', 'Recepcionista'] },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3, group: 'Negocio', roles: ['Administrador'] },
  { to: '/usuarios', label: 'Usuarios', icon: ShieldCheck, group: 'Negocio', roles: ['Administrador'] },
  { to: '/perfil', label: 'Mi perfil', icon: UserRound, group: 'Mi cuenta' }
];

const GROUPS = ['Reservas', 'Negocio', 'Mi cuenta'];
const PLAN_LABELS = { basico: 'Plan Esencial', premium: 'Plan Premium', pro: 'Plan Profesional' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const salonName = user?.tenant?.name || 'Mi salón';
  const slug = user?.tenant?.slug || 'auraia';
  const plan = PLAN_LABELS[user?.tenant?.plan] || user?.tenant?.plan || 'Plan Esencial';

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Podrás volver a entrar cuando quieras.',
      icon: 'question',
      iconColor: '#C26476',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Quedarse',
      confirmButtonColor: '#C26476',
      cancelButtonColor: '#A99A9F',
      reverseButtons: true
    });
    if (!result.isConfirmed) return;
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      {open && <button type="button" className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar__brand">
          <BrandLogo inverse showTagline />
        </div>
        <nav aria-label="Navegación principal">
          {GROUPS.map((group) => {
            const items = NAV.filter((item) => item.group === group && (!item.roles || item.roles.includes(user?.role)));
            if (!items.length) return null;
            return (
              <div className="nav-group" key={group}>
                <div className="nav-group__label">{group}</div>
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={17} strokeWidth={1.75} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          <div className="salon-card">
            <Avatar name={salonName} tone="plum" />
            <div className="salon-card__info">
              <span className="salon-card__name" title={salonName}>{salonName}</span>
              <span className="salon-card__meta">{plan} · {slug}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button type="button" className="menu-button" onClick={() => setOpen((value) => !value)} aria-label="Abrir menú">
            <Menu size={19} strokeWidth={1.75} />
          </button>
          <div className="tenant-chip">
            <Avatar name={salonName} size="sm" />
            <span className="tenant-chip__info">
              <strong>{salonName}</strong>
              <small>Sede principal · {slug}</small>
            </span>
          </div>
          <div className="header-actions">
            <span className="header-date">
              <CalendarClock size={15} strokeWidth={1.75} />
              {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </span>
            <span className="header-divider" />
            <NavLink to="/agenda" className="icon-button" title="Ir a la agenda" aria-label="Ir a la agenda">
              <CalendarDays size={18} strokeWidth={1.75} />
            </NavLink>
            <div className="user-chip">
              <span className="avatar avatar--muted">{initialsOf(user?.email || 'A')}</span>
              <span className="user-chip__info">
                <strong>{user?.email || 'Invitado'}</strong>
                <small>{user?.role || 'Auraia'}</small>
              </span>
            </div>
            <button type="button" className="icon-button" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </div>
        </header>
        <main className="content">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
