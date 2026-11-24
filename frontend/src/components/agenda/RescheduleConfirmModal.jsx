import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { ArrowRight } from 'lucide-react';
import Modal from '../Modal.jsx';
import { formatSlotLabel } from './agendaUtils.js';

dayjs.extend(utc);

const slotLabel = (date, time, end) => `${formatSlotLabel(date, time)} – ${dayjs.utc(end).format('HH:mm')}`;

export default function RescheduleConfirmModal({ request, saving = false, onConfirm, onClose }) {
  if (!request) return null;

  const currentStart = dayjs.utc(request.currentStart);
  const nextStart = dayjs.utc(request.start);
  const duration = dayjs.utc(request.end).diff(nextStart, 'minute');
  const currentLabel = slotLabel(currentStart.format('YYYY-MM-DD'), currentStart.format('HH:mm'), request.currentEnd);
  const nextLabel = slotLabel(request.date, request.time, request.end);

  return (
    <Modal
      title="Confirmar reprogramación"
      description="Revisa el cambio antes de guardarlo en la agenda."
      onClose={onClose}
    >
      <div className="detail-row">
        <span>Horario actual</span>
        <strong>{currentLabel}</strong>
      </div>
      <div className="row-actions" style={{ justifyContent: 'center', color: 'var(--primary)', margin: '8px 0' }}>
        <ArrowRight size={18} strokeWidth={1.75} />
      </div>
      <div className="detail-row">
        <span>Nuevo horario</span>
        <strong>{nextLabel}</strong>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Se conserva la duración de {duration} minutos. Puedes cancelar para mantener la cita en su horario original.
      </p>
      <div className="form-actions">
        <button type="button" className="button button--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
        <button type="button" className="button" onClick={onConfirm} disabled={saving}>
          {saving ? 'Guardando…' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}
