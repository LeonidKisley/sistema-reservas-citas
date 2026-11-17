import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { createClient, deleteClient, getClients, updateClient } from '../services/catalogService.js';
import { errorMessage } from '../services/api.js';

const EMPTY = { firstName: '', lastName: '', document: '', email: '', phone: '', address: '', notes: '' };

export default function Clients() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getClients({ search, limit: 100 });
      setItems(response.data.items);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const openCreate = () => { setForm(EMPTY); setEditingId(null); setOpen(true); };
  const openEdit = (item) => { setForm({ ...item }); setEditingId(item.id); setOpen(true); };

  const save = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (editingId) await updateClient(editingId, form);
      else await createClient(form);
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
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    });
    if (!result.isConfirmed) return;
    try {
      const response = await deleteClient(item.id);
      toast.success(response.message);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Clientes" subtitle="Catálogo aislado por tenant" actions={<button className="button" onClick={openCreate}>+ Nuevo cliente</button>} />
      <div className="card">
        <div className="toolbar">
          <div className="field"><label>Buscar por nombre o documento</label><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, apellido o documento" /></div>
          <button className="button ghost" onClick={load}>Buscar</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cliente</th><th>Documento</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.firstName} {item.lastName}</strong></td>
                  <td>{item.document}</td>
                  <td>{item.email || '—'}</td>
                  <td>{item.phone || '—'}</td>
                  <td><span className={`badge ${item.active ? 'badge-confirmada' : 'badge-cancelada'}`}>{item.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="button small ghost" onClick={() => openEdit(item)}>Editar</button>
                      <button className="button small danger" onClick={() => remove(item)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="6" className="empty">No se encontraron clientes</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal title={editingId ? 'Editar cliente' : 'Nuevo cliente'} onClose={() => setOpen(false)} wide>
          <form onSubmit={save}>
            <div className="form-row">
              <div className="field"><label>Nombres</label><input value={form.firstName} onChange={change('firstName')} required /></div>
              <div className="field"><label>Apellidos</label><input value={form.lastName} onChange={change('lastName')} required /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Documento</label><input value={form.document} onChange={change('document')} required /></div>
              <div className="field"><label>Correo</label><input type="email" value={form.email || ''} onChange={change('email')} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Teléfono</label><input value={form.phone || ''} onChange={change('phone')} /></div>
              <div className="field"><label>Dirección</label><input value={form.address || ''} onChange={change('address')} /></div>
            </div>
            <div className="field"><label>Notas</label><textarea rows="2" value={form.notes || ''} onChange={change('notes')} /></div>
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
