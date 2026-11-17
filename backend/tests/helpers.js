import request from 'supertest';
import { app } from '../src/app.js';

export const api = request(app);

export async function createTenant(overrides = {}) {
  const response = await api.post('/api/tenants').send({
    name: overrides.name || `Organización ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    slug: overrides.slug || `tenant-${Date.now()}${Math.floor(Math.random() * 1000)}`,
    adminFirstName: 'Admin',
    adminLastName: 'Principal',
    adminEmail: overrides.adminEmail || `admin${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`,
    adminPassword: 'Admin1234',
    ...overrides
  });
  if (response.status !== 201) throw new Error(`No se pudo crear tenant: ${JSON.stringify(response.body)}`);
  return response.body.data;
}

export async function login(tenantSlug, email, password = 'Admin1234') {
  const response = await api.post('/api/auth/login').send({ tenant: tenantSlug, email, password });
  if (response.status !== 200) throw new Error(`Login fallido: ${JSON.stringify(response.body)}`);
  return response.body.data;
}

export function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

export const futureDate = (daysAhead = 2) => {
  const date = new Date(Date.now() + daysAhead * 86_400_000);
  return date.toISOString().slice(0, 10);
};

export async function createService(token, overrides = {}) {
  const response = await api.post('/api/services').set(auth(token)).send({
    name: overrides.name || `Servicio ${Math.floor(Math.random() * 1_000_000)}`,
    durationMinutes: overrides.durationMinutes || 30,
    price: overrides.price ?? 100,
    ...overrides
  });
  if (response.status !== 201) throw new Error(`No se pudo crear servicio: ${JSON.stringify(response.body)}`);
  return response.body.data;
}

export async function createProfessional(token, serviceId, overrides = {}) {
  const response = await api.post('/api/professionals').set(auth(token)).send({
    firstName: 'Profesional',
    lastName: `Demo ${Math.floor(Math.random() * 1_000_000)}`,
    document: `DOC-${Math.floor(Math.random() * 1_000_000)}`,
    specialty: 'General',
    workHours: [
      { dayOfWeek: 1, start: '09:00', end: '18:00' },
      { dayOfWeek: 2, start: '09:00', end: '18:00' },
      { dayOfWeek: 3, start: '09:00', end: '18:00' },
      { dayOfWeek: 4, start: '09:00', end: '18:00' },
      { dayOfWeek: 5, start: '09:00', end: '18:00' },
      { dayOfWeek: 6, start: '09:00', end: '13:00' },
      { dayOfWeek: 0, start: '09:00', end: '13:00' }
    ],
    services: serviceId ? [serviceId] : [],
    ...overrides
  });
  if (response.status !== 201) throw new Error(`No se pudo crear profesional: ${JSON.stringify(response.body)}`);
  return response.body.data;
}

export async function createClient(token, overrides = {}) {
  const suffix = Math.floor(Math.random() * 1_000_000);
  const response = await api.post('/api/clients').set(auth(token)).send({
    firstName: 'Cliente',
    lastName: `Demo ${suffix}`,
    document: `CLI-${suffix}`,
    email: `cliente${suffix}@test.local`,
    ...overrides
  });
  if (response.status !== 201) throw new Error(`No se pudo crear cliente: ${JSON.stringify(response.body)}`);
  return response.body.data;
}

export async function createAppointment(token, payload) {
  const response = await api.post('/api/appointments').set(auth(token)).send(payload);
  return response;
}

export function nextWeekdayDate() {
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = new Date(Date.now() + offset * 86_400_000);
    const day = date.getUTCDay();
    if (day >= 1 && day <= 5) return date.toISOString().slice(0, 10);
  }
  return futureDate(7);
}
