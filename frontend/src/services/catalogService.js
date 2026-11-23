import api from './api.js';

export const getClients = (params) => api.get('/clients', { params });
export const getClient = (id) => api.get(`/clients/${id}`);
export const createClient = (payload) => api.post('/clients', payload);
export const updateClient = (id, payload) => api.patch(`/clients/${id}`, payload);
export const deleteClient = (id) => api.delete(`/clients/${id}`);

export const getProfessionals = () => api.get('/professionals');
export const getProfessional = (id) => api.get(`/professionals/${id}`);
export const createProfessional = (payload) => api.post('/professionals', payload);
export const updateProfessional = (id, payload) => api.patch(`/professionals/${id}`, payload);
export const deleteProfessional = (id) => api.delete(`/professionals/${id}`);
export const assignService = (professionalId, serviceId) => api.post(`/professionals/${professionalId}/services/${serviceId}`);

export const getServices = () => api.get('/services');
export const getService = (id) => api.get(`/services/${id}`);
export const createService = (payload) => api.post('/services', payload);
export const updateService = (id, payload) => api.patch(`/services/${id}`, payload);
export const deleteService = (id) => api.delete(`/services/${id}`);

export const getUsers = () => api.get('/users');
export const createUser = (payload) => api.post('/users', payload);
export const updateUser = (id, payload) => api.patch(`/users/${id}`, payload);
export const deleteUser = (id) => api.delete(`/users/${id}`);
