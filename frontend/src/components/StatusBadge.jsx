const LABELS = {
  programada: 'Programada',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  'no asistió': 'No asistió'
};

const CLASSES = {
  programada: 'badge--programada',
  confirmada: 'badge--confirmada',
  completada: 'badge--completada',
  cancelada: 'badge--cancelada',
  'no asistió': 'badge--no-asistio'
};

export default function StatusBadge({ status, children }) {
  return (
    <span className={`badge ${CLASSES[status] || 'badge--neutral'}`}>
      {children || LABELS[status] || status || '—'}
    </span>
  );
}
