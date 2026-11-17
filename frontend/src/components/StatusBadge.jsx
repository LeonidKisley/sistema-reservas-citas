const LABELS = {
  programada: 'Programada',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  'no asistió': 'No asistió'
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${String(status).replace(/\s/g, '-')}`}>{LABELS[status] || status}</span>;
}
