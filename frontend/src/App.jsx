import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import RegisterClient from './pages/RegisterClient.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import Availability from './pages/Availability.jsx';
import Appointments from './pages/Appointments.jsx';
import Agenda from './pages/Agenda.jsx';
import Clients from './pages/Clients.jsx';
import Professionals from './pages/Professionals.jsx';
import Services from './pages/Services.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import { useAuth } from './context/AuthContext.jsx';

const ADMIN = 'Administrador';
const RECEPTIONIST = 'Recepcionista';

export default function App() {
  const { ready } = useAuth();
  if (!ready) {
    return (
      <div className="content">
        <div className="content-inner">
          <div className="card"><p className="muted">Cargando sesión…</p></div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<RegisterClient />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/disponibilidad" element={<Availability />} />
          <Route path="/citas" element={<Appointments />} />
          <Route path="/agenda" element={<Agenda />} />

          <Route element={<ProtectedRoute roles={[ADMIN, RECEPTIONIST]} />}>
            <Route path="/clientes" element={<Clients />} />
            <Route path="/profesionales" element={<Professionals />} />
            <Route path="/servicios" element={<Services />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ADMIN]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/usuarios" element={<Users />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
