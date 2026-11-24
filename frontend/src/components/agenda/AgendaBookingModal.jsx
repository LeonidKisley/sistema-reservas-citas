import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { CalendarDays, Clock3, LockKeyhole, Scissors, Sparkles, UserRound } from 'lucide-react';
import Modal from '../Modal.jsx';
import CustomSelect from '../ui/CustomSelect.jsx';
import { errorMessage } from '../../services/api.js';
import {
  createAppointment,
  getAvailability,
  getRecommendedProfessionals,
  professionalOffersService,
  rankProfessionalsByService
} from '../../services/appointmentService.js';
import { formatSlotLabel } from './agendaUtils.js';
import { formatPrice } from '../../utils/format.js';

export default function AgendaBookingModal({ initial, catalogs = {}, isClient = false, onClose, onCreated }) {
  const { clients = [], professionals = [], services = [] } = catalogs;
  const { date, clientId: initialClient, professionalId: initialProfessional, serviceId: initialService } = initial;

  const initialServiceId = services.some((item) => String(item.id) === String(initialService)) ? initialService : '';
  const preferredProfessional = professionals.find((item) => item.id === initialProfessional);

  const [clientId, setClientId] = useState(initialClient || '');
  const [serviceId, setServiceId] = useState(initialServiceId || '');
  const [professionalId, setProfessionalId] = useState(
    professionalOffersService(preferredProfessional, initialServiceId) ? initialProfessional : ''
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [time, setTime] = useState(initial.time || '');
  const [unlocked, setUnlocked] = useState(false);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotNotice, setSlotNotice] = useState(null);

  useEffect(() => {
    if (!date || !time || !serviceId) {
      setRecommended([]);
      return undefined;
    }
    let active = true;
    getRecommendedProfessionals({ date, time, serviceId })
      .then((response) => {
        if (active) setRecommended(response.data?.professionals || []);
      })
      .catch(() => { if (active) setRecommended([]); });
    return () => { active = false; };
  }, [date, time, serviceId]);

  useEffect(() => {
    if (!professionalId || !date) {
      setSlots([]);
      setSlotNotice(null);
      return undefined;
    }
    let active = true;
    setSlotsLoading(true);
    getAvailability({
      professionalId,
      date,
      ...(serviceId ? { serviceId } : {}),
      ...(time && !unlocked ? { fromTime: time } : {})
    })
      .then((response) => {
        if (!active) return;
        const options = response.data?.slots || [];
        setSlots(options);
        if (!unlocked && time && !options.some((slot) => slot.startTime === time)) {
          setSlotNotice({
            title: `El horario ${time} no permite completar esta cita con la combinación elegida.`,
            suggestedTime: options[0]?.startTime || null
          });
        } else {
          setSlotNotice(null);
        }
      })
      .catch(() => {
        if (active) {
          setSlots([]);
          setSlotNotice(null);
        }
      })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [professionalId, date, serviceId, time, unlocked]);

  const selectedService = services.find((item) => String(item.id) === String(serviceId));
  const selectedProfessional = professionals.find((item) => item.id === professionalId);
  const ranked = useMemo(
    () => rankProfessionalsByService(professionals, serviceId, recommended),
    [professionals, serviceId, recommended]
  );

  const clientOptions = useMemo(() => clients.map((item) => ({
    value: item.id,
    label: `${item.firstName} ${item.lastName}`.trim(),
    description: item.email || 'Cliente'
  })), [clients]);

  const serviceOptions = useMemo(() => services.map((item) => ({
    value: item.id,
    label: item.name,
    description: `${item.durationMinutes} min · ${formatPrice(item.price)}`,
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

  const setField = (field) => (value) => {
    setErrors((current) => ({ ...current, [field]: '' }));
    setSlotNotice(null);
    if (field === 'clientId') setClientId(value);
    if (field === 'serviceId') {
      setServiceId(value);
      setRecommended([]);
      setProfessionalId(professionalOffersService(preferredProfessional, value) ? preferredProfessional.id : '');
    }
    if (field === 'professionalId') setProfessionalId(value);
  };

  const save = async (event) => {
    event.preventDefault();
    const next = {};
    if (!clientId) next.clientId = 'Selecciona un cliente.';
    if (!serviceId) next.serviceId = 'Selecciona un servicio.';
    if (!professionalId) next.professionalId = 'Selecciona un profesional.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const response = await createAppointment({ clientId, professionalId, serviceId, date, time });
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
      title="Nueva Cita"
      description="Elige primero el servicio y después quién puede atenderte en este horario."
      onClose={onClose}
      wide
    >
      <form onSubmit={save} noValidate>
        <div className="agenda-booking__when">
          <CalendarDays size={19} strokeWidth={1.75} />
          <span>
            <small>Fecha y horario seleccionados · solo lectura</small>
            <strong>{formatSlotLabel(date, time)}</strong>
          </span>
          <LockKeyhole size={16} strokeWidth={1.75} aria-label="Horario bloqueado" />
          {!unlocked && (
            <button type="button" className="inline-link-button" onClick={() => setUnlocked(true)}>Cambiar horario</button>
          )}
        </div>

        <div className="form-row section-spaced">
          <div className="field">
            <span className="field__label">Servicio *</span>
            <CustomSelect value={serviceId} onChange={setField('serviceId')} options={serviceOptions} placeholder="Selecciona servicio" icon={Sparkles} ariaLabel="Servicio" disabled={saving} />
            {errors.serviceId && <small className="field__hint field__hint--error">{errors.serviceId}</small>}
          </div>
          {!isClient && (
            <div className="field">
              <span className="field__label">Cliente *</span>
              <CustomSelect value={clientId} onChange={setField('clientId')} options={clientOptions} placeholder="Selecciona cliente" icon={UserRound} ariaLabel="Cliente" disabled={saving} />
              {errors.clientId && <small className="field__hint field__hint--error">{errors.clientId}</small>}
            </div>
          )}
        </div>

        <div className="field section-spaced">
          <span className="field__label">Profesional *</span>
          <CustomSelect
            value={professionalId}
            onChange={setField('professionalId')}
            options={professionalOptions}
            placeholder={serviceId ? 'Selecciona profesional' : 'Elige primero un servicio'}
            icon={Scissors}
            ariaLabel="Profesional"
            disabled={!serviceId || saving}
          />
          {!serviceId ? (
            <small className="field__hint">Elige un servicio para ver los profesionales que pueden atenderte.</small>
          ) : ranked.availableIds.length ? (
            <small className="field__hint">Recomendados primero; después, disponibles para {selectedService?.name || 'este servicio'} en este horario.</small>
          ) : (
            <small className="field__hint">Profesionales que ofrecen {selectedService?.name || 'este servicio'}.</small>
          )}
          {errors.professionalId && <small className="field__hint field__hint--error">{errors.professionalId}</small>}
        </div>

        {slotNotice && (
          <div className="booking-alert section-spaced" role="status">
            <span>{slotNotice.title}</span>
            <div className="row-actions">
              {slotNotice.suggestedTime && (
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => {
                    setTime(slotNotice.suggestedTime);
                    setSlotNotice(null);
                  }}
                >
                  Usar este horario · {slotNotice.suggestedTime}
                </button>
              )}
              <button type="button" className="button button--ghost button--small" onClick={() => { setUnlocked(true); setSlotNotice(null); }}>
                Elegir otro horario
              </button>
            </div>
          </div>
        )}

        {unlocked && (
          <div className="section-spaced">
            <div className="field__label" style={{ marginBottom: 8 }}>Horarios disponibles</div>
            {!professionalId ? (
              <div className="empty">Selecciona un profesional para ver horarios disponibles.</div>
            ) : slotsLoading ? (
              <div className="empty">Consultando horarios…</div>
            ) : slots.length ? (
              <div className="slot-list">
                {slots.map((slot) => (
                  <button
                    key={`${slot.start}-${slot.end}`}
                    type="button"
                    className={`slot ${time === slot.startTime ? 'slot--selected' : ''}`}
                    onClick={() => { setTime(slot.startTime); setErrors((current) => ({ ...current, time: '' })); }}
                  >
                    <span className="slot__dot" />
                    {slot.startTime} – {slot.endTime}
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty">No hay horarios libres para esta combinación.</div>
            )}
          </div>
        )}

        <div className="agenda-booking__summary">
          <span className="eyebrow">Resumen en vivo</span>
          <div className="agenda-booking__summary-grid">
            <div><span>Servicio</span><strong>{selectedService?.name || 'Por seleccionar'}</strong></div>
            <div><span>Profesional</span><strong>{selectedProfessional ? `${selectedProfessional.firstName} ${selectedProfessional.lastName}`.trim() : 'Por seleccionar'}</strong></div>
            <div><span>Horario</span><strong><Clock3 size={13} strokeWidth={1.75} /> {formatSlotLabel(date, time)}</strong></div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="button" disabled={saving}>{saving ? 'Guardando…' : 'Reservar cita'}</button>
        </div>
      </form>
    </Modal>
  );
}
