import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  LayoutGrid,
  List,
  Plus,
  RotateCcw,
  Scissors,
  Sparkles,
  UserRound,
  UserX,
  XCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import BookingModal from '../components/BookingModal.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import CustomSelect from '../components/ui/CustomSelect.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import { useAppointments } from '../context/AppointmentsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage, successMessage } from '../services/api.js';
import {
  cancelAppointment,
  getAppointments,
  rescheduleAppointment,
  updateAppointmentStatus
} from '../services/appointmentService.js';
import { getClients, getProfessionals, getServices } from '../services/catalogService.js';

const EMPTY_FILTERS = { clientId: '', professionalId: '', serviceId: '', from: '', to: '' };
const EMPTY_FORM = { clientId: '', professionalId: '', serviceId: '', date: '', time: '', notes: '' };
const EMPTY_BOOKING = { clientId: '', professionalId: '', serviceId: '', date: '', time: '' };
const NEXT_STATUS = { programada: 'confirmada', confirmada: 'completada' };
const OPEN_STATUSES = ['programada', 'confirmada'];
const CLOSED_STATUSES = ['cancelada', 'completada', 'no asistió'];

const formatMoment = (value) => (value ? dayjs.utc(value).format('DD/MM/YYYY HH:mm') : '—');
const dateKey = (value) => dayjs.utc(value).format('YYYY-MM-DD');
const timeKey = (value) => dayjs.utc(value).format('HH:mm');

