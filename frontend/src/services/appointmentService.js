import api from './api.js';

export const getAppointments = (params) => api.get('/appointments', { params });
export const getAppointment = (id) => api.get(`/appointments/${id}`);
export const createAppointment = (payload) => api.post('/appointments', payload);
export const rescheduleAppointment = (id, payload) => api.patch(`/appointments/${id}/reschedule`, payload);
export const cancelAppointment = (id, payload) => api.patch(`/appointments/${id}/cancel`, payload);
export const updateAppointmentStatus = (id, status) => api.patch(`/appointments/${id}/status`, { status });

export const getAvailability = (params) => api.get('/availability', { params });
export const getAgenda = (params) => api.get('/agenda', { params });
export const getDailyAgenda = (params) => api.get('/agenda/daily', { params });
