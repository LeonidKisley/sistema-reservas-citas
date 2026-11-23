import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { CalendarDays, Check, Clock3, Scissors, Sparkles, UserRound } from 'lucide-react';
import Modal from './Modal.jsx';
import RecommendedProfessionals from './RecommendedProfessionals.jsx';
import CustomSelect from './ui/CustomSelect.jsx';
import { TextArea } from './ui/TextField.jsx';
import { errorMessage } from '../services/api.js';
import {
  createAppointment,
  getAvailability,
  getRecommendedProfessionals,
  professionalOffersService,
  rankProfessionalsByService
} from '../services/appointmentService.js';
import { formatSlotLabel, hourEnd } from './agenda/agendaUtils.js';

const buildForm = (initial = {}) => ({
  clientId: initial.clientId || '',
  professionalId: initial.professionalId || '',
  serviceId: initial.serviceId || '',
  date: initial.date || dayjs().format('YYYY-MM-DD'),
  time: initial.time || '',
  notes: ''
});

export default function BookingModal({ initial = {}, catalogs, isClient = false, onClose, onCreated }) {
  const { clients = [], professionals = [], services = [] } = catalogs;
  const slotLocked = Boolean(initial.date && initial.time);
  const preferredProfessional = professionals.find((item) => item.id === initial.professionalId);
  const initialServiceId = services.some((item) => String(item.id) === String(initial.serviceId)) ? initial.serviceId : '';

  const [form, setForm] = useState(() => {
    const base = buildForm(initial);
    base.serviceId = initialServiceId;
    base.professionalId = professionalOffersService(preferredProfessional, initialServiceId) ? initial.professionalId : '';
    return base;
  });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [recommended, setRecommended] = useState([]);

  const selectedService = services.find((item) => String(item.id) === String(form.serviceId));
  const selectedProfessional = professionals.find((item) => item.id === form.professionalId);
  const selectedSlot = slots.find((slot) => slot.startTime === form.time);
  const selectedSlotLabel = form.time
    ? (slotLocked ? `${form.time} - ${hourEnd(form.time)}` : (selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : form.time))
    : 'Selecciona un horario disponible';
  const endTimeLabel = form.time ? (selectedSlot?.endTime || hourEnd(form.time)) : '—';
  const bookingSteps = [
    { label: 'Servicio', icon: Sparkles, done: Boolean(form.serviceId) },
    { label: 'Profesional', icon: Scissors, done: Boolean(form.professionalId) },
    { label: 'Horario', icon: Clock3, done: Boolean(form.time) },
    { label: 'Confirmar', icon: Check, done: false }
  ];
  const durationLabel = selectedService ? `${selectedService.durationMinutes} min` : '—';
  const priceLabel = selectedService ? `$${Number(selectedService.price || 0).toFixed(2)}` : '—';

  useEffect(() => {
    if (!form.date || !form.time || !form.serviceId) {
      setRecommended([]);
      return undefined;
    }
    let active = true;
    getRecommendedProfessionals({ date: form.date, time: form.time, serviceId: form.serviceId })
      .then((response) => {
        if (active) setRecommended(response.data?.professionals || []);
      })
      .catch(() => { if (active) setRecommended([]); });
    return () => { active = false; };
  }, [form.date, form.time, form.serviceId]);

  const ranked = useMemo(
    () => rankProfessionalsByService(professionals, form.serviceId, recommended),
    [professionals, form.serviceId, recommended]
  );

  const clientOptions = useMemo(() => clients.map((item) => ({
    value: item.id,
    label: `${item.firstName} ${item.lastName}`.trim(),
    description: item.document || item.email || 'Cliente'
  })), [clients]);

  const serviceOptions = useMemo(() => services.map((item) => ({
    value: item.id,
    label: item.name,
    description: `${item.durationMinutes} min · $${Number(item.price || 0).toFixed(2)}`,
    icon: Sparkles
  })), [services]);

  const professionalOptions = useMemo(() => ranked.ordered.map((item) => {
    const isRecommended = ranked.recommendedIds.includes(String(item.id));
    const isAvailable = ranked.availableIds.includes(String(item.id));
    const detail = isRecommended
      ? `★ Recomendado · ${item.specialty || 'Menor carga de trabajo'}`
      : (isAvailable ? `Disponible · ${item.specialty || 'Horario libre'}` : (item.specialty || 'Atiende este servicio'));
    return {
      value: item.id,
      label: `${item.firstName} ${item.lastName}`.trim(),
      description: detail
    };
  }), [ranked]);

  const loadSlots = async () => {
    if (!form.professionalId || !form.date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const params = { professionalId: form.professionalId, date: form.date };
      if (form.serviceId) params.serviceId = form.serviceId;
      const response = await getAvailability(params);
      setSlots(response.data?.slots || []);
    } catch (error) {
      setSlots([]);
      toast.error(errorMessage(error));
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (!slotLocked && form.professionalId && form.date) loadSlots();
  }, [slotLocked, form.professionalId, form.date, form.serviceId]);

  const setField = (field) => (value) => {
    setErrors((current) => ({ ...current, [field]: '' }));
    if (field === 'serviceId') setRecommended([]);
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'serviceId') {
        next.professionalId = professionalOffersService(preferredProfessional, value) ? preferredProfessional.id : '';
      }
      if (!slotLocked && (field === 'professionalId' || field === 'serviceId' || field === 'date')) {
        next.time = field === 'date' ? current.time : '';
      }
      return next;
    });
    if (!slotLocked && field !== 'notes' && field !== 'clientId') setSlots([]);
  };

  const validate = () => {
    const next = {};
    if (!form.clientId) next.clientId = 'Selecciona un cliente.';
    if (!form.serviceId) next.serviceId = 'Selecciona un servicio.';
    if (!form.professionalId) next.professionalId = 'Selecciona un profesional.';
    if (!form.date) next.date = 'La fecha es obligatoria.';
    if (!form.time) next.time = 'Selecciona un horario disponible.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const response = await createAppointment({
        clientId: form.clientId,
        professionalId: form.professionalId,
        serviceId: form.serviceId,
        date: form.date,
        time: form.time,
        notes: form.notes || undefined
      });
      toast.success('Cita registrada. El horario quedó reservado en la agenda.');
      if (onCreated) await onCreated(response.data);
      else onClose?.();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Nueva cita"
      description={slotLocked ? 'Confirma los datos para reservar este espacio.' : 'Elige primero el servicio y después quién puede atenderte.'}
      onClose={onClose}
      wide
    >
      <form onSubmit={save} noValidate>
        <div className={`booking-summary ${slotLocked ? 'booking-summary--locked' : ''}`}>
          <CalendarDays size={17} strokeWidth={1.75} />
          <span>
            <strong>{formatSlotLabel(form.date, form.time)}</strong>
            <small>{slotLocked ? 'Fecha y horario seleccionados desde la agenda · solo lectura' : 'Fecha y horario de la reserva'}</small>
          </span>
        </div>

        <ol className="booking-steps booking-steps--modal">
          {bookingSteps.map((step, index) => {
            const StepIcon = step.icon;
            const previousDone = index === 0 || bookingSteps[index - 1].done;
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

        <div className="form-row section-spaced">
          <div className="field">
            <span className="field__label">Servicio *</span>
            <CustomSelect value={form.serviceId} onChange={setField('serviceId')} options={serviceOptions} placeholder="Selecciona servicio" icon={Sparkles} ariaLabel="Servicio" disabled={saving} />
            {errors.serviceId && <small className="field__hint field__hint--error">{errors.serviceId}</small>}
          </div>
          <div className="field">
            <span className="field__label">Cliente *</span>
            <CustomSelect value={form.clientId} onChange={setField('clientId')} options={clientOptions} placeholder="Selecciona cliente" icon={UserRound} disabled={isClient || saving} ariaLabel="Cliente" />
            {errors.clientId && <small className="field__hint field__hint--error">{errors.clientId}</small>}
          </div>
        </div>

        <div className="form-row section-spaced">
          <div className="field">
            <span className="field__label">Profesional *</span>
            <CustomSelect
              value={form.professionalId}
              onChange={setField('professionalId')}
              options={professionalOptions}
              placeholder={form.serviceId ? 'Selecciona profesional' : 'Elige primero un servicio'}
              icon={Scissors}
              ariaLabel="Profesional"
              disabled={!form.serviceId || saving}
            />
            {!form.serviceId ? (
              <small className="field__hint">Elige un servicio para ver los profesionales que pueden atenderte.</small>
            ) : ranked.availableIds.length ? (
              <small className="field__hint">Recomendados primero; después, disponibles para {selectedService?.name || 'este servicio'}.</small>
            ) : (
              <small className="field__hint">Profesionales que ofrecen {selectedService?.name || 'este servicio'}.</small>
            )}
            {errors.professionalId && <small className="field__hint field__hint--error">{errors.professionalId}</small>}
          </div>
          <div className="field">
            <span className="field__label">{slotLocked ? 'Horario bloqueado' : 'Horario seleccionado *'}</span>
            <div className="input-shell">
              <Clock3 size={17} strokeWidth={1.75} className="input-shell__icon" />
              <input value={selectedSlotLabel} readOnly aria-label="Horario seleccionado" />
            </div>
            {errors.time && <small className="field__hint field__hint--error">{errors.time}</small>}
          </div>
        </div>

        {!slotLocked && (
          <div className="section-spaced">
            <div className="field__label" style={{ marginBottom: 8 }}>Horarios disponibles</div>
            {!form.professionalId ? (
              <div className="empty">{form.serviceId ? 'Selecciona un profesional para ver horarios disponibles.' : 'Selecciona un servicio y un profesional para ver horarios.'}</div>
            ) : slotsLoading ? (
              <div className="empty">Consultando horarios…</div>
            ) : slots.length > 0 ? (
              <div className="slot-list">
                {slots.map((slot) => (
                  <button
                    key={`${slot.start}-${slot.end}`}
                    type="button"
                    className={`slot ${form.time === slot.startTime ? 'slot--selected' : ''}`}
                    onClick={() => { setForm((current) => ({ ...current, time: slot.startTime })); setErrors((current) => ({ ...current, time: '' })); }}
                  >
                    <span className="slot__dot" />
                    {slot.startTime} – {slot.endTime}
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">No hay horarios libres para esta fecha.</div>
            )}
          </div>
        )}

        {form.date && form.time && (
          <RecommendedProfessionals
            date={form.date}
            time={form.time}
            serviceId={form.serviceId}
            serviceName={selectedService?.name}
            selectedId={form.professionalId}
            onSelect={(professional) => {
              setErrors((current) => ({ ...current, professionalId: '' }));
              setForm((current) => ({ ...current, professionalId: professional.id }));
            }}
          />
        )}

        <div className="section-spaced">
          <TextArea label="Notas (opcional)" rows="2" value={form.notes} onChange={setField('notes')} maxLength={500} placeholder="Detalles que el equipo debe conocer" />
        </div>

        <div className="booking-details">
          <span className="eyebrow">Resumen de la reserva</span>
          <div className="booking-details__grid">
            <div><span>Servicio</span><strong>{selectedService?.name || 'Por seleccionar'}</strong></div>
            <div><span>Profesional</span><strong>{selectedProfessional ? `${selectedProfessional.firstName} ${selectedProfessional.lastName}`.trim() : 'Por seleccionar'}</strong></div>
            <div><span>Fecha y horario</span><strong>{formatSlotLabel(form.date, form.time)}</strong></div>
            <div><span>Duración / Precio</span><strong>{durationLabel} · {priceLabel}</strong></div>
            <div><span>Fin estimado</span><strong>{endTimeLabel}</strong></div>
            <div><span>Cancelación</span><strong>Desde Mis citas</strong></div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancelar</button>
          <button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Reservar cita'}</button>
        </div>
      </form>
    </Modal>
  );
}
