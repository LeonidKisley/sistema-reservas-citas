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
import { mondayOf } from '../components/agenda/agendaUtils.js';
import { useAppointments } from '../context/AppointmentsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';
import { getAgenda } from '../services/appointmentService.js';
import { getClients, getProfessionals, getServices } from '../services/catalogService.js';
import { openAppointmentDetail } from '../utils/appointmentDetail.js';

const EMPTY_FILTERS = { professionalId: '', serviceId: '', clientId: '' };
const OPEN_STATUSES = ['programada', 'confirmada'];

const firstBookableWeek = () => {
  const monday = mondayOf(dayjs());
  const lastSlot = dayjs.utc(`${monday.add(6, 'day').format('YYYY-MM-DD')}T19:00`);
  return lastSlot.isBefore(dayjs.utc()) ? monday.add(1, 'week') : monday;
};

export default function Agenda() {
  const { user } = useAuth();
  const { revision, notifyAppointmentChange } = useAppointments();
  const isClient = user?.role === 'Cliente';
  const canBook = ['Administrador', 'Recepcionista', 'Cliente'].includes(user?.role);
  const lastRevision = useRef(revision);

  const [weekStart, setWeekStart] = useState(firstBookableWeek);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [count, setCount] = useState(0);
  const [booking, setBooking] = useState(null);
  const [agendaEvents, setAgendaEvents] = useState([]);
  const [agendaLoading, setAgendaLoading] = useState(false);

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
    const params = {
      from: weekStart.format('YYYY-MM-DD'),
      to: weekStart.add(6, 'day').format('YYYY-MM-DD')
    };
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
  }, [weekStart, filters]);

  useEffect(() => { loadAgenda(); }, [loadAgenda]);

  useEffect(() => {
    if (revision === lastRevision.current) return;
    lastRevision.current = revision;
    loadAgenda();
  }, [revision, loadAgenda]);

  const setFilter = (field) => (value) => setFilters((current) => ({ ...current, [field]: value }));
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const openBooking = (date, time) => {
    if (dayjs.utc(`${date}T${time}`).isBefore(dayjs.utc())) {
      toast.info('Ese horario ya pasó. Elige una casilla de las próximas semanas.');
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

  return (
    <>
      <PageHeader
        eyebrow="Reservas"
        title="Agenda"
        subtitle="Selecciona un espacio libre del calendario y completa los datos para reservar al instante."
        actions={<span className="badge">{agendaLoading ? 'Actualizando…' : `${count} citas en la semana`}</span>}
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
        </div>
      </div>

      <div className="section-spaced">
        <AgendaGrid
          weekStart={weekStart}
          events={agendaEvents}
          count={count}
          loading={agendaLoading}
          onSelectSlot={openBooking}
          onSelectAppointment={showDetail}
          onPrevious={() => setWeekStart((current) => current.subtract(1, 'week'))}
          onNext={() => setWeekStart((current) => current.add(1, 'week'))}
          onToday={() => setWeekStart(firstBookableWeek())}
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
    </>
  );
}
