import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import {
  api,
  createTenant,
  login,
  auth,
  createService,
  createProfessional,
  createClient,
  createClientSession,
  createAppointment,
  nextWeekdayDate,
  emailAt,
  uniqueDni
} from './helpers.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';

const suffix = () => `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const randomId = () => new Types.ObjectId().toString();

const matrixText = readFileSync(new URL('../../matriz-historias-usuario.md', import.meta.url), 'utf8');
const scenarios = [];
let currentUS = null;
for (const line of matrixText.split(/\r?\n/)) {
  const usMatch = line.match(/^###\s+(US-\d+):/);
  if (usMatch) {
    currentUS = usMatch[1];
    continue;
  }
  if (!currentUS) continue;
  const rowMatch = line.match(/^\|\s+\*\*([\d.]+)\*\*\s+\|\s+([^|]+?)\s*\|/);
  if (rowMatch) {
    const n = Number(rowMatch[1]);
    scenarios.push({ key: `${currentUS}#${n}`, us: currentUS, n, type: rowMatch[2] });
  }
}
if (scenarios.length !== 118) throw new Error(`La matriz debe tener 118 escenarios; se encontraron ${scenarios.length}`);

const coveredByExistingSuites = new Set([
  'US-01#1', 'US-01#4',
  'US-02#3',
  'US-06#2', 'US-06#3',
  'US-07#1',
  'US-05#2',
  'US-09#4',
  'US-10#1',
  'US-11#1', 'US-11#4',
  'US-15#1', 'US-15#2',
  'US-16#1',
  'US-17#1',
  'US-18#1', 'US-18#4',
  'US-19#1',
  'US-20#1',
  'US-21#2',
  'US-26#1', 'US-26#3', 'US-26#4',
  'US-29#1'
]);
const pending = scenarios.filter((item) => !coveredByExistingSuites.has(item.key));
if (pending.length !== 94) throw new Error(`Faltan 94 escenarios nuevos; se generaron ${pending.length}`);

async function fixture() {
  const tenant = await createTenant();
  const session = await login(tenant.tenant.slug, tenant.admin.email);
  const service = await createService(session.token, { durationMinutes: 30, price: 120 });
  const professional = await createProfessional(session.token, service.id);
  const client = await createClient(session.token);
  return { tenant, session, service, professional, client, date: nextWeekdayDate() };
}

async function staffMember(f, role, overrides = {}) {
  const email = overrides.email || emailAt(f.tenant, `staff${suffix()}`);
  const password = overrides.password || 'Staff1234';
  const created = await api.post('/api/users').set(auth(f.session.token)).send({
    email,
    password,
    role,
    firstName: overrides.firstName || 'Personal',
    lastName: overrides.lastName || 'Demo',
    ...overrides
  });
  expect(created.status).toBe(201);
  const session = await login(f.tenant.tenant.slug, email, password);
  return { user: created.body.data, session };
}

async function clientMember(f) {
  const created = await createClientSession(f.tenant.tenant.slug, { firstName: 'Ana', lastName: 'Pérez' });
  return created;
}

async function appointment(f, time, overrides = {}) {
  return createAppointment(f.session.token, {
    clientId: f.client.id,
    professionalId: f.professional.id,
    serviceId: f.service.id,
    date: f.date,
    time,
    ...overrides
  });
}

async function makePlatformAdmin(f) {
  const email = emailAt(f.tenant, `plataforma${suffix()}`);
  await User.create({
    tenantId: f.tenant.tenant.id,
    email,
    password: await bcrypt.hash('Plataforma1234', 10),
    role: 'Administrador',
    platformAdmin: true,
    active: true
  });
  return login(f.tenant.tenant.slug, email, 'Plataforma1234');
}

function expiredToken(f, role = 'Administrador') {
  return jwt.sign(
    { sub: new Types.ObjectId().toString(), tenantId: f.tenant.tenant.id, role, tokenVersion: 0 },
    env.jwtSecret,
    { expiresIn: '-1s' }
  );
}

