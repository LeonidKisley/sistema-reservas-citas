import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Scissors,
  Search,
  Sparkles,
  Sun,
  Sunset
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import RecommendedProfessionals from '../components/RecommendedProfessionals.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import CustomSelect from '../components/ui/CustomSelect.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import LotusFlower from '../components/ui/LotusFlower.jsx';
import { useAppointments } from '../context/AppointmentsContext.jsx';
import { errorMessage } from '../services/api.js';
import { getAvailability, professionalOffersService } from '../services/appointmentService.js';
import { getProfessionals, getServices } from '../services/catalogService.js';
import { openAppointmentDetail } from '../utils/appointmentDetail.js';

const initialForm = () => ({ professionalId: '', serviceId: '', date: dayjs().format('YYYY-MM-DD') });
const TIME_OPTIONS = Array.from({ length: 22 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});
const OPEN_STATUSES = ['programada', 'confirmada'];

const canCancelBooking = (slot) => Boolean(slot.isMine)
  && OPEN_STATUSES.includes(slot.status)
  && new Date(slot.start) > new Date();

const priceLabel = (service) => `$${Number(service?.price || 0).toFixed(2)}`;

export default function Availability() {
  const navigate = useNavigate();
  const { revision, notifyAppointmentChange } = useAppointments();
  const lastRevision = useRef(revision);
  const hasSearched = useRef(false);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [mode, setMode] = useState('professional');
  const [selectedTime, setSelectedTime] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getProfessionals(), getServices()])
      .then(([professionalsResponse, servicesResponse]) => {
        if (!active) return;
        setProfessionals((professionalsResponse.data || []).filter((item) => item.active !== false));
        setServices((servicesResponse.data || []).filter((item) => item.active !== false));
      })
      .catch((error) => {
        if (active) toast.error(errorMessage(error));
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => { active = false; };
  }, []);

  const selectedService = services.find((item) => String(item.id) === String(form.serviceId));
  const serviceProfessionals = useMemo(
    () => (form.serviceId
      ? professionals.filter((item) => professionalOffersService(item, form.serviceId))
      : []),
    [professionals, form.serviceId]
  );

  const setField = (field) => (value) => {
    setResult(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectService = (value) => {
    setResult(null);
    setSelectedTime('');
    setForm((current) => ({ ...current, serviceId: value, professionalId: '' }));
  };

  const runSearch = useCallback(async (values = form) => {
    if (!values.professionalId || !values.date) {
      toast.warning('Selecciona un servicio, un profesional y una fecha');
      return;
    }
    setLoading(true);
    try {
      const params = { professionalId: values.professionalId, date: values.date };
      if (values.serviceId) params.serviceId = values.serviceId;
      const response = await getAvailability(params);
      setResult(response.data);
      hasSearched.current = true;
      const total = (response.data?.slots?.length || 0) + (response.data?.bookedSlots?.length || 0);
      if (!total) toast.info('No hay horarios para la fecha seleccionada');
    } catch (error) {
      setResult(null);
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [form]);

  const search = useCallback((event) => {
    event?.preventDefault();
    return runSearch(form);
  }, [form, runSearch]);

  useEffect(() => {
    if (revision === lastRevision.current) return;
    lastRevision.current = revision;
    if (hasSearched.current) search();
  }, [revision, search]);

  const chooseDate = (offset) => {
    setResult(null);
    setForm((current) => ({ ...current, date: dayjs().add(offset, 'day').format('YYYY-MM-DD') }));
  };

  const chooseProfessional = (professional) => {
    const values = { ...form, professionalId: professional.id };
    setForm(values);
    runSearch(values);
  };

  const chooseSlot = (slot) => {
    const params = new URLSearchParams({
      professionalId: form.professionalId,
      serviceId: form.serviceId,
      date: form.date,
      time: slot.startTime
    });
    toast.info('Horario seleccionado: completa los datos de la cita');
    navigate(`/citas?${params.toString()}`);
  };

  const openBooked = (slot) => openAppointmentDetail({
    appointment: slot,
    canCancel: canCancelBooking(slot),
    onCanceled: () => notifyAppointmentChange()
  });

  const chooseRecommendedProfessional = (professional) => {
    const params = new URLSearchParams({
      professionalId: professional.id,
      serviceId: form.serviceId,
      date: form.date,
      time: selectedTime
    });
    toast.info(`${professional.name} seleccionado · completa los datos de la cita`);
    navigate(`/citas?${params.toString()}`);
  };

  const serviceOptions = useMemo(() => services.map((item) => ({
    value: item.id,
    label: item.name,
    description: `${item.durationMinutes} min · ${priceLabel(item)}`,
    icon: Sparkles
  })), [services]);

  const professionalOptions = useMemo(() => serviceProfessionals.map((item) => ({
    value: item.id,
    label: `${item.firstName} ${item.lastName}`.trim(),
    description: item.specialty || 'Profesional del salón'
  })), [serviceProfessionals]);

  const entries = useMemo(() => (result
    ? [
        ...(result.slots || []).map((slot) => ({ ...slot, available: true })),
        ...(result.bookedSlots || []).map((slot) => ({ ...slot, available: false }))
      ].sort((a, b) => new Date(a.start) - new Date(b.start))
    : []), [result]);
  const freeCount = result?.slots?.length || 0;
  const bookedCount = result?.bookedSlots?.length || 0;
  const nextFree = result?.slots?.[0]?.startTime || '—';
  const morningEntries = entries.filter((slot) => Number(slot.startTime?.slice(0, 2)) < 12);
  const afternoonEntries = entries.filter((slot) => Number(slot.startTime?.slice(0, 2)) >= 12);

  const steps = [
    { label: 'Servicio', icon: Sparkles, done: Boolean(form.serviceId) },
    { label: 'Profesional', icon: Scissors, done: Boolean(form.professionalId) },
    { label: 'Horario', icon: CalendarDays, done: Boolean(result) }
  ];

  const renderSlot = (slot) => {
    const isBooked = !slot.available;
    return (
      <button
        key={`${isBooked ? 'booked' : 'free'}-${slot.id || slot.start}`}
        type="button"
        className={`slot ${isBooked ? (slot.isMine ? 'slot--reserved' : 'slot--occupied') : ''}`}
        onClick={() => (isBooked ? openBooked(slot) : chooseSlot(slot))}
      >
        {isBooked
          ? <CalendarClock size={14} strokeWidth={1.75} />
          : <Clock3 size={14} strokeWidth={1.75} />}
        <span>{slot.startTime} – {slot.endTime}</span>
        {isBooked && (
          <span className="slot__tag">
            {slot.isMine ? 'Reservado por ti' : `Reservado por ${slot.clientName || 'otro cliente'}`}
          </span>
        )}
        {isBooked && (
          <span className={`slot__lotus ${slot.isMine ? 'slot__lotus--mine' : 'slot__lotus--other'}`} aria-hidden="true">
            <LotusFlower />
          </span>
        )}
      </button>
    );
  };

  const renderSlotGroup = (label, icon, slots) => (
    <section className="slot-group">
      <div className="slot-group__head">
        <span className="slot-group__icon">{icon}</span>
        <strong>{label}</strong>
        <span className="badge">{slots.length} horarios</span>
      </div>
      {slots.length ? (
        <div className="slot-list">{slots.map(renderSlot)}</div>
      ) : (
        <p className="empty">Sin horarios en esta franja.</p>
      )}
    </section>
  );

  return (
    <>
      <PageHeader
        eyebrow="Reservas"
        title="Disponibilidad"
        subtitle="Elige un servicio, descubre quién puede atenderte y reserva en el horario que mejor te quede"
      />
      <div className="card">
        <ol className="booking-steps">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const previousDone = index === 0 || steps[index - 1].done;
            const active = !step.done && previousDone;
            return (
              <li
                key={step.label}
                className={`booking-steps__item ${step.done ? 'booking-steps__item--done' : ''} ${active ? 'booking-steps__item--active' : ''}`}
              >
                <span className="booking-steps__icon">
                  {step.done ? <Check size={13} strokeWidth={2} /> : <StepIcon size={13} strokeWidth={1.75} />}
                </span>
                <span className="booking-steps__text">
                  <small>Paso {index + 1}</small>
                  <strong>{step.label}</strong>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mode-switch" role="group" aria-label="Modo de búsqueda">
          <button
            type="button"
            className={`mode-switch__button ${mode === 'professional' ? 'mode-switch__button--active' : ''}`}
            onClick={() => setMode('professional')}
          >
            <Scissors size={14} strokeWidth={1.75} /> Por profesional
          </button>
          <button
            type="button"
            className={`mode-switch__button ${mode === 'time' ? 'mode-switch__button--active' : ''}`}
            onClick={() => setMode('time')}
          >
            <Clock3 size={14} strokeWidth={1.75} /> Por horario (recomendados)
          </button>
        </div>
        <form className="toolbar" onSubmit={search}>
          <div className="field">
            <span className="field__label">Servicio</span>
            <CustomSelect
              value={form.serviceId}
              onChange={selectService}
              options={serviceOptions}
              placeholder="Elige primero el servicio"
              icon={Sparkles}
              ariaLabel="Servicio"
              clearable
              disabled={loading || catalogLoading}
            />
          </div>
          {mode === 'professional' && (
            <div className="field">
              <span className="field__label">Profesional</span>
              <CustomSelect
                value={form.professionalId}
                onChange={setField('professionalId')}
                options={professionalOptions}
                placeholder={form.serviceId ? 'Selecciona profesional' : 'Elige primero un servicio'}
                icon={Scissors}
                ariaLabel="Profesional"
                disabled={!form.serviceId || loading || catalogLoading}
              />
            </div>
          )}
          <div className="field">
            <span className="field__label">Fecha</span>
            <DatePicker
              value={form.date}
              onChange={setField('date')}
              min={dayjs().format('YYYY-MM-DD')}
              placeholder="Selecciona una fecha"
              icon={CalendarDays}
            />
          </div>
          {mode === 'professional' && (
            <button className="button" disabled={loading || catalogLoading || !form.serviceId || !form.professionalId} type="submit">
              <Search size={16} strokeWidth={1.75} />
              {loading ? 'Consultando…' : 'Consultar horarios'}
            </button>
          )}
        </form>
        {!form.serviceId && (
          <p className="field__hint field__hint--spaced">Primero elige un servicio para mostrarte solo los profesionales que lo ofrecen.</p>
        )}
      </div>

      {mode === 'time' && (
        <div className="card section-spaced">
          <div className="card__header">
            <div>
              <span className="eyebrow">Paso 3 · Horario</span>
              <div className="card-title" style={{ marginTop: 4 }}>Toca un horario</div>
            </div>
            <span className="badge">{dayjs(form.date).format('ddd, D MMM')}</span>
          </div>
          <div className="slot-list section-spaced">
            {TIME_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`slot ${selectedTime === option ? 'slot--selected' : ''}`}
                onClick={() => setSelectedTime(option)}
              >
                {option}
              </button>
            ))}
          </div>
          {selectedTime && (
            <RecommendedProfessionals
              date={form.date}
              time={selectedTime}
              serviceId={form.serviceId}
              onSelect={chooseRecommendedProfessional}
            />
          )}
        </div>
      )}

      {mode === 'professional' && !result && (
        <div className="card section-spaced">
          <div className="card__header">
            <div>
              <span className="eyebrow">Paso 1 · Servicio</span>
              <div className="card-title" style={{ marginTop: 4 }}>¿Qué te gustaría reservar?</div>
            </div>
            <span className="badge">{services.length} servicios activos</span>
          </div>
          <div className="service-pick">
            {services.slice(0, 6).map((service) => (
              <button
                key={service.id}
                type="button"
                className={`service-pick__card ${form.serviceId === service.id ? 'service-pick__card--active' : ''}`}
                onClick={() => selectService(service.id)}
              >
                <span className="service-pick__icon"><Sparkles size={17} strokeWidth={1.75} /></span>
                <span className="service-pick__body">
                  <strong>{service.name}</strong>
                  <small>{service.durationMinutes} min · {priceLabel(service)}</small>
                </span>
                <ArrowRight size={15} strokeWidth={1.75} />
              </button>
            ))}
          </div>
          {!services.length && <p className="empty">Todavía no hay servicios activos en el catálogo.</p>}

          <div className="quick-dates">
            <span className="field__label">Fecha rápida</span>
            <div className="quick-dates__options">
              <button
                type="button"
                className={`quick-dates__chip ${form.date === dayjs().format('YYYY-MM-DD') ? 'quick-dates__chip--active' : ''}`}
                onClick={() => chooseDate(0)}
              >
                Hoy · {dayjs().format('D MMM')}
              </button>
              <button
                type="button"
                className={`quick-dates__chip ${form.date === dayjs().add(1, 'day').format('YYYY-MM-DD') ? 'quick-dates__chip--active' : ''}`}
                onClick={() => chooseDate(1)}
              >
                Mañana · {dayjs().add(1, 'day').format('D MMM')}
              </button>
            </div>
          </div>

          {form.serviceId && (
            <div className="section-spaced">
              <div className="card__header">
                <div>
                  <span className="eyebrow">Paso 2 · Profesional</span>
                  <div className="card-title" style={{ marginTop: 4 }}>
                    Profesionales que ofrecen {selectedService?.name || 'este servicio'}
                  </div>
                </div>
                <span className="badge">{serviceProfessionals.length} disponibles</span>
              </div>
              {serviceProfessionals.length ? (
                <div className="rec-list">
                  {serviceProfessionals.map((professional) => (
                    <button
                      key={professional.id}
                      type="button"
                      className={`rec-card professional-pick ${form.professionalId === professional.id ? 'rec-card--selected' : ''}`}
                      onClick={() => chooseProfessional(professional)}
                    >
                      <Avatar name={`${professional.firstName} ${professional.lastName}`} size="md" />
                      <span className="rec-card__info">
                        <span className="rec-card__name">{`${professional.firstName} ${professional.lastName}`.trim()}</span>
                        <span className="rec-card__meta">{professional.specialty || 'Profesional del salón'}</span>
                        <span className="rec-card__score">{selectedService?.durationMinutes || '—'} min · {priceLabel(selectedService)}</span>
                      </span>
                      <span className="professional-pick__cta">Ver horarios <ArrowRight size={13} strokeWidth={1.75} /></span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="empty">No hay profesionales asignados a este servicio. Prueba con otro.</p>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'professional' && result && (
        <div className="card section-spaced">
          <div className="card__header">
            <div>
              <span className="eyebrow">{dayjs(result.date || form.date).format('dddd, D [de] MMMM [de] YYYY')}</span>
              <div className="card-title" style={{ marginTop: 4 }}>
                Horarios de {professionalOptions.find((item) => item.value === form.professionalId)?.label || 'tu profesional'}
              </div>
            </div>
            <span className="badge">{freeCount} libres · {bookedCount} reservados</span>
          </div>

          <div className="grid grid-4">
            <div className="kpi">
              <div className="kpi__top"><span className="kpi-label">Libres</span><span className="kpi__icon"><Clock3 size={16} strokeWidth={1.75} /></span></div>
              <div className="kpi-value">{freeCount}</div>
              <div className="kpi-hint">Horarios disponibles</div>
            </div>
            <div className="kpi">
              <div className="kpi__top"><span className="kpi-label">Reservados</span><span className="kpi__icon"><CalendarClock size={16} strokeWidth={1.75} /></span></div>
              <div className="kpi-value">{bookedCount}</div>
              <div className="kpi-hint">Con cita confirmada</div>
            </div>
            <div className="kpi">
              <div className="kpi__top"><span className="kpi-label">Duración</span><span className="kpi__icon"><Sparkles size={16} strokeWidth={1.75} /></span></div>
              <div className="kpi-value">{result.durationMinutes || '—'}</div>
              <div className="kpi-hint">Minutos por cita</div>
            </div>
            <div className="kpi">
              <div className="kpi__top"><span className="kpi-label">Próximo hueco</span><span className="kpi__icon"><CalendarDays size={16} strokeWidth={1.75} /></span></div>
              <div className="kpi-value kpi-value--time">{nextFree}</div>
              <div className="kpi-hint">Primer horario libre</div>
            </div>
          </div>

          {entries.length ? (
            <>
              <p className="muted" style={{ fontSize: 12, margin: '18px 0 10px' }}>
                {selectedService
                  ? `${selectedService.name} · ${selectedService.durationMinutes} min · ${priceLabel(selectedService)}`
                  : 'Selecciona el horario que mejor te quede.'}
              </p>
              <div className="slot-legend">
                <span><i className="slot-legend__dot slot-legend__dot--free" /> Libre</span>
                <span><LotusFlower /> Reservado por ti</span>
                <span><span className="slot-legend__lotus slot-legend__lotus--other"><LotusFlower /></span> Reservado por otro cliente</span>
              </div>
              <div className="slot-groups">
                {renderSlotGroup('Mañana', <Sun size={15} strokeWidth={1.75} />, morningEntries)}
                {renderSlotGroup('Tarde', <Sunset size={15} strokeWidth={1.75} />, afternoonEntries)}
              </div>
            </>
          ) : (
            <p className="empty">No hay horarios para la combinación seleccionada. Prueba con otra fecha o profesional.</p>
          )}
        </div>
      )}
    </>
  );
}
