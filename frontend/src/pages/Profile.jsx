import { useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.patch('/auth/password', form);
      toast.success('Contraseña actualizada correctamente');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Mi perfil" subtitle="Información de la sesión activa y cambio de contraseña" />
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">Datos de la cuenta</div>
          <p><strong>Correo:</strong> {user?.email}</p>
          <p><strong>Rol:</strong> {user?.role}</p>
          <p><strong>Organización:</strong> {user?.tenant?.name} ({user?.tenant?.slug})</p>
          <p><strong>ID de tenant:</strong> <code>{user?.tenantId}</code></p>
        </div>
        <div className="card">
          <div className="card-title">Actualizar contraseña</div>
          <form onSubmit={submit}>
            <div className="field"><label>Contraseña actual</label><input type="password" value={form.currentPassword} onChange={change('currentPassword')} required /></div>
            <div className="field"><label>Nueva contraseña</label><input type="password" value={form.newPassword} onChange={change('newPassword')} required minLength={8} /></div>
            <div className="field"><label>Confirmar nueva contraseña</label><input type="password" value={form.confirmPassword} onChange={change('confirmPassword')} required minLength={8} /></div>
            <button className="button" disabled={loading}>{loading ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        </div>
      </div>
    </>
  );
}
