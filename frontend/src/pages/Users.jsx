import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, ShieldCheck, UserRound } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import CustomSelect from '../components/ui/CustomSelect.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { createUser, getUsers } from '../services/catalogService.js';
import { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  NAME_INPUT_PATTERN,
  composeEmail,
  isValidEmailLocal,
  isValidPersonName
} from '../utils/validation.js';

const EMPTY = { email: '', password: '', role: 'Recepcionista', firstName: '', lastName: '', specialty: '' };
const ROLES = [
  { value: 'Recepcionista', label: 'Recepcionista', description: 'Gestión de agenda y clientes' },
  { value: 'Administrador', label: 'Administrador', description: 'Acceso completo al salón' },
  { value: 'Profesional', label: 'Profesional', description: 'Atención de citas asignadas' }
];

export default function Users() {
  const { user } = useAuth();
  const domain = user?.tenant?.domain || '';
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getUsers();
      setItems(response.data || []);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (!isValidPersonName(form.firstName) || !isValidPersonName(form.lastName)) {
      toast.error('Los nombres y apellidos solo pueden contener letras y espacios');
      return;
    }
    if (!isValidEmailLocal(form.email)) {
      toast.error('El correo electrónico no es válido');
      return;
    }
    setLoading(true);
    try {
      await createUser({ ...form, email: composeEmail(form.email, domain) });
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
      <PageHeader
        eyebrow="Negocio"
        title="Usuarios"
        subtitle="Cuentas del salón y control de accesos"
        actions={<button className="button" onClick={() => setOpen(true)}><Plus size={16} strokeWidth={1.75} /> Nuevo usuario</button>}
      />
      <div className="card card--flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Profesional</th><th>Estado</th><th>Creado</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={item.email || 'U'} size="sm" tone="muted" />
                      <span className="cell-person__meta"><strong>{item.email}</strong></span>
                    </div>
                  </td>
                  <td><span className="badge badge--neutral"><ShieldCheck size={12} /> {item.role}</span></td>
                  <td>{item.professionalId || '—'}</td>
                  <td><span className={`badge ${item.active ? 'badge--confirmada' : 'badge--cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>{new Date(item.createdAt).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="5" className="empty">No hay usuarios registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal
          title="Nuevo usuario"
          description="Invita a una persona a trabajar en tu salón."
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save}>
            <TextField label="Correo" icon={UserRound} value={form.email} onChange={change('email')} placeholder="correo" suffix={`@${domain || 'tusalon.com'}`} inputMode="email" required />
            <div className="field section-spaced">
              <span className="field__label">Rol</span>
              <CustomSelect value={form.role} onChange={setField('role')} options={ROLES} icon={ShieldCheck} ariaLabel="Rol del usuario" />
            </div>
            <div className="form-row section-spaced">
              <TextField label="Nombres" value={form.firstName} onChange={change('firstName')} placeholder="Nombre" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
              <TextField label="Apellidos" value={form.lastName} onChange={change('lastName')} placeholder="Apellidos" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
            </div>
            {form.role === 'Profesional' && (
              <div className="section-spaced">
                <TextField label="Especialidad" value={form.specialty} onChange={change('specialty')} placeholder="Ej. Estética facial" />
              </div>
            )}
            <div className="section-spaced">
              <TextField label="Contraseña" type="password" value={form.password} onChange={change('password')} placeholder="Mínimo 8 caracteres" minLength={8} required />
            </div>
            <div className="form-actions">
              <button type="button" className="button button--ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="button" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