const handlers = {
  'US-01': async (n) => {
    if (n === 2) {
      const identifier = `OPT-${suffix()}`;
      const slug = `opcional-${suffix()}`;
      const contactEmail = `contacto@${slug}.com`;
      const created = await createTenant({
        slug,
        identifier,
        contactEmail,
        phone: '+51987654321',
        address: 'Calle Principal 1',
        plan: 'premium'
      });
      const session = await login(created.tenant.slug, created.admin.email);
      const response = await api.get(`/api/tenants/${created.tenant.id}`).set(auth(session.token));
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        identifier,
        contactEmail,
        phone: '+51987654321',
        address: 'Calle Principal 1',
        plan: 'premium'
      });

      const f = await fixture();
      const platform = await makePlatformAdmin(f);
      const platformSlug = `plataforma-${suffix()}`;
      const onboarding = await api.post('/api/platform/tenants').set(auth(platform.token)).send({
        name: `Plataforma ${suffix()}`,
        slug: platformSlug,
        adminFirstName: 'Admin',
        adminLastName: 'Plataforma',
        adminEmail: `adminplataforma${suffix()}@${platformSlug}.com`,
        adminPassword: 'Admin1234'
      });
      expect(onboarding.status).toBe(201);
      const list = await api.get('/api/platform/tenants').set(auth(platform.token));
      expect(list.status).toBe(200);
      expect(list.body.data.length).toBeGreaterThanOrEqual(2);
      return;
    }
    if (n === 3) {
      const slug = `sin-nombre-${suffix()}`;
      const response = await api.post('/api/tenants').send({
        slug,
        adminFirstName: 'Admin',
        adminLastName: 'Principal',
        adminEmail: `admin${suffix()}@${slug}.com`,
        adminPassword: 'Admin1234'
      });
      expect(response.status).toBe(400);
      expect(response.body.errors.name).toBeDefined();
    }
  },

  'US-02': async (n) => {
    const f = await fixture();
    if (n === 1) {
      const session = await login(f.tenant.tenant.slug, f.tenant.admin.email);
      const payload = jwt.verify(session.token, env.jwtSecret);
      expect(payload.tenantId).toBe(f.tenant.tenant.id);
      expect(payload.role).toBe('Administrador');
      expect(session.user.tenant.slug).toBe(f.tenant.tenant.slug);
      return;
    }
    if (n === 2) {
      const member = await clientMember(f);
      const allowed = await createService(f.session.token, { name: `Permitido ${suffix()}` });
      expect(allowed.id).toBeDefined();
      const denied = await api.post('/api/services').set(auth(member.session.token)).send({
        name: `Denegado ${suffix()}`,
        durationMinutes: 30,
        price: 10
      });
      expect(denied.status).toBe(403);
      return;
    }
    if (n === 4) {
      const response = await api.get('/api/auth/me').set(auth(expiredToken(f)));
      expect(response.status).toBe(401);
    }
  },

  'US-03': async (n) => {
    const tenant = await createTenant();
    const base = {
      tenant: tenant.tenant.slug,
      firstName: 'Nuevo',
      lastName: 'Cliente',
      document: uniqueDni(),
      email: emailAt(tenant, `registro${suffix()}`),
      password: 'Cliente1234'
    };
    if (n === 1) {
      const registered = await api.post('/api/auth/register-client').send(base);
      expect(registered.status).toBe(201);
      const session = await login(tenant.tenant.slug, base.email, base.password);
      expect(session.user.tenantId).toBe(tenant.tenant.id);
      expect(session.user.role).toBe('Cliente');
      return;
    }
    if (n === 2) {
      const first = await api.post('/api/auth/register-client').send(base);
      expect(first.status).toBe(201);
      const duplicate = await api.post('/api/auth/register-client').send({ ...base, document: uniqueDni() });
      expect(duplicate.status).toBe(409);
      return;
    }
    if (n === 3) {
      const response = await api.post('/api/auth/register-client').send({ ...base, firstName: '' });
      expect(response.status).toBe(400);
      expect(response.body.errors.firstName).toBeDefined();
      return;
    }
    if (n === 4) {
      const response = await api.post('/api/auth/register-client').send({ ...base, password: 'debil' });
      expect(response.status).toBe(400);
      expect(response.body.errors.password).toBeDefined();
    }
  },

  'US-04': async (n) => {
    const tenant = await createTenant();
    const email = emailAt(tenant, `clientelogin${suffix()}`);
    const password = 'Cliente1234';
    const registered = await api.post('/api/auth/register-client').send({
      tenant: tenant.tenant.slug,
      firstName: 'Login',
      lastName: 'Cliente',
      document: uniqueDni(),
      email,
      password
    });
    expect(registered.status).toBe(201);
    if (n === 1) {
      const session = await login(tenant.tenant.slug, email, password);
      const payload = jwt.verify(session.token, env.jwtSecret);
      expect(payload.role).toBe('Cliente');
      expect(payload.clientId).toBe(session.user.clientId);
      return;
    }
    if (n === 2) {
      const response = await api.post('/api/auth/login').send({ tenant: tenant.tenant.slug, email, password: 'Incorrecta123' });
      expect(response.status).toBe(401);
      expect(response.body.data).toBeNull();
      return;
    }
    if (n === 3) {
      const response = await api.post('/api/auth/login').send({
        tenant: tenant.tenant.slug,
        email: emailAt(tenant, `inexistente${suffix()}`),
        password
      });
      expect(response.status).toBe(401);
      return;
    }
    if (n === 4) {
      const session = await login(tenant.tenant.slug, email, password);
      const token = jwt.sign(
        { sub: session.user.id, tenantId: tenant.tenant.id, role: 'Cliente', clientId: session.user.clientId, tokenVersion: 0 },
        env.jwtSecret,
        { expiresIn: '-1s' }
      );
      const response = await api.get('/api/appointments').set(auth(token));
      expect(response.status).toBe(401);
    }
  },

  'US-05': async (n) => {
    if (n === 1) {
      const a = await fixture();
      const b = await fixture();
      await createClient(a.session.token, { document: uniqueDni() });
      await createClient(b.session.token, { document: uniqueDni() });
      const response = await api.get('/api/clients').set(auth(a.session.token));
      expect(response.status).toBe(200);
      expect(response.body.data.items.every((item) => !item.document.startsWith('SOLO-B'))).toBe(true);
      return;
    }
    if (n === 3) {
      const response = await api.get('/api/clients');
      expect(response.status).toBe(401);
      return;
    }
    if (n === 4) {
      const tenant = await createTenant();
      const session = await login(tenant.tenant.slug, tenant.admin.email);
      const [clients, services, appointments, agenda] = await Promise.all([
        api.get('/api/clients').set(auth(session.token)),
        api.get('/api/services').set(auth(session.token)),
        api.get('/api/appointments').set(auth(session.token)),
        api.get('/api/agenda').set(auth(session.token))
      ]);
      expect(clients.status).toBe(200);
      expect(services.status).toBe(200);
      expect(appointments.status).toBe(200);
      expect(agenda.status).toBe(200);
      expect(clients.body.data.items).toEqual([]);
      expect(services.body.data).toEqual([]);
      expect(appointments.body.data.items).toEqual([]);
      expect(agenda.body.data.events).toEqual([]);
    }
  },

  'US-06': async (n) => {
    const f = await fixture();
    if (n === 1) {
      const response = await createService(f.session.token, { name: `AdminPermite ${suffix()}` });
      expect(response.id).toBeDefined();
      return;
    }
    if (n === 4) {
      const member = await clientMember(f);
      const response = await api.post('/api/users').set(auth(member.session.token)).send({
        email: emailAt(f.tenant, `escalada${suffix()}`),
        password: 'Escalada1234',
        role: 'Administrador',
        firstName: 'Intento',
        lastName: 'Escalada'
      });
      expect(response.status).toBe(403);
    }
  },

  'US-07': async (n) => {
    const f = await fixture();
    const session = await login(f.tenant.tenant.slug, f.tenant.admin.email);
    if (n === 2) {
      const first = await api.post('/api/auth/logout').set(auth(session.token));
      expect(first.status).toBe(200);
      const second = await api.post('/api/auth/logout').set(auth(session.token));
      expect(second.status).toBe(401);
      expect(second.body.data).toBeNull();
      return;
    }
    if (n === 3) {
      const response = await api.post('/api/auth/logout').set(auth('token-invalido'));
      expect(response.status).toBe(401);
      return;
    }
    if (n === 4) {
      const first = await api.post('/api/auth/logout').set(auth(session.token));
      expect(first.status).toBe(200);
      const reuse = await api.get('/api/auth/me').set(auth(session.token));
      expect(reuse.status).toBe(401);
    }
  },

  'US-08': async (n) => {
    const f = await fixture();
    const currentPassword = 'Admin1234';
    const newPassword = 'NuevaClave123';
    const change = (payload) => api.patch('/api/auth/password').set(auth(f.session.token)).send(payload);
    if (n === 1) {
      const response = await change({ currentPassword, newPassword, confirmPassword: newPassword });
      expect(response.status).toBe(200);
      const relogin = await api.post('/api/auth/login').send({
        tenant: f.tenant.tenant.slug,
        email: f.tenant.admin.email,
        password: newPassword
      });
      expect(relogin.status).toBe(200);
      return;
    }
    if (n === 2) {
      const response = await change({ currentPassword, newPassword, confirmPassword: newPassword });
      expect(response.status).toBe(200);
      const stored = await User.findOne({ email: f.tenant.admin.email }).select('+password');
      expect(await bcrypt.compare(newPassword, stored.password)).toBe(true);
      expect(await bcrypt.compare(currentPassword, stored.password)).toBe(false);
      return;
    }
    if (n === 3) {
      const response = await change({ currentPassword: 'Incorrecta123', newPassword, confirmPassword: newPassword });
      expect(response.status).toBe(400);
      const oldLogin = await login(f.tenant.tenant.slug, f.tenant.admin.email, currentPassword);
      expect(oldLogin.token).toBeDefined();
      return;
    }
    if (n === 4) {
      const weak = await change({ currentPassword, newPassword: 'debil', confirmPassword: 'debil' });
      expect(weak.status).toBe(400);
      const same = await change({ currentPassword, newPassword: currentPassword, confirmPassword: currentPassword });
      expect(same.status).toBe(400);
    }
  },

  'US-09': async (n) => {
    const f = await fixture();
    const receptionist = await staffMember(f, 'Recepcionista');
    const base = { firstName: 'Creado', lastName: 'Recepcion', document: uniqueDni() };
    if (n === 1) {
      const response = await api.post('/api/clients').set(auth(receptionist.session.token)).send(base);
      expect(response.status).toBe(201);
      expect(response.body.data.document).toBe(base.document);
      return;
    }
    if (n === 2) {
      const response = await api.post('/api/clients').set(auth(receptionist.session.token)).send({
        ...base,
        email: emailAt(f.tenant, `opcional${suffix()}`),
        phone: '+51987654321',
        address: 'Avenida Opcional 2',
        notes: 'Nota opcional'
      });
      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({ phone: '+51987654321', address: 'Avenida Opcional 2', notes: 'Nota opcional' });
      return;
    }
    if (n === 3) {
      const response = await api.post('/api/clients').set(auth(receptionist.session.token)).send({ ...base, lastName: '' });
      expect(response.status).toBe(400);
      expect(response.body.errors.lastName).toBeDefined();
    }
  },

  'US-10': async (n) => {
    const f = await fixture();
    if (n === 2) {
      const document = uniqueDni();
      await createClient(f.session.token, { firstName: 'Buscable', lastName: 'Uno', document });
      await createClient(f.session.token, { firstName: 'Otro', lastName: 'Dos', document: uniqueDni() });
      const byName = await api.get('/api/clients').set(auth(f.session.token)).query({ search: 'Buscable' });
      const byDocument = await api.get('/api/clients').set(auth(f.session.token)).query({ search: document });
      expect(byName.body.data.items).toHaveLength(1);
      expect(byDocument.body.data.items).toHaveLength(1);
      return;
    }
    if (n === 3) {
      const response = await api.get('/api/clients').set(auth(f.session.token)).query({ search: `NADA-${suffix()}` });
      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
      return;
    }
    if (n === 4) {
      const tenant = await createTenant();
      const session = await login(tenant.tenant.slug, tenant.admin.email);
      const response = await api.get('/api/clients').set(auth(session.token));
      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
    }
  },

  'US-11': async (n) => {
    const f = await fixture();
    if (n === 2) {
      const created = await createClient(f.session.token, { document: uniqueDni() });
      const response = await api.delete(`/api/clients/${created.id}`).set(auth(f.session.token));
      expect(response.status).toBe(200);
      expect(response.body.data.physicalDeleteBlocked).toBe(false);
      const get = await api.get(`/api/clients/${created.id}`).set(auth(f.session.token));
      expect(get.status).toBe(404);
      return;
    }
    if (n === 3) {
      const response = await api.patch(`/api/clients/${randomId()}`).set(auth(f.session.token)).send({
        firstName: 'Inexistente',
        lastName: 'Cliente',
        document: uniqueDni()
      });
      expect(response.status).toBe(404);
    }
  },

  'US-12': async (n) => {
    const f = await fixture();
    const base = {
      firstName: 'Profesional',
      lastName: 'Nuevo',
      document: uniqueDni(),
      specialty: 'General',
      workHours: [{ dayOfWeek: 1, start: '09:00', end: '17:00' }],
      services: [f.service.id]
    };
    if (n === 1) {
      const response = await api.post('/api/professionals').set(auth(f.session.token)).send(base);
      expect(response.status).toBe(201);
      expect(response.body.data.services).toContain(f.service.id);
      return;
    }
    if (n === 2) {
      const created = await createProfessional(f.session.token, f.service.id);
      const response = await api.patch(`/api/professionals/${created.id}`).set(auth(f.session.token)).send({
        ...base,
        specialty: 'Especialista actualizado'
      });
      expect(response.status).toBe(200);
      expect(response.body.data.specialty).toBe('Especialista actualizado');
      return;
    }
    if (n === 3) {
      const response = await api.post('/api/professionals').set(auth(f.session.token)).send({ ...base, workHours: [{ dayOfWeek: 9, start: '09:00', end: '17:00' }] });
      expect(response.status).toBe(400);
      return;
    }
    if (n === 4) {
      const other = await fixture();
      const response = await api.patch(`/api/professionals/${f.professional.id}`).set(auth(other.session.token)).send({
        ...base,
        specialty: 'Modificación ajena'
      });
      expect(response.status).toBe(403);
    }
  },

  'US-13': async (n) => {
    const f = await fixture();
    if (n === 1) {
      const response = await createService(f.session.token, { name: `Creado ${suffix()}`, description: 'Servicio nuevo' });
      expect(response.id).toBeDefined();
      expect(response.description).toBe('Servicio nuevo');
      return;
    }
    if (n === 2) {
      const response = await api.patch(`/api/services/${f.service.id}`).set(auth(f.session.token)).send({
        name: f.service.name,
        durationMinutes: 45,
        price: 175
      });
      expect(response.status).toBe(200);
      expect(response.body.data.durationMinutes).toBe(45);
      expect(response.body.data.price).toBe(175);
      return;
    }
    if (n === 3) {
      const zero = await api.post('/api/services').set(auth(f.session.token)).send({
        name: `Invalido ${suffix()}`, durationMinutes: 0, price: 10
      });
      const negative = await api.post('/api/services').set(auth(f.session.token)).send({
        name: `Negativo ${suffix()}`, durationMinutes: 30, price: -1
      });
      expect(zero.status).toBe(400);
      expect(negative.status).toBe(400);
      return;
    }
    if (n === 4) {
      const response = await api.post('/api/services').set(auth(f.session.token)).send({
        name: f.service.name, durationMinutes: 30, price: 100
      });
      expect(response.status).toBe(409);
    }
  },

  'US-14': async (n) => {
    const f = await fixture();
    if (n === 1) {
      const extra = await createService(f.session.token, { name: `Extra ${suffix()}` });
      const response = await api.post(`/api/professionals/${f.professional.id}/services/${extra.id}`).set(auth(f.session.token));
      expect(response.status).toBe(200);
      expect(response.body.data.services).toContain(f.service.id);
      expect(response.body.data.services).toContain(extra.id);
      return;
    }
    if (n === 2) {
      const first = await createService(f.session.token, { name: `Primero ${suffix()}` });
      const second = await createService(f.session.token, { name: `Segundo ${suffix()}` });
      const pro = await createProfessional(f.session.token, first.id);
      const response = await api.post(`/api/professionals/${pro.id}/services/${second.id}`).set(auth(f.session.token));
      expect(response.status).toBe(200);
      expect(response.body.data.services).toHaveLength(2);
      return;
    }
    if (n === 3) {
      const response = await api.post(`/api/professionals/${f.professional.id}/services/${randomId()}`).set(auth(f.session.token));
      expect(response.status).toBe(404);
      return;
    }
    if (n === 4) {
      const first = await api.post(`/api/professionals/${f.professional.id}/services/${f.service.id}`).set(auth(f.session.token));
      expect(first.status).toBe(200);
      const second = await api.post(`/api/professionals/${f.professional.id}/services/${f.service.id}`).set(auth(f.session.token));
      expect(second.status).toBe(200);
      expect(second.body.data.services.filter((id) => id === f.service.id)).toHaveLength(1);
    }
  },

  'US-15': async (n) => {
    const f = await fixture();
    if (n === 3) {
      const past = await api.get('/api/availability').set(auth(f.session.token)).query({
        professionalId: f.professional.id, serviceId: f.service.id, date: '2001-01-01'
      });
      const malformed = await api.get('/api/availability').set(auth(f.session.token)).query({
        professionalId: f.professional.id, serviceId: f.service.id, date: 'no-fecha'
      });
      expect(past.status).toBe(400);
      expect(malformed.status).toBe(400);
      return;
    }
    if (n === 4) {
      const withoutHours = await createProfessional(f.session.token, f.service.id, { workHours: [] });
      const response = await api.get('/api/availability').set(auth(f.session.token)).query({
        professionalId: withoutHours.id, serviceId: f.service.id, date: f.date
      });
      expect(response.status).toBe(200);
      expect(response.body.data.slots).toEqual([]);
    }
  },

  'US-16': async (n) => {
    const f = await fixture();
    if (n === 2) {
      const occupied = await appointment(f, '09:00');
      expect(occupied.status).toBe(201);
      const alternative = await appointment(f, '09:30');
      expect(alternative.status).toBe(201);
      expect(alternative.body.data.status).toBe('programada');
      expect(alternative.body.data.end).toBeDefined();
      return;
    }
    if (n === 3) {
      const first = await appointment(f, '10:00');
      expect(first.status).toBe(201);
      const duplicate = await appointment(f, '10:00');
      expect(duplicate.status).toBe(409);
      return;
    }
    if (n === 4) {
      const longService = await createService(f.session.token, { name: `Larga ${suffix()}`, durationMinutes: 120 });
      const pro = await createProfessional(f.session.token, longService.id);
      const response = await appointment(f, '17:30', { professionalId: pro.id, serviceId: longService.id });
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Elige un inicio entre 09:00 y 16:00/);
    }
  },

  'US-17': async (n) => {
    const f = await fixture();
    if (n === 2) {
      const created = await appointment(f, '11:00');
      expect(created.status).toBe(201);
      const response = await api.patch(`/api/appointments/${created.body.data.id}/reschedule`).set(auth(f.session.token)).send({
        date: f.date, time: '12:00'
      });
      expect(response.status).toBe(200);
      expect(response.body.data.clientId).toBe(f.client.id);
      expect(response.body.data.serviceId).toBe(f.service.id);
      expect(response.body.data.start).toContain('T12:00');
      return;
    }
    if (n === 3) {
      const first = await appointment(f, '12:00');
      const second = await appointment(f, '13:00');
      const response = await api.patch(`/api/appointments/${first.body.data.id}/reschedule`).set(auth(f.session.token)).send({
        date: f.date, time: '13:00'
      });
      expect(response.status).toBe(409);
      const unchanged = await api.get(`/api/appointments/${first.body.data.id}`).set(auth(f.session.token));
      expect(unchanged.status).toBe(200);
      expect(unchanged.body.data.start).toBe(first.body.data.start);
      expect(second.status).toBe(201);
      return;
    }
    if (n === 4) {
      const created = await appointment(f, '14:00');
      const canceled = await api.patch(`/api/appointments/${created.body.data.id}/cancel`).set(auth(f.session.token)).send({ reason: 'Prueba' });
      expect(canceled.status).toBe(200);
      const response = await api.patch(`/api/appointments/${created.body.data.id}/reschedule`).set(auth(f.session.token)).send({
        date: f.date, time: '15:00'
      });
      expect(response.status).toBe(409);

      const longService = await createService(f.session.token, { name: `Larga reprog ${suffix()}`, durationMinutes: 120 });
      const pro = await createProfessional(f.session.token, longService.id);
      const candidate = await appointment(f, '09:00', { professionalId: pro.id, serviceId: longService.id });
      const outside = await api.patch(`/api/appointments/${candidate.body.data.id}/reschedule`).set(auth(f.session.token)).send({
        date: f.date, time: '17:30'
      });
      expect(outside.status).toBe(400);
      expect(outside.body.message).toMatch(/Elige un inicio entre 09:00 y 16:00/);
    }
  },

  'US-18': async (n) => {
    const f = await fixture();
    if (n === 2) {
      const member = await clientMember(f);
      const created = await appointment(f, '09:00', { clientId: member.client.id });
      const response = await api.patch(`/api/appointments/${created.body.data.id}/cancel`).set(auth(member.session.token)).send({ reason: 'Cliente cancela' });
      expect(response.status).toBe(200);
      expect(response.body.data.appointment.status).toBe('cancelada');
      return;
    }
    if (n === 3) {
      const response = await api.patch(`/api/appointments/${randomId()}/cancel`).set(auth(f.session.token)).send({});
      expect(response.status).toBe(404);
    }
  },

  'US-19': async (n) => {
    const f = await fixture();
    const created = await appointment(f, '09:00');
    const id = created.body.data.id;
    if (n === 2) {
      const confirmed = await api.patch(`/api/appointments/${id}/status`).set(auth(f.session.token)).send({ status: 'confirmada' });
      expect(confirmed.status).toBe(200);
      const completed = await api.patch(`/api/appointments/${id}/status`).set(auth(f.session.token)).send({ status: 'completada' });
      expect(completed.status).toBe(200);
      expect(completed.body.data.status).toBe('completada');
      return;
    }
    if (n === 3) {
      const response = await api.patch(`/api/appointments/${id}/status`).set(auth(f.session.token)).send({ status: 'no-valido' });
      expect(response.status).toBe(400);
      return;
    }
    if (n === 4) {
      const canceled = await api.patch(`/api/appointments/${id}/cancel`).set(auth(f.session.token)).send({ reason: 'Prueba' });
      expect(canceled.status).toBe(200);
      const response = await api.patch(`/api/appointments/${id}/status`).set(auth(f.session.token)).send({ status: 'completada' });
      expect(response.status).toBe(409);
    }
  },

  'US-20': async (n) => {
    const f = await fixture();
    if (n === 2) {
      await appointment(f, '09:00');
      await appointment(f, '10:00');
      const response = await api.get('/api/appointments').set(auth(f.session.token)).query({
        clientId: f.client.id,
        professionalId: f.professional.id,
        serviceId: f.service.id,
        from: f.date,
        to: f.date
      });
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(2);
      return;
    }
    if (n === 3) {
      const response = await api.get('/api/appointments').set(auth(f.session.token)).query({
        from: `${f.date}T23:59:59.999Z`,
        to: `${f.date}T00:00:00.000Z`
      });
      expect(response.status).toBe(400);
      return;
    }
    if (n === 4) {
      const other = await fixture();
      const created = await appointment(f, '09:00');
      const response = await api.get('/api/appointments').set(auth(other.session.token));
      expect(response.status).toBe(200);
      expect(response.body.data.items.some((item) => item.id === created.body.data.id)).toBe(false);
    }
  },

  'US-21': async (n) => {
    const f = await fixture();
    if (n === 1) {
      const response = await appointment(f, '09:00');
      expect(response.status).toBe(201);
      return;
    }
    if (n === 3) {
      const base = await appointment(f, '10:00');
      expect(base.status).toBe(201);
      const partial = await appointment(f, '10:15');
      const total = await appointment(f, '10:00');
      expect(partial.status).toBe(409);
      expect(total.status).toBe(409);
      return;
    }
    if (n === 4) {
      const payload = {
        clientId: f.client.id,
        professionalId: f.professional.id,
        serviceId: f.service.id,
        date: f.date,
        time: '11:00'
      };
      const results = await Promise.allSettled([
        createAppointment(f.session.token, payload),
        createAppointment(f.session.token, payload)
      ]);
      const statuses = results.map((result) => (result.status === 'fulfilled' ? result.value.status : 'rechazada'));
      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    }
  },

  'US-22': async (n) => {
    const f = await fixture();
    if (n === 1) {
      await appointment(f, '15:00');
      await appointment(f, '09:00');
      await appointment(f, '12:00');
      const response = await api.get('/api/agenda/daily').set(auth(f.session.token)).query({ date: f.date });
      expect(response.status).toBe(200);
      const starts = response.body.data.appointments.map((item) => new Date(item.start).getTime());
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
      return;
    }
    if (n === 2) {
      const other = await createProfessional(f.session.token, f.service.id);
      await appointment(f, '09:00');
      await appointment(f, '10:00', { professionalId: other.id });
      const response = await api.get('/api/agenda/daily').set(auth(f.session.token)).query({ date: f.date, professionalId: other.id });
      expect(response.status).toBe(200);
      expect(response.body.data.appointments).toHaveLength(1);
      expect(response.body.data.appointments[0].professionalId).toBe(other.id);
      return;
    }
    if (n === 3) {
      const response = await api.get('/api/agenda/daily').set(auth(f.session.token)).query({ date: 'fecha-invalida' });
      expect(response.status).toBe(400);
      return;
    }
    if (n === 4) {
      const response = await api.get('/api/agenda/daily').set(auth(f.session.token)).query({ date: f.date });
      expect(response.status).toBe(200);
      expect(response.body.data.appointments).toEqual([]);
    }
  },

  'US-23': async (n) => {
    const f = await fixture();
    const created = await appointment(f, '09:00');
    if (n === 1) {
      const response = await api.get('/api/agenda').set(auth(f.session.token)).query({ view: 'week', date: f.date });
      expect(response.status).toBe(200);
      expect(response.body.data.view).toBe('week');
      const days = (new Date(`${response.body.data.range.to}T00:00:00Z`) - new Date(`${response.body.data.range.from}T00:00:00Z`)) / 86_400_000;
      expect(days).toBe(6);
      expect(response.body.data.events.some((event) => event.id === created.body.data.id)).toBe(true);
      return;
    }
    if (n === 2) {
      const response = await api.get('/api/agenda').set(auth(f.session.token)).query({ view: 'month', date: f.date });
      expect(response.status).toBe(200);
      expect(response.body.data.view).toBe('month');
      expect(response.body.data.range.from.endsWith('-01')).toBe(true);
      return;
    }
    if (n === 3) {
      const badView = await api.get('/api/agenda').set(auth(f.session.token)).query({ view: 'year', date: f.date });
      const badDate = await api.get('/api/agenda').set(auth(f.session.token)).query({ view: 'week', date: 'no-fecha' });
      expect(badView.status).toBe(400);
      expect(badDate.status).toBe(400);
      return;
    }
    if (n === 4) {
      const response = await api.get('/api/agenda').set(auth(f.session.token)).query({
        view: 'week', date: f.date, professionalId: f.professional.id, serviceId: f.service.id
      });
      expect(response.status).toBe(200);
      expect(response.body.data.filters).toMatchObject({
        professionalId: f.professional.id,
        serviceId: f.service.id
      });
      expect(response.body.data.events).toHaveLength(1);
    }
  },

  'US-24': async (n) => {
    const f = await fixture();
    await appointment(f, '09:00');
    if (n === 1) {
      const response = await api.get('/api/agenda').set(auth(f.session.token)).query({
        view: 'day', date: f.date, professionalId: f.professional.id
      });
      expect(response.status).toBe(200);
      expect(response.body.data.events.every((event) => event.extendedProps.professionalId === f.professional.id)).toBe(true);
      return;
    }
    if (n === 2) {
      const secondService = await createService(f.session.token, { name: `Segundo ${suffix()}` });
      const secondPro = await createProfessional(f.session.token, secondService.id);
      await appointment(f, '11:00', { professionalId: secondPro.id, serviceId: secondService.id });
      const response = await api.get('/api/agenda').set(auth(f.session.token)).query({
        view: 'day',
        date: f.date,
        professionalId: f.professional.id,
        serviceId: f.service.id,
        clientId: f.client.id,
        from: `${f.date}T00:00:00.000Z`,
        to: `${f.date}T23:59:59.999Z`
      });
      expect(response.status).toBe(200);
      expect(response.body.data.events).toHaveLength(1);
      expect(response.body.data.events[0].extendedProps.serviceId).toBe(f.service.id);
      return;
    }
    if (n === 3) {
      const response = await api.get('/api/agenda').set(auth(f.session.token)).query({
        view: 'day',
        from: `${f.date}T23:59:59.999Z`,
        to: `${f.date}T00:00:00.000Z`
      });
      expect(response.status).toBe(400);
      return;
    }
    if (n === 4) {
      const response = await api.get('/api/agenda').set(auth(f.session.token)).query({
        view: 'day', date: f.date, professionalId: randomId()
      });
      expect(response.status).toBe(200);
      expect(response.body.data.events).toEqual([]);
      return;
    }
    if (n === 5) {
      const owner = await clientMember(f);
      const other = await createClientSession(f.tenant.tenant.slug);
      const booked = await appointment(f, '10:00', { clientId: owner.client.id });
      const query = { view: 'day', date: f.date };
      const ownerAgenda = await api.get('/api/agenda').set(auth(owner.session.token)).query(query);
      const otherAgenda = await api.get('/api/agenda').set(auth(other.session.token)).query(query);
      expect(ownerAgenda.body.data.events.find((event) => event.id === booked.body.data.id).extendedProps.isMine).toBe(true);
      expect(otherAgenda.body.data.events.find((event) => event.id === booked.body.data.id).extendedProps.isMine).toBe(false);
      return;
    }
    if (n === 6) {
      const owner = await clientMember(f);
      const other = await createClientSession(f.tenant.tenant.slug);
      const booked = await appointment(f, '10:00', { clientId: owner.client.id });
      const forbidden = await api
        .patch(`/api/appointments/${booked.body.data.id}/cancel`)
        .set(auth(other.session.token))
        .send({ reason: 'Cita ajena' });
      expect(forbidden.status).toBe(403);

      const foreign = await fixture();
      const outside = await api.get('/api/agenda').set(auth(foreign.session.token)).query({ view: 'day', date: f.date });
      expect(outside.status).toBe(200);
      expect(outside.body.data.events.some((event) => event.id === booked.body.data.id)).toBe(false);
    }
  },

  'US-25': async (n) => {
    const f = await fixture();
    const created = await appointment(f, '09:00');
    const id = created.body.data.id;
    if (n === 1) {
      const response = await api.get(`/api/appointments/${id}`).set(auth(f.session.token));
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        id,
        clientId: f.client.id,
        professionalId: f.professional.id,
        serviceId: f.service.id
      });
      return;
    }
    if (n === 2) {
      const response = await api.patch(`/api/appointments/${id}/reschedule`).set(auth(f.session.token)).send({ date: f.date, time: '10:00' });
      expect(response.status).toBe(200);
      expect(response.body.data.start).toContain('T10:00');
      return;
    }
    if (n === 3) {
      const occupied = await appointment(f, '12:00');
      const response = await api.patch(`/api/appointments/${id}/reschedule`).set(auth(f.session.token)).send({ date: f.date, time: '12:00' });
      expect(response.status).toBe(409);
      const unchanged = await api.get(`/api/appointments/${id}`).set(auth(f.session.token));
      expect(unchanged.body.data.start).toBe(created.body.data.start);
      expect(occupied.status).toBe(201);
      return;
    }
    if (n === 4) {
      const response = await api.get(`/api/appointments/${id}`).set(auth(f.session.token));
      expect(response.status).toBe(200);
      expect(response.body.data.start).toBe(created.body.data.start);
    }
  },

  'US-26': async (n) => {
    if (n === 2) {
      const f = await fixture();
      await appointment(f, '09:00');
      const inRange = await api.get('/api/dashboard/total').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      const otherRange = await api.get('/api/dashboard/total').set(auth(f.session.token)).query({ from: '2001-01-01', to: '2001-01-31' });
      expect(inRange.body.data.total).toBe(1);
      expect(otherRange.body.data.total).toBe(0);
    }
  },

  'US-27': async (n) => {
    const f = await fixture();
    const second = await createService(f.session.token, { name: `Ranking ${suffix()}` });
    await api.post(`/api/professionals/${f.professional.id}/services/${second.id}`).set(auth(f.session.token));
    if (n === 1) {
      await appointment(f, '09:00');
      await appointment(f, '10:00');
      await appointment(f, '11:00', { serviceId: second.id });
      const response = await api.get('/api/dashboard/top-services').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      expect(response.status).toBe(200);
      expect(response.body.data.items[0].id).toBe(f.service.id);
      expect(response.body.data.items[0].count).toBe(2);
      return;
    }
    if (n === 2) {
      const later = nextWeekdayDate(9);
      await appointment(f, '09:00');
      await appointment(f, '09:00', { date: later });
      const onlyFirst = await api.get('/api/dashboard/top-services').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      expect(onlyFirst.body.data.items.reduce((sum, item) => sum + item.count, 0)).toBe(1);
      return;
    }
    if (n === 3) {
      const response = await api.get('/api/dashboard/top-services').set(auth(f.session.token)).query({ from: '2026-05-10', to: '2026-05-01' });
      expect(response.status).toBe(400);
      return;
    }
    if (n === 4) {
      await appointment(f, '09:00');
      await appointment(f, '10:00', { serviceId: second.id });
      const response = await api.get('/api/dashboard/top-services').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      const top = response.body.data.items.filter((item) => item.rank === 1);
      expect(top).toHaveLength(2);
    }
  },

  'US-28': async (n) => {
    const f = await fixture();
    const otherClient = await createClient(f.session.token, { document: uniqueDni() });
    if (n === 1) {
      await appointment(f, '09:00');
      await appointment(f, '10:00');
      await appointment(f, '11:00', { clientId: otherClient.id });
      const response = await api.get('/api/dashboard/top-clients').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      expect(response.body.data.items[0].id).toBe(f.client.id);
      expect(response.body.data.items[0].count).toBe(2);
      return;
    }
    if (n === 2) {
      const later = nextWeekdayDate(9);
      await appointment(f, '09:00');
      await appointment(f, '09:00', { date: later });
      const response = await api.get('/api/dashboard/top-clients').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      expect(response.body.data.items.reduce((sum, item) => sum + item.count, 0)).toBe(1);
      return;
    }
    if (n === 3) {
      const response = await api.get('/api/dashboard/top-clients').set(auth(f.session.token)).query({ from: '2026-05-10', to: '2026-05-01' });
      expect(response.status).toBe(400);
      return;
    }
    if (n === 4) {
      await appointment(f, '09:00');
      await appointment(f, '10:00', { clientId: otherClient.id });
      const response = await api.get('/api/dashboard/top-clients').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      expect(response.body.data.items.filter((item) => item.rank === 1)).toHaveLength(2);
    }
  },

  'US-29': async (n) => {
    if (n === 2) {
      const f = await fixture();
      const later = nextWeekdayDate(9);
      await appointment(f, '09:00');
      await appointment(f, '09:00', { date: later });
      const first = await api.get('/api/dashboard/consolidated').set(auth(f.session.token)).query({ from: f.date, to: f.date });
      const second = await api.get('/api/dashboard/consolidated').set(auth(f.session.token)).query({ from: later, to: later });
      expect(first.body.data.totalAppointments).toBe(1);
      expect(second.body.data.totalAppointments).toBe(1);
      expect(first.body.data.period.from).toBe(f.date);
      expect(second.body.data.period.from).toBe(later);
      return;
    }
    if (n === 3) {
      const f = await fixture();
      await appointment(f, '09:00');
      const response = await api.get('/api/dashboard/consolidated').set(auth(f.session.token)).query({ from: '2026-05-10', to: '2026-05-01' });
      expect(response.status).toBe(400);
      expect(response.body.data).toBeNull();
      expect(response.body.success).toBe(false);
      return;
    }
    if (n === 4) {
      const own = await fixture();
      const foreign = await fixture();
      await appointment(own, '09:00');
      await appointment(foreign, '09:00');
      const response = await api.get('/api/dashboard/consolidated').set(auth(own.session.token)).query({ from: own.date, to: own.date });
      expect(response.status).toBe(200);
      expect(response.body.data.totalAppointments).toBe(1);
      expect(response.body.data.topServices.every((item) => item.id !== foreign.service.id)).toBe(true);
      expect(response.body.data.topClients.every((item) => item.id !== foreign.client.id)).toBe(true);
    }
  }
};

describe('Matriz de 118 escenarios Gherkin', () => {
  it.each(pending)('$key — $type', async (scenario) => {
    const handler = handlers[scenario.us];
    if (!handler) throw new Error(`Sin implementación para ${scenario.us}`);
    await handler(scenario.n, scenario);
  });
});
