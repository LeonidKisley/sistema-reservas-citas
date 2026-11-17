import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';

export default function RegisterClient() {
  const { registerClient } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    tenant: '', firstName: '', lastName: '', document: '', email: '', phone: '', password: ''
  });
  const [loading, setLoading] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await registerClient(form);
      toast.success('Registro exitoso. Ahora puedes iniciar sesión.');
      navigate('/login');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h1>Crear cuenta de cliente</h1>
        <p>Regístrate para consultar disponibilidad y reservar citas.</p>

        <div className="field">
          <label>Organización</label>
          <input value={form.tenant} onChange={change('tenant')} required placeholder="demo" />
        </div>
        <div className="form-row">
          <div className="field"><label>Nombres</label><input value={form.firstName} onChange={change('firstName')} required /></div>
          <div className="field"><label>Apellidos</label><input value={form.lastName} onChange={change('lastName')} required /></div>
        </div>
        <div className="field"><label>Documento</label><input value={form.document} onChange={change('document')} required /></div>
        <div className="field"><label>Correo electrónico</label><input type="email" value={form.email} onChange={change('email')} required /></div>
        <div className="field"><label>Teléfono (opcional)</label><input value={form.phone} onChange={change('phone')} /></div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={form.password} onChange={change('password')} required minLength={8} />
          <small className="error-text">Mínimo 8 caracteres, con mayúscula, minúscula y número.</small>
        </div>

        <button className="button" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Registrando…' : 'Registrarme'}
        </button>
        <div className="auth-links">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></div>
      </form>
    </div>
  );
}
