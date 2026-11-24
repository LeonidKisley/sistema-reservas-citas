import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  Copy,
  Images,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { TextArea, TextField } from '../components/ui/TextField.jsx';
import ServiceGalleryModal from '../components/catalog/ServiceGalleryModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { categoryLabel, categoryStyle, SERVICE_CATEGORIES } from '../data/serviceCategories.js';
import {
  createService,
  deleteService,
  duplicateService,
  getServicesWithInactive,
  updateService
} from '../services/catalogService.js';
import { errorMessage, successMessage } from '../services/api.js';

const EMPTY = {
  name: '',
  description: '',
  durationMinutes: 30,
  price: 0,
  category: 'otros',
  trending: false,
  order: 0,
  active: true
};

export default function Services() {
  const { user } = useAuth();
  const canWrite = user?.role === 'Administrador';
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [galleryService, setGalleryService] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getServicesWithInactive();
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

  const openCreate = () => { setForm({ ...EMPTY }); setEditingId(null); setOpen(true); };
  const openEdit = (item) => { setForm({ ...EMPTY, ...item }); setEditingId(item.id); setOpen(true); };

  const save = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
        price: Number(form.price),
        category: form.category || 'otros',
        trending: Boolean(form.trending),
        order: Number(form.order ?? 0) || 0,
        active: Boolean(form.active)
      };
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

  const duplicate = async (item) => {
    const existing = new Set(items.map((service) => service.name));
    const base = item.name.slice(0, 100 - ' (copia 99)'.length).trim();
    let name = `${base} (copia)`;
    for (let suffix = 2; existing.has(name) && suffix < 100; suffix += 1) {
      name = `${base} (copia ${suffix})`.slice(0, 100);
    }
    if (existing.has(name)) {
      toast.error('No se pudo generar un nombre único para la copia');
      return;
    }
    try {
      await duplicateService({
        name,
        description: item.description,
        durationMinutes: item.durationMinutes,
        price: item.price,
        category: item.category || 'otros',
        trending: false,
        order: Number(item.order ?? 0) || 0,
        active: true
      });
      toast.success('Servicio duplicado');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async (item) => {
    const result = await Swal.fire({
      title: '¿Quitar servicio?',
      text: `${item.name} — dejará de ofrecerse en la agenda.`,
      icon: 'warning',
      iconColor: '#C26476',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#C26476',
      cancelButtonColor: '#A99A9F'
    });
    if (!result.isConfirmed) return;
    try {
      const response = await deleteService(item.id);
      toast.success(successMessage(response, 'Servicio quitado correctamente'));
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const reactivate = async (item) => {
    try {
      await updateService(item.id, { active: true });
      toast.success(`${item.name} vuelve a estar activo`);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const move = async (item, direction) => {
    const ordered = [...items].sort((first, second) => (
      (first.order ?? 0) - (second.order ?? 0) || first.name.localeCompare(second.name, 'es')
    ));
    const index = ordered.findIndex((service) => service.id === item.id);
    const target = Math.max(0, index + direction);
    if (index < 0 || target === index) return;
    try {
      await updateService(item.id, { order: target });
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
        subtitle="Tu catálogo de experiencias, con duración, precio, categoría y fotos"
        actions={canWrite && (
          <button className="button" onClick={openCreate}><Plus size={16} strokeWidth={1.75} /> Nuevo servicio</button>
        )}
      />
      <div className="card card--flush">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Servicio</th><th>Categoría</th><th>Tendencia</th><th>Fotos</th><th>Orden</th>
                <th>Descripción</th><th>Duración</th><th>Precio</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="cell-person">
                      <span className="avatar avatar--sm"><Sparkles size={14} strokeWidth={1.75} /></span>
                      <span className="cell-person__meta"><strong>{item.name}</strong></span>
                    </div>
                  </td>
                  <td>
                    <span className="catalog-chip catalog-chip--sm" style={categoryStyle(item.category)}>
                      {categoryLabel(item.category)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${item.trending ? 'badge--confirmada' : 'badge--neutral'}`}>
                      {item.trending ? '🔥 Sí' : 'No'}
                    </span>
                  </td>
                  <td>
                    <div className="gallery-cell">
                      {(item.images || []).slice(0, 2).map((image) => (
                        <img key={image.name} className="gallery-cell__thumb" src={image.url} alt="" />
                      ))}
                      <span className="badge badge--soft">{(item.images || []).length}</span>
                    </div>
                  </td>
                  <td><span className="badge badge--neutral">{item.order ?? 0}</span></td>
                  <td>{item.description || '—'}</td>
                  <td><span className="badge badge--neutral"><Clock3 size={12} /> {item.durationMinutes} min</span></td>
                  <td><strong>{Number(item.price).toFixed(2)}</strong></td>
                  <td>
                    <span className={`badge ${item.active ? 'badge--confirmada' : 'badge--cancelada'}`}>
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {canWrite ? (
                        <>
                          <button className="button button--small button--ghost" onClick={() => openEdit(item)}><Pencil size={13} /> Editar</button>
                          <button className="button button--small button--ghost" onClick={() => setGalleryService(item)}><Images size={13} /> Galería</button>
                          <button className="button button--small button--ghost" onClick={() => duplicate(item)}><Copy size={13} /> Duplicar</button>
                          {item.active ? (
                            <button className="button button--small button--ghost" onClick={() => remove(item)}><Trash2 size={13} /> Quitar</button>
                          ) : (
                            <button className="button button--small button--ghost" onClick={() => reactivate(item)}><RotateCcw size={13} /> Reactivar</button>
                          )}
                          <button className="button button--small button--ghost" onClick={() => move(item, -1)} aria-label={`Subir ${item.name}`}><ArrowUp size={13} /></button>
                          <button className="button button--small button--ghost" onClick={() => move(item, 1)} aria-label={`Bajar ${item.name}`}><ArrowDown size={13} /></button>
                        </>
                      ) : (
                        <span className="muted">Solo lectura</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan="10" className="empty">No hay servicios registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal
          title={editingId ? 'Editar servicio' : 'Nuevo servicio'}
          description="Define cómo se mostrará este servicio en la agenda y en el catálogo."
          onClose={() => setOpen(false)}
        >
          <form onSubmit={save}>
            <TextField label="Nombre" value={form.name} onChange={change('name')} placeholder="Ej. Masaje aromático" required minLength={2} />
            <div className="form-row section-spaced">
              <label className="field">
                <span className="field__label">Categoría</span>
                <select className="select-trigger" value={form.category || 'otros'} onChange={change('category')}>
                  {SERVICE_CATEGORIES.map((category) => (
                    <option key={category.slug} value={category.slug}>{category.label}</option>
                  ))}
                </select>
              </label>
              <TextField label="Orden" type="number" min="0" value={form.order ?? 0} onChange={change('order')} />
            </div>
            <div className="section-spaced">
              <TextArea label="Descripción" rows="2" value={form.description || ''} onChange={change('description')} placeholder="Una breve descripción de la experiencia" />
            </div>
            <div className="form-row section-spaced">
              <TextField label="Duración (minutos)" type="number" min="1" value={form.durationMinutes} onChange={change('durationMinutes')} required />
              <TextField label="Precio" type="number" min="0" step="0.01" value={form.price} onChange={change('price')} required />
            </div>
            <div className="checkbox-grid section-spaced">
              <label><input type="checkbox" checked={Boolean(form.trending)} onChange={change('trending')} /> En tendencia</label>
              <label><input type="checkbox" checked={Boolean(form.active)} onChange={change('active')} /> Servicio activo</label>
            </div>
            <div className="form-actions">
              <button type="button" className="button button--ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="button" disabled={loading}>{loading ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {galleryService && (
        <ServiceGalleryModal
          service={galleryService}
          onClose={() => setGalleryService(null)}
          onUpdated={load}
        />
      )}
    </>
  );
}
