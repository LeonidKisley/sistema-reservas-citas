import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { TextArea, TextField } from '../components/ui/TextField.jsx';
import { createClient, deleteClient, getClients, updateClient } from '../services/catalogService.js';
import { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  NAME_INPUT_PATTERN,
  PERU_PHONE_PREFIX,
  composeEmail,
  composePeruPhone,
  emailLocalPart,
  isValidDni,
  isValidEmailLocal,
  isValidPeruPhoneLocal,
  isValidPersonName,
  phoneLocalPart
} from '../utils/validation.js';

const EMPTY = { firstName: '', lastName: '', document: '', email: '', phone: '', address: '', notes: '' };

export default function Clients() {
  const { user } = useAuth();
  const domain = user?.tenant?.domain || '';
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getClients({ search, limit: 100 });
      setItems(response.data.items || []);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const changeDigits = (field, max) => (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, max);
    setForm((current) => ({ ...current, [field]: value }));
  };
  const openCreate = () => { setForm(EMPTY); setEditingId(null); setOpen(true); };
  const openEdit = (item) => {
    setForm({
      ...item,
      email: emailLocalPart(item.email, domain),
      phone: phoneLocalPart(item.phone)
    });
    setEditingId(item.id);
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!isValidPersonName(form.firstName) || !isValidPersonName(form.lastName)) {
      toast.error('Los nombres y apellidos solo pueden contener letras y espacios');
      return;
    }
    if (!isValidDni(form.document)) {
      toast.error('El DNI debe tener exactamente 8 dígitos');
      return;
    }
    if (form.email && !isValidEmailLocal(form.email)) {
      toast.error('El correo electrónico no es válido');
      return;
    }
    if (form.phone && !isValidPeruPhoneLocal(form.phone)) {
      toast.error('El teléfono debe tener 9 dígitos después de +51');
      return;
    }
    const payload = {
      ...form,
      email: composeEmail(form.email, domain),
      phone: composePeruPhone(form.phone)
    };
    setLoading(true);
    try {
      if (editingId) await updateClient(editingId, payload);
      else await createClient(payload);
      toast.success(editingId ? 'Cliente actualizado' : 'Cliente creado');
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (item) => {
    const result = await Swal.fire({
      title: '¿Eliminar cliente?',
      text: `${item.firstName} ${item.lastName} — si tiene citas se conservarán sus datos históricos.`,
      icon: 'warning',
      iconColor: '#C26476',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#A84E60',
      cancelButtonColor: '#A99A9F'
    });
    if (!result.isConfirmed) return;
    try {
      const response = await deleteClient(item.id);
      toast.success(response.message || 'Cliente eliminado');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Clientes"
        subtitle="Las personas que confían en tu salón, en un solo lugar"
        actions={<button className="button" onClick={openCreate}><Plus size={16} strokeWidth={1.75} /> Nuevo cliente</button>}
      />
      <div className="card card--flush">
        <div className="toolbar" style={{ padding: 20 }}>
          <div className="field" style={{ maxWidth: 380 }}>
            <span className="field__label">Buscar</span>
            <span className="input-shell">
              <Search size={17} strokeWidth={1.75} className="input-shell__icon" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, apellido o documento" />
            </span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Documento</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={`${item.firstName} ${item.lastName}`} size="sm" />
                      <span className="cell-person__meta">
                        <strong>{item.firstName} {item.lastName}</strong>
                        <small>{item.address || 'Cliente del salón'}</small>
                      </span>
                    </div>
                  </td>
                  <td>{item.document}</td>
                  <td>{item.email || '—'}</td>
                  <td>{item.phone || '—'}</td>
                  <td><span className={`badge ${item.active ? 'badge--confirmada' : 'badge--cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="button button--small button--ghost" onClick={() => openEdit(item)}><Pencil size={13} /> Editar</button>
                      <button className="button button--small button--danger" onClick={() => remove(item)}><Trash2 size={13} /> Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan="6" className="empty"><Users size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />No se encontraron clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal
          title={editingId ? 'Editar cliente' : 'Nuevo cliente'}
          description={editingId ? 'Actualiza los datos de contacto.' : 'Añade una nueva clienta a tu salón.'}
          onClose={() => setOpen(false)}
          wide
        >
          <form onSubmit={save}>
            <div className="form-row">
              <TextField label="Nombres" value={form.firstName} onChange={change('firstName')} placeholder="Nombre" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
              <TextField label="Apellidos" value={form.lastName} onChange={change('lastName')} placeholder="Apellidos" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
            </div>
            <div className="form-row section-spaced">
              <TextField label="DNI" value={form.document} onChange={changeDigits('document', 8)} placeholder="8 dígitos" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} title="El DNI debe tener 8 dígitos" required />
              <TextField label="Correo" value={form.email || ''} onChange={change('email')} placeholder="correo" suffix={`@${domain || 'tusalon.com'}`} inputMode="email" />
            </div>
            <div className="form-row section-spaced">
              <TextField label="Teléfono" prefix={PERU_PHONE_PREFIX} value={form.phone || ''} onChange={changeDigits('phone', 9)} placeholder="999 999 999" inputMode="numeric" maxLength={9} />
              <TextField label="Dirección" value={form.address || ''} onChange={change('address')} placeholder="Dirección postal" />
            </div>
            <div className="section-spaced">
              <TextArea label="Notas" rows="2" value={form.notes || ''} onChange={change('notes')} placeholder="Preferencias o información relevante" />
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
