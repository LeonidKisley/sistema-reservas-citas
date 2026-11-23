import { afterEach, describe, expect, it, vi } from 'vitest';
import api, { AUTH_EXPIRED_EVENT, errorMessage, successMessage, unwrap } from './api.js';
import { clearSession, getSession, saveSession } from '../utils/session.js';

const originalAdapter = api.defaults.adapter;
const okResponse = (data) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} });

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
  clearSession();
});

describe('api helpers', () => {
  it('conserva el envelope y lee mensajes con successMessage', () => {
    const envelope = { success: true, data: { id: 1 }, message: 'Guardado', errors: null };
    expect(unwrap(envelope)).toEqual({ id: 1 });
    expect(successMessage(envelope, 'Fallback')).toBe('Guardado');
    expect(successMessage({}, 'Fallback')).toBe('Fallback');
  });

  it('compone errores con details', () => {
    expect(errorMessage({ message: 'Datos inválidos', errors: { email: 'Requerido', phone: 'Inválido' } }))
      .toBe('Datos inválidos: Requerido · Inválido');
    expect(errorMessage({ message: 'Sin conexión' })).toBe('Sin conexión');
    expect(errorMessage(null)).toBe('Error inesperado');
  });
});

describe('api interceptors', () => {
  it('usa credenciales y no inyecta headers de autenticación ni tenant', async () => {
    saveSession({ token: 'no-debe-enviarse', user: { id: 'u1', role: 'Administrador', tenantId: 't1' } });
    let seen;
    api.defaults.adapter = async (config) => {
      seen = config;
      return okResponse({ success: true, data: { ok: true }, message: 'ok' });
    };

    const response = await api.get('/probe');

    expect(response.message).toBe('ok');
    expect(seen.withCredentials).toBe(true);
    expect(seen.headers.Authorization).toBeUndefined();
    expect(seen.headers['X-Tenant-Id']).toBeUndefined();
    expect(seen.headers['X-Role']).toBeUndefined();
  });

  it('limpia sesión y avisa del evento auth:expired en 401', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal('CustomEvent', class CustomEventStub {
      constructor(type) {
        this.type = type;
      }
    });
    saveSession({ token: 'no-debe-guardarse', user: { id: 'u1' } });
    api.defaults.adapter = async (config) => {
      const error = new Error('Request failed with status code 401');
      error.config = config;
      error.response = { status: 401, data: { success: false, message: 'Sesión expirada' }, headers: {}, config };
      throw error;
    };

    await expect(api.get('/private')).rejects.toMatchObject({ status: 401, message: 'Sesión expirada' });

    expect(getSession()).toBeNull();
    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    expect(dispatchEvent.mock.calls[0][0].type).toBe(AUTH_EXPIRED_EVENT);
  });
});
