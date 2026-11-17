import axios from 'axios';
import { getSession, clearSession } from '../utils/session.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 20_000
});

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
    config.headers['X-Tenant-Id'] = session.user?.tenantId || '';
    config.headers['X-Role'] = session.user?.role || '';
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status || 0;
    if (status === 401) clearSession();
    const payload = error.response?.data || {};
    const normalized = new Error(payload.message || error.message || 'Error de comunicación con la API');
    normalized.status = status;
    normalized.errors = payload.errors || null;
    return Promise.reject(normalized);
  }
);

export const unwrap = (response) => response.data;
export const errorMessage = (error) => {
  if (!error?.errors) return error?.message || 'Error inesperado';
  const details = Object.values(error.errors).join(' · ');
  return `${error.message}: ${details}`;
};

export default api;
