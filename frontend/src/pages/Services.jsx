import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { createService, getServices, updateService } from '../services/catalogService.js';
import { errorMessage } from '../services/api.js';

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
      setItems(response.data);
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
  const openEdit = (item) => {
    setForm({ ...item });
    setEditingId(item.id);
    setOpen(true);
  };

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

  const toggleActive = async (item) => {
    const result = await Swal.fire({
      title: item.active ? '¿Desactivar servicio?' : '¿Activar servicio?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar'
    });
    if (!result.isConfirmed) return;
    try {
      await updateService(item.id, { ...item, active: !item.active });
      toast.success('Estado actualizado');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Servicios" subtitle="Catálogo de servicios del tenant" actions={<button className="button" onClick={openCreate}>+ Nuevo servicio</button>} />
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Descripción</th><th>Duración</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.name}</strong></td>
                <td>{item.description || '—'}</td>
                <td>{item.durationMinutes} min</td>
                <td>{Number(item.price).toFixed(2)}</td>
                <td><span className={`badge ${item.active ? 'badge-confirmada' : 'badge-cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="button small ghost" onClick={() => openEdit(item)}>Editar</button>
                    <button className="button small ghost" onClick={() => toggleActive(item)}>{item.active ? 'Desactivar' : 'Activar'}</button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan="6" className="empty">No hay servicios registrados</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editingId ? 'Editar servicio' : 'Nuevo servicio'} onClose={() => setOpen(false)}>
          <form onSubmit={save}>
            <div className="field"><label>Nombre</label><input value={form.name} onChange={change('name')} required minLength={2} /></div>
            <div className="field"><label>Descripción</label><textarea value={form.description || ''} onChange={change('description')} rows="2" /></div>
            <div className="form-row">
              <div className="field"><label>Duración (minutos)</label><input type="number" min="1" value={form.durationMinutes} onChange={change('durationMinutes')} required /></div>
              <div className="field"><label>Precio</label><input type="number" min="0" step="0.01" value={form.price} onChange={change('price')} required /></div>
            </div>
            <div className="checkbox-grid"><label><input type="checkbox" checked={Boolean(form.active)} onChange={change('active')} /> Activo</label></div>
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
