import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function usePopover(triggerRef, open, onClose, minWidth = 240) {
  const menuRef = useRef(null);
  const [style, setStyle] = useState({ top: 0, left: 0, width: 0, visibility: 'hidden' });

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const menuHeight = menu.offsetHeight || 280;
    const width = Math.max(rect.width, minWidth);
    let top = rect.bottom + 8;
    if (top + menuHeight > window.innerHeight - margin && rect.top - menuHeight - 8 > margin) {
      top = rect.top - menuHeight - 8;
    }
    let left = rect.left;
    if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
    setStyle({
      top: Math.max(margin, top),
      left: Math.max(margin, left),
      width,
      visibility: 'visible'
    });
  }, [triggerRef, minWidth]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, position]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) onClose();
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose, triggerRef]);

  return { menuRef, style };
}
