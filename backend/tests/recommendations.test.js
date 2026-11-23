import { describe, it, expect } from 'vitest';
import {
  api,
  createTenant,
  login,
  auth,
  createService,
  createProfessional,
  createClient,
  createAppointment,
  nextWeekdayDate,
  emailAt,
  uniqueDni
} from './helpers.js';

async function setup() {
  const tenant = await createTenant();
  const session = await login(tenant.tenant.slug, tenant.admin.email);
  const service = await createService(session.token, { name: `Consulta ${Date.now()}`, durationMinutes: 30 });
  const otherService = await createService(session.token, { name: `Otro ${Date.now()}`, durationMinutes: 30 });
  const suffix = Date.now();
  const first = await createProfessional(session.token, service.id, {
    firstName: 'Ana', lastName: 'Alfa', email: emailAt(tenant, `ana${suffix}`)
  });
  const second = await createProfessional(session.token, service.id, {
    firstName: 'Bruno', lastName: 'Beta', email: emailAt(tenant, `bruno${suffix}`)
  });
  const withoutService = await createProfessional(session.token, otherService.id, {
    firstName: 'Carla', lastName: 'Gamma', email: emailAt(tenant, `carla${suffix}`)
  });
  const client = await createClient(session.token);

  const email = emailAt(tenant, `cliente${Date.now()}`);
  const registered = await api.post('/api/auth/register-client').send({
    tenant: tenant.tenant.slug,
    firstName: 'Cliente',
    lastName: 'Recomendaciones',
    document: uniqueDni(),
    email,
    password: 'Cliente1234'
  });
  if (registered.status !== 201) throw new Error(`No se pudo registrar cliente: ${JSON.stringify(registered.body)}`);
  const clientSession = await login(tenant.tenant.slug, email, 'Cliente1234');

  return { session, clientSession, service, first, second, withoutService, client, date: nextWeekdayDate() };
}

describe('Recomendación de profesionales por horario', () => {
  it('recomienda varios profesionales libres y excluye quienes no ofrecen el servicio', async () => {
    const { clientSession, service, first, second, withoutService, date } = await setup();
    const response = await api
      .get('/api/availability/recommended')
      .set(auth(clientSession.token))
      .query({ date, time: '10:00', serviceId: service.id });

    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(2);
    expect(response.body.data.professionals.map((item) => item.id)).toEqual(
      expect.arrayContaining([first.id, second.id])
    );
    expect(response.body.data.professionals.map((item) => item.id)).not.toContain(withoutService.id);
    expect(response.body.data.professionals[0].score).toBeGreaterThanOrEqual(response.body.data.professionals[1].score);
  });

  it('excluye al profesional que ya tiene una cita en ese horario', async () => {
    const { session, clientSession, service, first, second, client, date } = await setup();
    const created = await createAppointment(session.token, {
      clientId: client.id,
      professionalId: first.id,
      serviceId: service.id,
      date,
      time: '10:00'
    });
    expect(created.status).toBe(201);

    const response = await api
      .get('/api/availability/recommended')
      .set(auth(clientSession.token))
      .query({ date, time: '10:00', serviceId: service.id });

    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(1);
    expect(response.body.data.professionals[0].id).toBe(second.id);
  });

  it('valida la hora solicitada', async () => {
    const { session, date } = await setup();
    const response = await api
      .get('/api/availability/recommended')
      .set(auth(session.token))
      .query({ date, time: '25:00' });
    expect(response.status).toBe(400);
  });
});
