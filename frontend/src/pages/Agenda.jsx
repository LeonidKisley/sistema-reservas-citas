import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { RotateCcw, Scissors, SlidersHorizontal, Sparkles, UserRound } from 'lucide-react';

dayjs.extend(utc);

import PageHeader from '../components/PageHeader.jsx';
import CustomSelect from '../components/ui/CustomSelect.jsx';
import AgendaGrid from '../components/agenda/AgendaGrid.jsx';
import AgendaBookingModal from '../components/agenda/AgendaBookingModal.jsx';
import RescheduleConfirmModal from '../components/agenda/RescheduleConfirmModal.jsx';
import {
  agendaRange,
  buildReschedulePreview,
  defaultAgendaAnchor,
  startOfView,
  shiftView
} from '../components/agenda/agendaUtils.js';
import { useAppointments } from '../context/AppointmentsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage, successMessage } from '../services/api.js';
import { expiredReason, minutesToTime, timeToMinutes } from '../utils/time.js';
import { getAgenda, rescheduleAppointment } from '../services/appointmentService.js';
import { getClients, getProfessionals, getServices } from '../services/catalogService.js';
import { openAppointmentDetail } from '../utils/appointmentDetail.js';

const EMPTY_FILTERS = { professionalId: '', serviceId: '', clientId: '' };
const OPEN_STATUSES = ['programada', 'confirmada'];
const VIEW_LABEL = { day: 'día', week: 'semana', month: 'mes' };

