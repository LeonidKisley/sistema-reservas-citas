import axios from 'axios';
import { clearSession } from '../utils/session.js';

export const AUTH_EXPIRED_EVENT = 'auth:expired';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 20_000,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status || 0;
    if (status === 401) {
      clearSession();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
    }
    const payload = error.response?.data || {};
    const normalized = new Error(payload.message || error.message || 'Error de comunicación con la API');
    normalized.status = status;
    normalized.errors = payload.errors || null;
    return Promise.reject(normalized);
  }
);

export const unwrap = (response) => response.data;
export const successMessage = (response, fallback) => response?.message || fallback;
export const errorMessage = (error) => {
  if (!error?.errors) return error?.message || 'Error inesperado';
  const details = Object.values(error.errors).join(' · ');
  return `${error.message}: ${details}`;
};

export default api;
