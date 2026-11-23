import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { Clock3, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { TextArea, TextField } from '../components/ui/TextField.jsx';
import { createService, deleteService, getServices, updateService } from '../services/catalogService.js';
import { errorMessage, successMessage } from '../services/api.js';

const EMPTY = { name: '', description: '', durationMinutes: 30, price: 0, active: true };

export default function Services() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getServices();
      setItems(response.data || []);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditingId(item.id); setOpen(true); };

  const save = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, durationMinutes: Number(form.durationMinutes), price: Number(form.price) };
      if (editingId) await updateService(editingId, payload);
      else await createService(payload);
      toast.success(editingId ? 'Servicio actualizado' : 'Servicio creado');
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
      title: '¿Eliminar servicio?',
      text: `${item.name} — dejará de ofrecerse en la agenda.`,
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
      const response = await deleteService(item.id);
      toast.success(successMessage(response, 'Servicio eliminado correctamente'));
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Servicios"
        subtitle="Tu catálogo de experiencias, con duración y precio"
        actions={<button className="button" onClick={openCreate}><Plus size={16} strokeWidth={1.75} /> Nuevo servicio</button>}
      />
      <div className="card card--flush">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Servicio</th><th>Descripción</th><th>Duración</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cell-person">
                      <span className="avatar avatar--sm"><Sparkles size={14} strokeWidth={1.75} /></span>
                      <span className="cell-person__meta"><strong>{item.name}</strong></span>
                    </div>
                  </td>
                  <td>{item.description || '—'}</td>
                  <td><span className="badge badge--neutral"><Clock3 size={12} /> {item.durationMinutes} min</span></td>
                  <td><strong>{Number(item.price).toFixed(2)}</strong></td>
                  <td><span className={`badge ${item.active ? 'badge--confirmada' : 'badge--cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="button button--small button--ghost" onClick={() => openEdit(item)}><Pencil size={13} /> Editar</button>
                      <button className="button button--small button--ghost" onClick={() => remove(item)}>
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="6" className="empty">No hay servicios registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal
          title={editingId ? 'Editar servicio' : 'Nuevo servicio'}
          description="Define cómo se mostrará este servicio en la agenda."
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save}>
            <TextField label="Nombre" value={form.name} onChange={change('name')} placeholder="Ej. Masaje aromático" required minLength={2} />
            <div className="section-spaced">
              <TextArea label="Descripción" rows="2" value={form.description || ''} onChange={change('description')} placeholder="Una breve descripción de la experiencia" />
            </div>
            <div className="form-row section-spaced">
              <TextField label="Duración (minutos)" type="number" min="1" value={form.durationMinutes} onChange={change('durationMinutes')} required />
              <TextField label="Precio" type="number" min="0" step="0.01" value={form.price} onChange={change('price')} required />
            </div>
            <div className="checkbox-grid section-spaced">
              <label><input type="checkbox" checked={Boolean(form.active)} onChange={change('active')} /> Servicio activo</label>
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
