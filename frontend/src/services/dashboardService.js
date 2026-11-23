import api from './api.js';

export const getConsolidatedDashboard = (params) => api.get('/dashboard/consolidated', { params });
export const getTotalAppointments = (params) => api.get('/dashboard/total', { params });
export const getTopServices = (params) => api.get('/dashboard/top-services', { params });
export const getTopClients = (params) => api.get('/dashboard/top-clients', { params });
export const getTopProfessionals = (params) => api.get('/dashboard/top-professionals', { params });
