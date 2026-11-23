import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppointmentsContext = createContext(null);

export function AppointmentsProvider({ children }) {
  const [revision, setRevision] = useState(0);

  const notifyAppointmentChange = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  const value = useMemo(() => ({ revision, notifyAppointmentChange }), [revision, notifyAppointmentChange]);

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) throw new Error('useAppointments debe usarse dentro de AppointmentsProvider');
  return context;
}
