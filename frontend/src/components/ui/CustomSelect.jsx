import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import usePopover from './usePopover.js';

function initialsFor(label = '') {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecciona una opción',
  icon: Icon,
  disabled = false,
  multiple = false,
  clearable = false,
  className = '',
  ariaLabel
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef(null);
  const generatedId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const listId = `select-${generatedId}`;
  const { menuRef, style } = usePopover(triggerRef, open, () => setOpen(false));

  const selected = useMemo(() => {
    if (multiple) {
      const values = Array.isArray(value) ? value : [];
      return options.filter((option) => values.includes(option.value));
    }
    return options.find((option) => option.value === value) || null;
  }, [multiple, options, value]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = options.findIndex((option) => option.value === (multiple ? selected?.[0]?.value : selected?.value));
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((current) => Math.min(current, Math.max(options.length - 1, 0)));
  }, [open, options.length]);

  const toggle = () => {
    if (disabled) return;
    setOpen((current) => !current);
  };

  const choose = (option) => {
    if (multiple) {
      const values = Array.isArray(value) ? value : [];
      onChange(values.includes(option.value) ? values.filter((item) => item !== option.value) : [...values, option.value]);
      return;
    }
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    const lastIndex = options.length - 1;
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((current) => {
        if (lastIndex < 0) return 0;
        if (event.key === 'ArrowDown') return current >= lastIndex ? 0 : current + 1;
        return current <= 0 ? lastIndex : current - 1;
      });
      return;
    }
    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(Math.max(lastIndex, 0));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else if (options[activeIndex]) {
        choose(options[activeIndex]);
      }
      return;
    }
    if (event.key === 'Tab' && open) setOpen(false);
  };

  const triggerLabel = multiple
    ? selected.length
      ? `${selected.length} ${selected.length === 1 ? 'selección' : 'selecciones'}`
      : placeholder
    : selected?.label || placeholder;

  return (
    <div className={`custom-select ${clearable && selected && !disabled ? 'custom-select--clearable' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`select-trigger ${open ? 'select-trigger--open' : ''} ${!selected || (multiple && !selected.length) ? 'select-trigger--placeholder' : ''}`}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && options[activeIndex] ? `${listId}-option-${activeIndex}` : undefined}
        aria-label={ariaLabel}
      >
        {Icon && <Icon size={17} strokeWidth={1.75} className="select-trigger__icon" aria-hidden="true" />}
        <span className="select-trigger__value">{triggerLabel}</span>
        <ChevronDown size={17} strokeWidth={1.75} className="select-trigger__chevron" aria-hidden="true" />
      </button>
      {clearable && selected && !disabled && (
        <button
          type="button"
          className="select-clear"
          aria-label="Limpiar selección"
          onClick={() => onChange(multiple ? [] : '')}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}

      {open && createPortal(
        <div ref={menuRef} className="select-menu" style={style} id={listId} role="listbox" aria-multiselectable={multiple || undefined}>
          {options.length === 0 && <div className="select-menu__empty">No hay opciones disponibles</div>}
          {options.map((option, index) => {
            const isSelected = multiple
              ? (Array.isArray(value) ? value : []).includes(option.value)
              : option.value === value;
            const OptionIcon = option.icon;
            const initials = option.initials || (option.avatar === false && !OptionIcon ? null : initialsFor(option.label));
            return (
              <div
                key={option.value}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={isSelected}
                className={`select-option ${activeIndex === index ? 'select-option--active' : ''} ${isSelected ? 'select-option--selected' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                {(initials || OptionIcon) && (
                  <span className="select-option__avatar">
                    {OptionIcon ? <OptionIcon size={14} strokeWidth={1.75} /> : initials}
                  </span>
                )}
                <span className="select-option__text">
                  <span className="select-option__label">{option.label}</span>
                  {option.description && <span className="select-option__description">{option.description}</span>}
                </span>
                {isSelected && <Check size={17} strokeWidth={2.25} className="select-option__check" aria-hidden="true" />}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
