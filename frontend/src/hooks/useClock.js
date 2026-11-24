import { useEffect, useState } from 'react';
import { now } from '../utils/time.js';

// Reloj que fuerza un re-render periódico para que las celdas vencidas se actualicen
// sin recargar la página. También refresca al volver a la pestaña.
export function useNow(intervalMs = 60000) {
  const [current, setCurrent] = useState(now);

  useEffect(() => {
    const refresh = () => setCurrent(now());
    const interval = setInterval(refresh, intervalMs);
    const onVisibility = () => { if (!document.hidden) refresh(); };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);

  return current;
}

export default useNow;