export default function Appointments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { revision, notifyAppointmentChange } = useAppointments();
  const lastRevision = useRef(revision);
  const role = user?.role;
  const isClient = role === 'Cliente';
  const canCreate = ['Administrador', 'Recepcionista', 'Cliente'].includes(role);
  const canReschedule = ['Administrador', 'Recepcionista'].includes(role);
  const canCancel = ['Administrador', 'Recepcionista', 'Cliente'].includes(role);
  const canChangeStatus = ['Administrador', 'Recepcionista', 'Profesional'].includes(role);

  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [view, setView] = useState('table');
  const [quickFilter, setQuickFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [booking, setBooking] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        const [clientsResponse, professionalsResponse, servicesResponse] = await Promise.all([
          isClient ? Promise.resolve({ data: { items: [] } }) : getClients({ limit: 100 }),
          getProfessionals(),
          getServices()
        ]);
        if (!active) return;
        setClients(isClient && user?.clientId
          ? [{ id: user.clientId, firstName: user.email?.split('@')[0] || 'Mi cuenta', lastName: '', email: user.email }]
          : clientsResponse.data?.items || []);
        setProfessionals((professionalsResponse.data || []).filter((item) => item.active !== false));
        setServices((servicesResponse.data || []).filter((item) => item.active !== false));
      } catch (error) {
        if (active) toast.error(errorMessage(error));
      }
    };

    loadCatalog();
    return () => { active = false; };
  }, [isClient, user?.clientId, user?.email]);

  useEffect(() => {
    const professionalId = searchParams.get('professionalId');
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    if (!professionalId && !serviceId && !date && !time) return;
    setBooking({
      ...EMPTY_BOOKING,
      clientId: isClient ? user?.clientId || '' : '',
      professionalId: professionalId || '',
      serviceId: serviceId || '',
      date: date || dayjs().format('YYYY-MM-DD'),
      time: time || ''
    });
    setSearchParams({}, { replace: true });
  }, [searchParams, role, user?.clientId, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      if (params.to) params.to = dayjs.utc(params.to).add(1, 'day').format('YYYY-MM-DD');
      const response = await getAppointments(params);
      setItems(response.data?.items || []);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (revision === lastRevision.current) return;
    lastRevision.current = revision;
    load();
  }, [revision, load]);

  const setFilter = (field) => (value) => {
    setQuickFilter('');
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const openCreate = () => {
    setBooking({
      ...EMPTY_BOOKING,
      clientId: isClient ? user?.clientId || '' : clients[0]?.id || '',
      date: dayjs().format('YYYY-MM-DD')
    });
  };

  const handleCreated = () => {
    setBooking(null);
    notifyAppointmentChange();
  };

  const openReschedule = (item) => {
    setEditingId(item.id);
    setForm({
      clientId: item.clientId,
      professionalId: item.professionalId,
      serviceId: item.serviceId,
      date: dateKey(item.start),
      time: timeKey(item.start),
      notes: item.notes || ''
    });
    setModalMode('reschedule');
  };

  const saveReschedule = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await rescheduleAppointment(editingId, { date: form.date, time: form.time });
      toast.success('Cita reprogramada');
      setModalMode(null);
      notifyAppointmentChange();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (item) => {
    const result = await Swal.fire({
      title: '¿Cancelar la cita?',
      text: `${item.serviceName || 'Cita'} · ${formatMoment(item.start)}`,
      input: 'textarea',
      inputPlaceholder: 'Motivo de cancelación (opcional)',
      icon: 'warning',
      iconColor: '#C26476',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#A84E60',
      cancelButtonColor: '#A99A9F'
    });
    if (!result.isConfirmed) return;
    try {
      const response = await cancelAppointment(item.id, { reason: result.value || undefined });
      toast.success(successMessage(response, 'Cita cancelada'));
      notifyAppointmentChange();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const changeStatus = async (item, status) => {
    try {
      await updateAppointmentStatus(item.id, status);
      toast.success(`Estado actualizado a ${status}`);
      notifyAppointmentChange();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const stats = useMemo(() => ({
    upcoming: items.filter((item) => OPEN_STATUSES.includes(item.status) && dayjs.utc(item.start).isAfter(dayjs.utc())),
    completed: items.filter((item) => item.status === 'completada'),
    closed: items.filter((item) => ['cancelada', 'no asistió'].includes(item.status)),
    today: items.filter((item) => dateKey(item.start) === dayjs.utc().format('YYYY-MM-DD'))
  }), [items]);

  const visibleItems = quickFilter === 'pending' ? stats.upcoming : items;

  const groupedItems = useMemo(() => {
    const map = new Map();
    visibleItems.forEach((item) => {
      const key = dateKey(item.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  const applyQuickFilter = (type) => {
    const today = dayjs().format('YYYY-MM-DD');
    if (type === 'pending') {
      setQuickFilter('pending');
      setFilters(EMPTY_FILTERS);
      return;
    }
    setQuickFilter('');
    if (type === 'today') setFilters({ ...EMPTY_FILTERS, from: today, to: today });
    if (type === 'week') setFilters({ ...EMPTY_FILTERS, from: today, to: dayjs().add(7, 'day').format('YYYY-MM-DD') });
    if (type === 'all') setFilters(EMPTY_FILTERS);
  };

  const quickChips = [
    {
      key: 'today', label: 'Hoy', icon: CalendarDays,
      active: filters.from === dayjs().format('YYYY-MM-DD') && filters.to === dayjs().format('YYYY-MM-DD')
    },
    {
      key: 'week', label: 'Esta semana', icon: CalendarClock,
      active: filters.from === dayjs().format('YYYY-MM-DD') && filters.to === dayjs().add(7, 'day').format('YYYY-MM-DD')
    },
    { key: 'pending', label: 'Pendientes', icon: Clock3, active: quickFilter === 'pending' }
  ];

  const renderActions = (item) => (
    <div className="row-actions">
      {canReschedule && !CLOSED_STATUSES.includes(item.status) && (
        <button className="button button--small button--ghost" onClick={() => openReschedule(item)}>
          <CalendarClock size={13} strokeWidth={1.75} /> Reprogramar
        </button>
      )}
      {canChangeStatus && NEXT_STATUS[item.status] && (
        <button className="button button--small button--soft" onClick={() => changeStatus(item, NEXT_STATUS[item.status])}>
          <Check size={13} strokeWidth={1.75} />
          {NEXT_STATUS[item.status] === 'completada' ? 'Completar' : 'Confirmar'}
        </button>
      )}
      {canChangeStatus && ['programada', 'confirmada'].includes(item.status) && (
        <button className="button button--small button--ghost" onClick={() => changeStatus(item, 'no asistió')}>
          <UserX size={13} strokeWidth={1.75} /> No asistió
        </button>
      )}
      {canCancel && !CLOSED_STATUSES.includes(item.status) && (
        <button className="button button--small button--danger" onClick={() => cancel(item)}>
          <XCircle size={13} strokeWidth={1.75} /> Cancelar
        </button>
      )}
    </div>
  );

  const clientOptions = clients.map((item) => ({
    value: item.id,
    label: `${item.firstName} ${item.lastName}`.trim(),
    description: item.document || item.email || 'Cliente'
  }));
  const professionalOptions = professionals.map((item) => ({
    value: item.id,
    label: `${item.firstName} ${item.lastName}`.trim(),
    description: item.specialty || 'Profesional del salón'
  }));
  const serviceOptions = services.map((item) => ({
    value: item.id,
    label: item.name,
    description: `${item.durationMinutes} min`,
    icon: Sparkles
  }));

  return (
    <>
      <PageHeader
        eyebrow="Reservas"
        title="Citas"
        subtitle="Registro, reprogramación, cancelación y control de estados"
        actions={canCreate && (
          <button className="button" onClick={openCreate}>
            <Plus size={16} strokeWidth={1.75} /> Nueva cita
          </button>
        )}
      />

      <div className="card">
        <div className="toolbar">
          {!isClient && (
            <div className="field">
              <span className="field__label">Cliente</span>
              <CustomSelect value={filters.clientId} onChange={setFilter('clientId')} options={clientOptions} placeholder="Todos los clientes" icon={UserRound} clearable ariaLabel="Filtrar por cliente" />
            </div>
          )}
          <div className="field">
            <span className="field__label">Profesional</span>
            <CustomSelect value={filters.professionalId} onChange={setFilter('professionalId')} options={professionalOptions} placeholder="Todos los profesionales" icon={Scissors} clearable ariaLabel="Filtrar por profesional" />
          </div>
          <div className="field">
            <span className="field__label">Servicio</span>
            <CustomSelect value={filters.serviceId} onChange={setFilter('serviceId')} options={serviceOptions} placeholder="Todos los servicios" icon={Sparkles} clearable ariaLabel="Filtrar por servicio" />
          </div>
          <div className="field">
            <span className="field__label">Desde</span>
            <DatePicker value={filters.from} onChange={setFilter('from')} placeholder="Fecha inicial" clearable icon={CalendarDays} />
          </div>
          <div className="field">
            <span className="field__label">Hasta</span>
            <DatePicker value={filters.to} onChange={setFilter('to')} placeholder="Fecha final" clearable icon={CalendarDays} />
          </div>
          <button className="button button--ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
            <RotateCcw size={15} strokeWidth={1.75} /> Limpiar
          </button>
        </div>
      </div>

      <div className="grid grid-4 section-spaced">
        <div className="kpi">
          <div className="kpi__top"><span className="kpi-label">En el listado</span><span className="kpi__icon"><CalendarDays size={16} strokeWidth={1.75} /></span></div>
          <div className="kpi-value">{items.length}</div>
          <div className="kpi-hint">Citas cargadas</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi-label">Hoy</span><span className="kpi__icon"><Clock3 size={16} strokeWidth={1.75} /></span></div>
          <div className="kpi-value">{stats.today.length}</div>
          <div className="kpi-hint">Para {dayjs().format('D MMM')}</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi-label">Próximas</span><span className="kpi__icon"><CalendarClock size={16} strokeWidth={1.75} /></span></div>
          <div className="kpi-value">{stats.upcoming.length}</div>
          <div className="kpi-hint">Pendientes de atender</div>
        </div>
        <div className="kpi">
          <div className="kpi__top"><span className="kpi-label">Cerradas</span><span className="kpi__icon"><Check size={16} strokeWidth={1.75} /></span></div>
          <div className="kpi-value">{stats.completed.length + stats.closed.length}</div>
          <div className="kpi-hint">{stats.completed.length} completadas · {stats.closed.length} dadas de baja</div>
        </div>
      </div>

      <div className="card card--flush section-spaced">
        <div className="card__header" style={{ padding: '20px 22px 0', marginBottom: 0 }}>
          <div>
            <span className="eyebrow">Historial</span>
            <div className="card-title" style={{ marginTop: 4 }}>{visibleItems.length} citas encontradas</div>
          </div>
          {loading && <span className="muted" style={{ fontSize: 11 }}>Actualizando…</span>}
        </div>
        <div className="list-toolbar">
          <div className="quick-filters">
            {quickChips.map((chip) => {
              const ChipIcon = chip.icon;
              return (
                <button
                  key={chip.key}
                  type="button"
                  className={`filter-chip ${chip.active ? 'filter-chip--active' : ''}`}
                  onClick={() => applyQuickFilter(chip.key)}
                >
                  <ChipIcon size={13} strokeWidth={1.75} /> {chip.label}
                </button>
              );
            })}
          </div>
          <div className="view-toggle" role="group" aria-label="Vista de citas">
            <button
              type="button"
              className={`view-toggle__button ${view === 'table' ? 'view-toggle__button--active' : ''}`}
              onClick={() => setView('table')}
              aria-label="Vista de tabla"
            >
              <List size={14} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              className={`view-toggle__button ${view === 'cards' ? 'view-toggle__button--active' : ''}`}
              onClick={() => setView('cards')}
              aria-label="Vista de tarjetas"
            >
              <LayoutGrid size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {!visibleItems.length ? (
          <div className="empty-state">
            <span className="empty-state__icon"><CalendarDays size={22} strokeWidth={1.5} /></span>
            <strong>{loading ? 'Cargando citas…' : 'No hay citas para mostrar'}</strong>
            <p>{loading ? 'Estamos consultando tu historial.' : 'Prueba con otros filtros o crea una nueva reserva.'}</p>
            <div className="empty-state__actions">
              {canCreate && (
                <button className="button" onClick={openCreate}>
                  <Plus size={15} strokeWidth={1.75} /> Nueva cita
                </button>
              )}
              <button className="button button--ghost" onClick={() => navigate('/disponibilidad')}>
                Ir a disponibilidad <ArrowRight size={15} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ) : view === 'table' ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Profesional</th><th>Servicio</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={item.clientName || 'Cliente'} size="sm" />
                        <span className="cell-person__meta"><strong>{item.clientName || 'Cliente'}</strong></span>
                      </div>
                    </td>
                    <td>{item.professionalName || '—'}</td>
                    <td>{item.serviceName || '—'}</td>
                    <td>{formatMoment(item.start)}</td>
                    <td>{formatMoment(item.end)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{renderActions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="appointment-cards">
            {groupedItems.map(([day, group]) => (
              <section className="appointment-day" key={day}>
                <div className="appointment-day__head">
                  <strong>{dayjs.utc(day).format('dddd, D [de] MMMM')}</strong>
                  <span className="badge">{group.length} citas</span>
                </div>
                {group.map((item) => (
                  <article className="appointment-card" key={item.id}>
                    <div className="appointment-card__top">
                      <span className="appointment-card__time">{timeKey(item.start)} – {timeKey(item.end)}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="appointment-card__person">
                      <Avatar name={item.clientName || 'Cliente'} size="sm" />
                      <span>
                        <strong>{item.clientName || 'Cliente'}</strong>
                        <small>{item.serviceName || 'Servicio'} · {item.professionalName || 'Profesional'}</small>
                      </span>
                    </div>
                    {item.notes && <p className="appointment-card__notes">{item.notes}</p>}
                    <div className="appointment-card__actions">{renderActions(item)}</div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {booking && (
        <BookingModal
          initial={booking}
          catalogs={{ clients, professionals, services }}
          isClient={isClient}
          onClose={() => setBooking(null)}
          onCreated={handleCreated}
        />
      )}

      {modalMode === 'reschedule' && (
        <Modal
          title="Reprogramar cita"
          description="Elige una nueva fecha y hora para esta reserva."
          onClose={() => setModalMode(null)}
        >
          <form onSubmit={saveReschedule}>
            <div className="form-row">
              <div className="field">
                <span className="field__label">Fecha</span>
                <DatePicker value={form.date} onChange={(value) => setForm((current) => ({ ...current, date: value }))} min={dayjs().format('YYYY-MM-DD')} placeholder="Selecciona una fecha" icon={CalendarDays} />
              </div>
              <div className="field">
                <span className="field__label">Hora</span>
                <span className="input-shell">
                  <input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} required />
                </span>
              </div>
            </div>
            <div className="form-actions section-spaced">
              <button type="button" className="button button--ghost" onClick={() => setModalMode(null)}>Cancelar</button>
              <button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Reprogramar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
