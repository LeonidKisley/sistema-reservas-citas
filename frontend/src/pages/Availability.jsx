import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { CalendarClock, CalendarDays, Clock3, Scissors, Search, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import RecommendedProfessionals from '../components/RecommendedProfessionals.jsx';
import CustomSelect from '../components/ui/CustomSelect.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import { useAppointments } from '../context/AppointmentsContext.jsx';
import { errorMessage } from '../services/api.js';
import { getAvailability } from '../services/appointmentService.js';
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

  const setField = (field) => (value) => {
    setResult(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const search = useCallback(async (event) => {
    event?.preventDefault();
    if (!form.professionalId || !form.date) {
      toast.warning('Selecciona un profesional y una fecha');
      return;
    }
    setLoading(true);
    try {
      const params = { professionalId: form.professionalId, date: form.date };
      if (form.serviceId) params.serviceId = form.serviceId;
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

  useEffect(() => {
    if (revision === lastRevision.current) return;
    lastRevision.current = revision;
    if (hasSearched.current) search();
  }, [revision, search]);

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

  const entries = result
    ? [
        ...(result.slots || []).map((slot) => ({ ...slot, available: true })),
        ...(result.bookedSlots || []).map((slot) => ({ ...slot, available: false }))
      ].sort((a, b) => new Date(a.start) - new Date(b.start))
    : [];
  const freeCount = result?.slots?.length || 0;
  const bookedCount = result?.bookedSlots?.length || 0;

  return (
    <>
      <PageHeader
        eyebrow="Reservas"
        title="Disponibilidad"
        subtitle="Elige un horario y descubre los profesionales disponibles, o consulta la agenda de uno en concreto"
      />
      <div className="card">
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
          {mode === 'professional' && (
            <div className="field">
              <span className="field__label">Profesional</span>
              <CustomSelect
                value={form.professionalId}
                onChange={setField('professionalId')}
                options={professionalOptions}
                placeholder="Selecciona profesional"
                icon={Scissors}
                ariaLabel="Profesional"
              />
            </div>
          )}
          <div className="field">
            <span className="field__label">Servicio (opcional)</span>
            <CustomSelect
              value={form.serviceId}
              onChange={setField('serviceId')}
              options={serviceOptions}
              placeholder="Duración predeterminada"
              icon={Sparkles}
              clearable
              ariaLabel="Servicio"
            />
          </div>
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
            <button className="button" disabled={loading || catalogLoading} type="submit">
              <Search size={16} strokeWidth={1.75} />
              {loading ? 'Consultando…' : 'Consultar horarios'}
            </button>
          )}
        </form>
      </div>

      {mode === 'time' && (
        <div className="card section-spaced">
          <div className="card__header">
            <div>
              <span className="eyebrow">Paso 1 · Horario</span>
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

      {mode === 'professional' && result && (
        <div className="card section-spaced">
          <div className="card__header">
            <div>
              <span className="eyebrow">{dayjs(result.date || form.date).format('dddd, D [de] MMMM [de] YYYY')}</span>
              <div className="card-title" style={{ marginTop: 4 }}>
                Horarios del profesional
              </div>
            </div>
            <span className="badge">{freeCount} libres · {bookedCount} reservados</span>
          </div>
          {entries.length ? (
            <>
              <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                {result.durationMinutes ? `Duración de cada cita: ${result.durationMinutes} minutos.` : 'Selecciona el horario que mejor te quede.'}
              </p>
              <div className="slot-list">
                {entries.map((slot) => {
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
                    </button>
                  );
                })}
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
