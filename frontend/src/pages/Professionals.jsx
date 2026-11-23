import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Clock3, Pencil, Phone, Plus, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import CustomSelect from '../components/ui/CustomSelect.jsx';
import { TextField } from '../components/ui/TextField.jsx';
import { createProfessional, deleteProfessional, getProfessionals, getServices, updateProfessional } from '../services/catalogService.js';
import { errorMessage, successMessage } from '../services/api.js';
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

const DAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' }
];

const EMPTY = {
  firstName: '', lastName: '', document: '', email: '', phone: '', specialty: '',
  workDays: [1, 2, 3, 4, 5], start: '09:00', end: '18:00', services: []
};

export default function Professionals() {
  const { user } = useAuth();
  const domain = user?.tenant?.domain || '';
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [professionals, catalog] = await Promise.all([getProfessionals(), getServices()]);
      setItems(professionals.data || []);
      setServices(catalog.data || []);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const changeDigits = (field, max) => (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, max);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleDay = (day) => () => {
    setForm((current) => ({
      ...current,
      workDays: current.workDays.includes(day)
        ? current.workDays.filter((value) => value !== day)
        : [...current.workDays, day]
    }));
  };

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setOpen(true); };
  const openEdit = (item) => {
    setForm({
      ...item,
      email: emailLocalPart(item.email, domain),
      phone: phoneLocalPart(item.phone),
      workDays: (item.workHours || []).map((entry) => entry.dayOfWeek),
      start: item.workHours?.[0]?.start || '09:00',
      end: item.workHours?.[0]?.end || '18:00',
      services: item.services || []
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
    if (form.document && !isValidDni(form.document)) {
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
    setLoading(true);
    try {
      const payload = {
        ...form,
        email: composeEmail(form.email, domain),
        phone: composePeruPhone(form.phone),
        workHours: [...form.workDays].sort((a, b) => a - b).map((dayOfWeek) => ({ dayOfWeek, start: form.start, end: form.end })),
        services: form.services || []
      };
      delete payload.workDays;
      delete payload.start;
      delete payload.end;
      delete payload.id;
      delete payload.createdAt;
      delete payload.updatedAt;

      if (editingId) await updateProfessional(editingId, payload);
      else await createProfessional(payload);
      toast.success(editingId ? 'Profesional actualizado' : 'Profesional creado');
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (item) => {
    const name = `${item.firstName} ${item.lastName}`.trim();
    const result = await Swal.fire({
      title: '¿Eliminar profesional?',
      text: `${name || 'Profesional'} — dejará de atender citas en la agenda.`,
      icon: 'warning',
      iconColor: '#C26476',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C26476',
      cancelButtonColor: '#A99A9F'
    });
    if (!result.isConfirmed) return;
    try {
      const response = await deleteProfessional(item.id);
      toast.success(successMessage(response, 'Profesional eliminado correctamente'));
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const serviceOptions = services.map((item) => ({
    value: item.id,
    label: item.name,
    description: `${item.durationMinutes} min`,
    icon: Sparkles
  }));

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Profesionales"
        subtitle="El equipo, sus jornadas y los servicios que ofrece"
        actions={<button className="button" onClick={openCreate}><Plus size={16} strokeWidth={1.75} /> Nuevo profesional</button>}
      />
      <div className="card card--flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Profesional</th><th>Especialidad</th><th>Jornada</th><th>Servicios</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={`${item.firstName} ${item.lastName}`} size="sm" />
                      <span className="cell-person__meta">
                        <strong>{item.firstName} {item.lastName}</strong>
                        <small>{item.email || item.document || '—'}</small>
                      </span>
                    </div>
                  </td>
                  <td>{item.specialty || '—'}</td>
                  <td>{item.workHours?.length ? `${item.workHours.length} día(s) · ${item.workHours[0].start}–${item.workHours[0].end}` : 'Sin jornada'}</td>
                  <td>{item.services?.length || 0}</td>
                  <td><span className={`badge ${item.active ? 'badge--confirmada' : 'badge--cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="button button--small button--ghost" onClick={() => openEdit(item)}><Pencil size={13} /> Editar</button>
                      <button className="button button--small button--ghost" onClick={() => remove(item)}><Trash2 size={13} /> Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="6" className="empty">No hay profesionales registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal
          title={editingId ? 'Editar profesional' : 'Nuevo profesional'}
          description="Define sus datos, jornada y servicios asignados."
          onClose={() => setOpen(false)}
          wide
        >
          <form onSubmit={save}>
            <div className="form-row">
              <TextField label="Nombres" value={form.firstName} onChange={change('firstName')} placeholder="Nombre" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
              <TextField label="Apellidos" value={form.lastName} onChange={change('lastName')} placeholder="Apellidos" pattern={NAME_INPUT_PATTERN} title="Solo letras y espacios" required />
            </div>
            <div className="form-row section-spaced">
              <TextField label="DNI" value={form.document || ''} onChange={changeDigits('document', 8)} placeholder="8 dígitos" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} title="El DNI debe tener 8 dígitos" />
              <TextField label="Correo" value={form.email || ''} onChange={change('email')} placeholder="correo" suffix={`@${domain || 'tusalon.com'}`} inputMode="email" />
            </div>
            <div className="form-row section-spaced">
              <TextField label="Teléfono" icon={Phone} prefix={PERU_PHONE_PREFIX} value={form.phone || ''} onChange={changeDigits('phone', 9)} placeholder="999 999 999" inputMode="numeric" maxLength={9} />
              <TextField label="Especialidad" value={form.specialty || ''} onChange={change('specialty')} placeholder="Ej. Colorimetría" />
            </div>
            <div className="field section-spaced">
              <span className="field__label">Días de atención</span>
              <div className="day-grid">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className="day-chip"
                    aria-pressed={form.workDays.includes(day.value)}
                    onClick={toggleDay(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-row section-spaced">
              <div className="field">
                <span className="field__label">Inicio de jornada</span>
                <span className="input-shell">
                  <Clock3 size={17} strokeWidth={1.75} className="input-shell__icon" />
                  <input type="time" value={form.start} onChange={change('start')} required />
                </span>
              </div>
              <div className="field">
                <span className="field__label">Fin de jornada</span>
                <span className="input-shell">
                  <Clock3 size={17} strokeWidth={1.75} className="input-shell__icon" />
                  <input type="time" value={form.end} onChange={change('end')} required />
                </span>
              </div>
            </div>
            <div className="field section-spaced">
              <span className="field__label">Servicios que ofrece</span>
              <CustomSelect
                value={form.services || []}
                onChange={setField('services')}
                options={serviceOptions}
                placeholder="Selecciona los servicios"
                icon={Sparkles}
                multiple
                ariaLabel="Servicios que ofrece"
              />
              <span className="field__hint">Puedes seleccionar tantos servicios como necesites.</span>
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
