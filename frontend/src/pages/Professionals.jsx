import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { createProfessional, getProfessionals, getServices, updateProfessional } from '../services/catalogService.js';
import { errorMessage } from '../services/api.js';

const DAYS = [
  { value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' }, { value: 5, label: 'Vie' }, { value: 6, label: 'Sáb' }, { value: 0, label: 'Dom' }
];

const EMPTY = {
  firstName: '', lastName: '', document: '', email: '', phone: '', specialty: '',
  workDays: [1, 2, 3, 4, 5], start: '09:00', end: '18:00', services: []
};

export default function Professionals() {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [professionals, catalog] = await Promise.all([getProfessionals(), getServices()]);
      setItems(professionals.data);
      setServices(catalog.data);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
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
      workDays: (item.workHours || []).map((entry) => entry.dayOfWeek),
      start: item.workHours?.[0]?.start || '09:00',
      end: item.workHours?.[0]?.end || '18:00'
    });
    setEditingId(item.id);
    setOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
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

  return (
    <>
      <PageHeader title="Profesionales" subtitle="Personal de atención, jornadas y servicios asignados" actions={<button className="button" onClick={openCreate}>+ Nuevo profesional</button>} />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Profesional</th><th>Especialidad</th><th>Jornada</th><th>Servicios</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.firstName} {item.lastName}</strong><br /><small>{item.email || item.document || '—'}</small></td>
                <td>{item.specialty || '—'}</td>
                <td>{item.workHours?.length ? `${item.workHours.length} día(s), ${item.workHours[0].start}–${item.workHours[0].end}` : 'Sin jornada'}</td>
                <td>{item.services?.length || 0}</td>
                <td><span className={`badge ${item.active ? 'badge-confirmada' : 'badge-cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                <td><button className="button small ghost" onClick={() => openEdit(item)}>Editar</button></td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="6" className="empty">No hay profesionales registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editingId ? 'Editar profesional' : 'Nuevo profesional'} onClose={() => setOpen(false)} wide>
          <form onSubmit={save}>
            <div className="form-row">
              <div className="field"><label>Nombres</label><input value={form.firstName} onChange={change('firstName')} required /></div>
              <div className="field"><label>Apellidos</label><input value={form.lastName} onChange={change('lastName')} required /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Documento</label><input value={form.document || ''} onChange={change('document')} /></div>
              <div className="field"><label>Correo</label><input type="email" value={form.email || ''} onChange={change('email')} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Teléfono</label><input value={form.phone || ''} onChange={change('phone')} /></div>
              <div className="field"><label>Especialidad</label><input value={form.specialty || ''} onChange={change('specialty')} /></div>
            </div>
            <div className="field">
              <label>Días de atención</label>
              <div className="checkbox-grid">
                {DAYS.map((day) => (
                  <label key={day.value}>
                    <input type="checkbox" checked={form.workDays.includes(day.value)} onChange={toggleDay(day.value)} /> {day.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="field"><label>Inicio de jornada</label><input type="time" value={form.start} onChange={change('start')} required /></div>
              <div className="field"><label>Fin de jornada</label><input type="time" value={form.end} onChange={change('end')} required /></div>
            </div>
            <div className="field">
              <label>Servicios que ofrece (mantén Ctrl para seleccionar varios)</label>
              <select multiple size="4" value={form.services} onChange={(event) => setForm((current) => ({
                ...current,
                services: Array.from(event.target.selectedOptions).map((option) => option.value)
              }))}>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.durationMinutes} min</option>)}
              </select>
            </div>
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
