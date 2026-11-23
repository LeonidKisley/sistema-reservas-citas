import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Pencil, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import CustomSelect from '../components/ui/CustomSelect.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { createUser, deleteUser, getUsers, updateUser } from '../services/catalogService.js';
import { errorMessage, successMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  NAME_INPUT_PATTERN,
  composeEmail,
  emailLocalPart,
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
  const [editingId, setEditingId] = useState(null);
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
  const openCreate = () => { setForm(EMPTY); setEditingId(null); setOpen(true); };
  const openEdit = (item) => {
    setForm({
      ...EMPTY,
      email: emailLocalPart(item.email, domain),
      role: item.role,
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      specialty: item.specialty || ''
    });
    setEditingId(item.id);
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if ((!editingId || firstName) && !isValidPersonName(firstName)) {
      toast.error('Los nombres y apellidos solo pueden contener letras y espacios');
      return;
    }
    if ((!editingId || lastName) && !isValidPersonName(lastName)) {
      toast.error('Los nombres y apellidos solo pueden contener letras y espacios');
      return;
    }
    if (!isValidEmailLocal(form.email)) {
      toast.error('El correo electrónico no es válido');
      return;
    }
    if (!editingId && !form.password) {
      toast.error('La contraseña es obligatoria');
      return;
    }
    const payload = { role: form.role, email: composeEmail(form.email, domain) };
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;
    if (form.role === 'Profesional' && form.specialty) payload.specialty = form.specialty;
    if (form.password) payload.password = form.password;

    setLoading(true);
    try {
      if (editingId) await updateUser(editingId, payload);
      else await createUser(payload);
      toast.success(editingId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      setOpen(false);
      setForm(EMPTY);
      setEditingId(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (item) => {
    const result = await Swal.fire({
      title: '¿Desactivar usuario?',
      text: `${item.email} — perderá el acceso al salón.`,
      icon: 'warning',
      iconColor: '#C26476',
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C26476',
      cancelButtonColor: '#A99A9F'
    });
    if (!result.isConfirmed) return;
    try {
      const response = await deleteUser(item.id);
      toast.success(successMessage(response, 'Usuario desactivado correctamente'));
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Usuarios"
        subtitle="Cuentas del salón y control de accesos"
        actions={<button className="button" onClick={openCreate}><Plus size={16} strokeWidth={1.75} /> Nuevo usuario</button>}
      />
      <div className="card card--flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Rol</th><th>Profesional</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
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
                  <td>
                    <div className="row-actions">
                      <button className="button button--small button--ghost" onClick={() => openEdit(item)}><Pencil size={13} /> Editar</button>
                      <button className="button button--small button--danger" onClick={() => remove(item)}><Trash2 size={13} /> {item.active ? 'Desactivar' : 'Eliminar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="6" className="empty">No hay usuarios registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal
          title={editingId ? 'Editar usuario' : 'Nuevo usuario'}
          description={editingId ? 'Actualiza el acceso y los datos del equipo.' : 'Invita a una persona a trabajar en tu salón.'}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save}>
            <TextField label="Correo" icon={UserRound} value={form.email} onChange={change('email')} placeholder="correo" suffix={`@${domain || 'tusalon.com'}`} inputMode="email" required />
            <div className="field section-spaced">
              <span className="field__label">Rol</span>
              <CustomSelect value={form.role} onChange={setField('role')} options={ROLES} icon={ShieldCheck} ariaLabel="Rol del usuario" />
            </div>
            <div className="form-row section-spaced">
              <TextField label="Nombres" value={form.firstName} onChange={change('firstName')} placeholder="Nombre" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required={!editingId} />
              <TextField label="Apellidos" value={form.lastName} onChange={change('lastName')} placeholder="Apellidos" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required={!editingId} />
            </div>
            {form.role === 'Profesional' && (
              <div className="section-spaced">
                <TextField label="Especialidad" value={form.specialty} onChange={change('specialty')} placeholder="Ej. Estética facial" />
              </div>
            )}
            <div className="section-spaced">
              <TextField label={editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'} type="password" value={form.password} onChange={change('password')} placeholder="Mínimo 8 caracteres" minLength={8} required={!editingId} />
              {editingId && <small className="field__hint">Déjala vacía para conservar la contraseña actual.</small>}
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
