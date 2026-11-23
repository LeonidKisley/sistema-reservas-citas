import { X } from 'lucide-react';

export default function Modal({ title, description, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div>
            <h3>{title}</h3>
            {description && <p className="card-subtitle">{description}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar ventana">
            <X size={19} strokeWidth={1.75} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
