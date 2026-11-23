import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function TextField({ label, icon: Icon, hint, prefix, suffix, type = 'text', className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const isPassword = type === 'password';
  const inputType = isPassword && visible ? 'text' : type;
  const hasAffix = Boolean(prefix || suffix);

  return (
    <label className={`field ${className}`} htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <span className={`input-shell ${hasAffix ? 'input-shell--affix' : ''}`}>
        {Icon && <Icon size={17} strokeWidth={1.75} className="input-shell__icon" aria-hidden="true" />}
        {prefix && <span className="input-shell__affix">{prefix}</span>}
        <input id={id} type={inputType} {...props} />
        {suffix && <span className="input-shell__affix">{suffix}</span>}
        {isPassword && (
          <button
            type="button"
            className="input-shell__action"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
          </button>
        )}
      </span>
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function TextArea({ label, hint, className = '', ...props }) {
  const id = useId();
  return (
    <label className={`field ${className}`} htmlFor={id}>
      {label && <span className="field__label">{label}</span>}
      <textarea id={id} className="text-area" {...props} />
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
