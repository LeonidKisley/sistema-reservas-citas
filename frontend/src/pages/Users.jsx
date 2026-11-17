import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { createUser, getUsers } from '../services/catalogService.js';
import { errorMessage } from '../services/api.js';

const EMPTY = { email: '', password: '', role: 'Recepcionista', firstName: '', lastName: '', specialty: '' };

export default function Users() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getUsers();
      setItems(response.data);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await createUser(form);
      toast.success('Usuario creado correctamente');
      setOpen(false);
      setForm(EMPTY);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Cuentas del tenant y control de roles (RBAC)" actions={<button className="button" onClick={() => setOpen(true)}>+ Nuevo usuario</button>} />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Correo</th><th>Rol</th><th>Profesional</th><th>Estado</th><th>Creado</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.email}</strong></td>
                <td>{item.role}</td>
                <td>{item.professionalId || '—'}</td>
                <td><span className={`badge ${item.active ? 'badge-confirmada' : 'badge-cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="5" className="empty">No hay usuarios</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Nuevo usuario" onClose={() => setOpen(false)}>
          <form onSubmit={save}>
            <div className="field"><label>Correo</label><input type="email" value={form.email} onChange={change('email')} required /></div>
            <div className="field"><label>Contraseña</label><input type="password" value={form.password} onChange={change('password')} required minLength={8} /></div>
            <div className="field">
              <label>Rol</label>
              <select value={form.role} onChange={change('role')}>
                <option value="Recepcionista">Recepcionista</option>
                <option value="Administrador">Administrador</option>
                <option value="Profesional">Profesional</option>
              </select>
            </div>
            <div className="form-row">
              <div className="field"><label>Nombres</label><input value={form.firstName} onChange={change('firstName')} required /></div>
              <div className="field"><label>Apellidos</label><input value={form.lastName} onChange={change('lastName')} required /></div>
            </div>
            {form.role === 'Profesional' && (
              <div className="field"><label>Especialidad</label><input value={form.specialty} onChange={change('specialty')} /></div>
            )}
            <div className="form-actions">
              <button type="button" className="button ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="button" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
