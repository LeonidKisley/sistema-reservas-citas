import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tenant: user?.tenant?.slug || '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await login(form);
      toast.success(`Bienvenido, ${data.user.role}`);
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h1>Iniciar sesión</h1>
        <p>Ingresa a tu organización para gestionar tus citas.</p>

        <div className="field">
          <label>Organización (slug o identificador)</label>
          <input value={form.tenant} onChange={change('tenant')} required placeholder="demo" />
        </div>
        <div className="field">
          <label>Correo electrónico</label>
          <input type="email" value={form.email} onChange={change('email')} required placeholder="admin@demo.local" />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={form.password} onChange={change('password')} required placeholder="••••••••" />
        </div>

        <button className="button" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <div className="auth-links">
          ¿Eres cliente? <a href="/registro">Regístrate aquí</a>
        </div>

        <div className="demo-note">
          <strong>Datos de prueba del seed:</strong><br />
          Tenant: <code>demo</code> · Admin: <code>admin@demo.local / Admin1234</code><br />
          Cliente: <code>cliente@demo.local / Cliente1234</code>
        </div>
      </form>
    </div>
  );
}