export default function Agenda() {
  const { user } = useAuth();
  const { revision, notifyAppointmentChange } = useAppointments();
  const isClient = user?.role === 'Cliente';
  const canBook = ['Administrador', 'Recepcionista', 'Cliente'].includes(user?.role);
  const canDrag = ['Administrador', 'Recepcionista'].includes(user?.role);
  const lastRevision = useRef(revision);

  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(() => defaultAgendaAnchor('week'));
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [count, setCount] = useState(0);
  const [booking, setBooking] = useState(null);
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [pendingReschedule, setPendingReschedule] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

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

  const loadAgenda = useCallback(async () => {
    setAgendaLoading(true);
    const params = { ...agendaRange(view, anchor) };
    delete params.from;
    delete params.to;
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });

    try {
      const agenda = await getAgenda(params);
      const events = (agenda.data?.events || []).map((event) => event.extendedProps || {});
      setAgendaEvents(events);
      setCount(agenda.data?.count ?? events.length);
    } catch (error) {
      setAgendaEvents([]);
      setCount(0);
      toast.error(errorMessage(error));
    } finally {
      setAgendaLoading(false);
    }
  }, [view, anchor, filters]);

  useEffect(() => { loadAgenda(); }, [loadAgenda]);

  useEffect(() => {
    if (revision === lastRevision.current) return;
    lastRevision.current = revision;
    loadAgenda();
  }, [revision, loadAgenda]);

  const setFilter = (field) => (value) => setFilters((current) => ({ ...current, [field]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const changeView = (nextView) => {
    setView(nextView);
    setAnchor((current) => startOfView(nextView, current));
  };
  const moveAnchor = (delta) => setAnchor((current) => shiftView(view, current, delta));
  const goToday = () => setAnchor(defaultAgendaAnchor(view));

  const requestReschedule = ({ appointment, date, time }) => {
    const preview = buildReschedulePreview(appointment, date, time);
    if (!preview) {
      toast.error('No se pudo preparar la reprogramación');
      return;
    }
    setPendingReschedule(preview);
  };

  const cancelReschedule = () => {
    if (rescheduling) return;
    setPendingReschedule(null);
  };

  const confirmReschedule = async () => {
    if (!pendingReschedule || rescheduling) return;
    const { appointment, date, time, start, end } = pendingReschedule;
    const previous = agendaEvents;
    setRescheduling(true);
    setAgendaEvents((current) => current.map((item) => (
      String(item.id) === String(appointment.id) ? { ...item, start, end } : item
    )));
    try {
      const response = await rescheduleAppointment(appointment.id, { date, time });
      toast.success(successMessage(response, 'Cita reprogramada en la agenda'));
      notifyAppointmentChange();
      setPendingReschedule(null);
    } catch (error) {
      setAgendaEvents(previous);
      toast.error(errorMessage(error));
    } finally {
      setRescheduling(false);
    }
  };

  const openBooking = (date, time) => {
    const reason = expiredReason(date, time);
    if (reason) {
      toast.info(reason === 'date'
        ? 'La fecha ya pasó. Elige otro día en el calendario.'
        : 'Ese horario ya pasó. Elige una casilla de las próximas semanas.');
      return;
    }
    if (!canBook) {
      toast.info('Tu perfil no tiene permisos para crear citas.');
      return;
    }
    setBooking({
      clientId: isClient ? user?.clientId || '' : clients[0]?.id || '',
      professionalId: filters.professionalId || '',
      serviceId: filters.serviceId || '',
      date,
      time
    });
  };

  const showDetail = (appointment) => openAppointmentDetail({
    appointment,
    canCancel: ['Administrador', 'Recepcionista', 'Cliente'].includes(user?.role)
      && (!isClient || appointment.isMine)
      && OPEN_STATUSES.includes(String(appointment.status || '').toLowerCase())
      && new Date(appointment.start) > new Date(),
    onCanceled: () => notifyAppointmentChange()
  });

  const handleCreated = () => {
    setBooking(null);
    notifyAppointmentChange();
  };

  const professionalOptions = useMemo(() => professionals.map((item) => ({
    value: item.id,
    label: `${item.firstName} ${item.lastName}`.trim(),
    description: item.specialty || 'Profesional del salón'
  })), [professionals]);
  const serviceOptions = useMemo(() => services.map((item) => ({ value: item.id, label: item.name, description: `${item.durationMinutes} min`, icon: Sparkles })), [services]);
  const clientOptions = useMemo(() => clients.map((item) => ({ value: item.id, label: `${item.firstName} ${item.lastName}`.trim(), description: item.email || 'Cliente' })), [clients]);

  // Sugerencia previa: evita proponer un horario donde el servicio no cabe en la jornada.
  const slotIssue = useCallback((dateKey, time) => {
    const professional = professionals.find((item) => String(item.id) === String(filters.professionalId));
    const service = services.find((item) => String(item.id) === String(filters.serviceId));
    if (!professional || !service) return null;
    const workHour = (professional.workHours || []).find((entry) => entry.dayOfWeek === dayjs.utc(dateKey).day());
    if (!workHour) return null;
    const start = timeToMinutes(time);
    const workStart = timeToMinutes(workHour.start);
    const workEnd = timeToMinutes(workHour.end);
    const duration = Number(service.durationMinutes) || 0;
    if (start === null || workStart === null || workEnd === null || workEnd <= workStart) return null;

    if (start < workStart) {
      return {
        title: `${service.name} · el profesional atiende a partir de las ${workHour.start}.`,
        suggestedTime: workHour.start
      };
    }
    const latest = workEnd - duration;
    if (latest < workStart) {
      return {
        title: `${service.name} dura ${duration} min y no cabe en la jornada de ${workHour.start}–${workHour.end}. Prueba con otro profesional o fecha.`,
        suggestedTime: null
      };
    }
    if (start + duration > workEnd) {
      const latestStart = minutesToTime(latest);
      return {
        title: `Este servicio tarda ${duration} min y el profesional cierra a las ${workHour.end}. Último horario válido: ${latestStart}`,
        suggestedTime: latestStart
      };
    }
    return null;
  }, [professionals, services, filters.professionalId, filters.serviceId]);

  return (
    <>
      <PageHeader
        eyebrow="Reservas"
        title="Agenda"
        subtitle="Selecciona un espacio libre del calendario y completa los datos para reservar al instante."
        actions={<span className="badge">{agendaLoading ? 'Actualizando…' : `${count} citas en ${VIEW_LABEL[view]}`}</span>}
      />
      <div className="card">
        <div className="toolbar">
          <div className="field">
            <span className="field__label">Profesional</span>
            <CustomSelect value={filters.professionalId} onChange={setFilter('professionalId')} options={professionalOptions} placeholder="Todos" icon={Scissors} clearable ariaLabel="Filtrar por profesional" />
          </div>
          <div className="field">
            <span className="field__label">Servicio</span>
            <CustomSelect value={filters.serviceId} onChange={setFilter('serviceId')} options={serviceOptions} placeholder="Todos" icon={Sparkles} clearable ariaLabel="Filtrar por servicio" />
          </div>
          {!isClient && (
            <div className="field">
              <span className="field__label">Cliente</span>
              <CustomSelect value={filters.clientId} onChange={setFilter('clientId')} options={clientOptions} placeholder="Todos" icon={UserRound} clearable ariaLabel="Filtrar por cliente" />
            </div>
          )}
          <button className="button" onClick={loadAgenda}>
            <SlidersHorizontal size={15} strokeWidth={1.75} /> Actualizar
          </button>
          <button className="button button--ghost" onClick={clearFilters}>
            <RotateCcw size={15} strokeWidth={1.75} /> Limpiar filtros
          </button>
        </div>
        <div className="calendar-legend">
          <span><i className="legend-dot legend-dot--free" /> Disponible · clic para reservar</span>
          <span><i className="legend-dot legend-dot--mine" /> Reservado por ti</span>
          <span><i className="legend-dot legend-dot--other" /> Reservado por otro cliente</span>
          <span><i className="legend-dot legend-dot--expired" /> Horario vencido</span>
        </div>
      </div>

      <div className="section-spaced">
        <AgendaGrid
          view={view}
          anchor={anchor}
          events={agendaEvents}
          count={count}
          loading={agendaLoading}
          canDrag={canDrag}
          user={user}
          onSelectSlot={openBooking}
          onSelectAppointment={showDetail}
          onRescheduleRequest={requestReschedule}
          onViewChange={changeView}
          onPrevious={() => moveAnchor(-1)}
          onNext={() => moveAnchor(1)}
          onToday={goToday}
          slotIssue={slotIssue}
        />
      </div>

      {booking && (
        <AgendaBookingModal
          initial={booking}
          catalogs={{ clients, professionals, services }}
          isClient={isClient}
          onClose={() => setBooking(null)}
          onCreated={handleCreated}
        />
      )}

      {pendingReschedule && (
        <RescheduleConfirmModal
          request={pendingReschedule}
          saving={rescheduling}
          onConfirm={confirmReschedule}
          onClose={cancelReschedule}
        />
      )}
    </>
  );
}
