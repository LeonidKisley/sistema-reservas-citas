import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/home', label: 'Inicio', icon: '🏠', roles: null },
  { to: '/agenda', label: 'Agenda', icon: '📅', roles: null },
  { to: '/citas', label: 'Citas', icon: '🧾', roles: null },
  { to: '/disponibilidad', label: 'Disponibilidad', icon: '⏰', roles: null },
  { to: '/clientes', label: 'Clientes', icon: '👥', roles: ['Administrador', 'Recepcionista'] },
  { to: '/profesionales', label: 'Profesionales', icon: '🧑‍⚕️', roles: ['Administrador', 'Recepcionista'] },
  { to: '/servicios', label: 'Servicios', icon: '🛠️', roles: ['Administrador', 'Recepcionista'] },
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['Administrador'] },
  { to: '/usuarios', label: 'Usuarios', icon: '🔐', roles: ['Administrador'] },
  { to: '/perfil', label: 'Mi perfil', icon: '⚙️', roles: null }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Se invalidará tu token de acceso.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    await logout();
    navigate('/login', { replace: true });
  };

  const visible = NAV.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">RC</span>
          <div>
            <strong>Reservas</strong>
            <small>SaaS Multiinquilino</small>
          </div>
        </div>
        <nav>
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>Tenant: {user?.tenant?.slug}</small>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-label="Menú">☰</button>
          <div className="topbar-spacer" />
          <div className="user-chip">
            <span className="avatar">{(user?.email || '?')[0].toUpperCase()}</span>
            <div>
              <strong>{user?.email}</strong>
              <small>{user?.role}</small>
            </div>
          </div>
          <button className="button ghost" onClick={handleLogout}>Salir</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
