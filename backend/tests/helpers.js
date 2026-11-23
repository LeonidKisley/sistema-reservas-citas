import request from 'supertest';
import { app } from '../src/app.js';

export const api = request(app);

export const uniqueDni = () => String(Math.floor(10_000_000 + Math.random() * 90_000_000));
export const domainOf = (tenant) => tenant?.tenant?.domain || `${tenant?.tenant?.slug}.com`;
export const emailAt = (tenant, localPart) => `${localPart}@${domainOf(tenant)}`;

export async function emailForToken(token, localPart) {
  const response = await api.get('/api/auth/me').set(auth(token));
  return emailAt(response.body.data, localPart);
}

export async function createTenant(overrides = {}) {
  const slug = overrides.slug || `tenant-${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const response = await api.post('/api/tenants').send({
    name: overrides.name || `Organización ${Date.now()}${Math.floor(Math.random() * 1000)}`,
    slug,
    adminFirstName: 'Admin',
    adminLastName: 'Principal',
    adminEmail: overrides.adminEmail || `admin${Date.now()}${Math.floor(Math.random() * 1000)}@${slug}.com`,
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

export async function createClientSession(tenantSlug, overrides = {}) {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const domain = tenantSlug.replace(/\.com$/, '').toLowerCase();
  const email = overrides.email || `cliente${suffix}@${domain}.com`;
  const password = overrides.password || 'Cliente1234';
  const registered = await api.post('/api/auth/register-client').send({
    tenant: tenantSlug,
    firstName: overrides.firstName || 'Cliente',
    lastName: overrides.lastName || 'Reservas',
    document: overrides.document || uniqueDni(),
    email,
    password
  });
  if (registered.status !== 201) throw new Error(`Registro de cliente fallido: ${JSON.stringify(registered.body)}`);
  const session = await login(tenantSlug, email, password);
  return { client: registered.body.data?.client, session };
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
  const id = Math.floor(Math.random() * 1_000_000);
  const response = await api.post('/api/professionals').set(auth(token)).send({
    firstName: 'Profesional',
    lastName: 'Demostracion',
    document: uniqueDni(),
    email: overrides.email || await emailForToken(token, `profesional${id}`),
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
  const id = Math.floor(Math.random() * 1_000_000);
  const response = await api.post('/api/clients').set(auth(token)).send({
    firstName: 'Cliente',
    lastName: 'Demostracion',
    document: uniqueDni(),
    email: overrides.email || await emailForToken(token, `cliente${id}`),
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
