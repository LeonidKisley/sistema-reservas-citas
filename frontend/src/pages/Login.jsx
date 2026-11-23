import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck2,
  Clock3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';
import BrandLogo from '../components/ui/BrandLogo.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { TextField } from '../components/ui/TextField.jsx';

const PREVIEW = [
  { time: '09:30', period: 'AM', service: 'Ritual de facial', professional: 'Con Valeria', status: 'Confirmada', avatar: 'Valeria Rivas' },
  { time: '11:00', period: 'AM', service: 'Masaje aromático', professional: 'Con Camila', status: 'Programada', avatar: 'Camila Torres' },
  { time: '16:15', period: 'PM', service: 'Manicura premium', professional: 'Con Lucía', status: 'Completada', avatar: 'Lucía Herrera' }
];

const BENEFITS = [
  { icon: CalendarCheck2, title: 'Agenda sin fricciones', text: 'Reservas, recordatorios y disponibilidad en tiempo real.' },
  { icon: Sparkles, title: 'Experiencia de marca', text: 'Cada detalle pensado para estudios que cuidan su imagen.' },
  { icon: BarChart3, title: 'Decisiones claras', text: 'Indicadores de tu negocio en un solo lugar.' }
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    tenant: location.state?.tenant || '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await login(form);
      const role = data?.user?.role ? `, ${data.user.role.toLowerCase()}` : '';
      const salonName = data?.user?.tenant?.name || 'Auraia';
      toast.success(`Bienvenida a ${salonName}${role}`);
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="auth-split">
      <section className="auth-pane auth-pane--form">
        <form className="auth-form" onSubmit={submit}>
          <BrandLogo size="lg" />
          <div className="auth-intro">
            <span className="eyebrow">Bienvenida de vuelta</span>
            <h1>Tu agenda, <em>en armonía.</em></h1>
            <p>Ingresa a tu espacio Auraia y transforma cada reserva en una experiencia memorable.</p>
          </div>

          <TextField
            label="Identificador de tu salón"
            icon={Building2}
            value={form.tenant}
            onChange={change('tenant')}
            placeholder="p. ej. auraria"
            autoComplete="organization"
            required
          />
          <TextField
            label="Correo electrónico"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={change('email')}
            placeholder="nombre@tusalon.com"
            autoComplete="email"
            required
          />
          <TextField
            label="Contraseña"
            icon={LockKeyhole}
            type="password"
            value={form.password}
            onChange={change('password')}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            required
          />

          <button className="button button--block auth-submit" type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Entrar a mi espacio'}
            {!loading && <ArrowRight size={16} strokeWidth={1.75} />}
          </button>

          <div className="auth-alt">
            ¿Aún no tienes cuenta? <Link to="/registro">Crea tu salón en Auraia</Link>
          </div>

          <div className="auth-demo">
            <strong>Acceso de demostración</strong>
            Salón: <code>auraria</code> · Dominio: <code>auraria.com</code>
            <br />
            Administradora: <code>admin@auraria.com / Admin1234</code>
            <br />
            Cliente: <code>cliente@auraria.com / Cliente1234</code>
          </div>
        </form>
      </section>

      <section className="auth-pane auth-pane--showcase" aria-label="Auraia para salones de belleza">
        <span className="showcase-orb" />
        <span className="showcase-orb showcase-orb--top" />
        <div className="showcase-inner">
          <span className="showcase-kicker">Auraia para estudios</span>
          <h2>La belleza también se gestiona con elegancia.</h2>
          <p>Diseñamos cada herramienta para que dediques menos tiempo a organizar y más tiempo a crear momentos que tus clientas recuerden.</p>

          <div className="preview-card">
            <div className="preview-card__top">
              <div>
                <strong>Agenda de hoy</strong>
                <span>3 citas · Sede principal</span>
              </div>
              <span className="badge badge--confirmada">Todo en orden</span>
            </div>
            {PREVIEW.map((item) => (
              <div className="preview-appointment" key={item.time}>
                <span className="preview-time"><small>{item.period}</small>{item.time}</span>
                <Avatar name={item.avatar} size="sm" />
                <span className="preview-appointment__info">
                  <strong>{item.service}</strong>
                  <small>{item.professional}</small>
                </span>
                <span className="badge badge--neutral">{item.status}</span>
              </div>
            ))}
          </div>

          <div className="benefit-list">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div className="benefit" key={title}>
                <span className="benefit__icon"><Icon size={17} strokeWidth={1.75} /></span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </div>
            ))}
          </div>
          <div className="trust-row" style={{ marginTop: 28 }}>
            <span><ShieldCheck size={14} /> Datos protegidos</span>
            <span><Clock3 size={14} /> Alta en minutos</span>
          </div>
        </div>
      </section>
    </div>
  );
}
