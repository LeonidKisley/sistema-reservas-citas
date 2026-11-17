import { describe, it, expect } from 'vitest';
import { api, createTenant, login, auth, createService, createProfessional, createClient, createAppointment, nextWeekdayDate } from './helpers.js';

async function setupWithAppointments(count = 3) {
  const tenant = await createTenant();
  const session = await login(tenant.tenant.slug, tenant.admin.email);
  const service = await createService(session.token, { durationMinutes: 30 });
  const professional = await createProfessional(session.token, service.id);
  const client = await createClient(session.token);
  const date = nextWeekdayDate();

  for (let index = 0; index < count; index += 1) {
    const hour = String(9 + index).padStart(2, '0');
    await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: `${hour}:00`
    });
  }
  return { session, service, client, date };
}

describe('US-26 a US-29: dashboard y agregaciones por tenant', () => {
  it('calcula el total de citas del periodo', async () => {
    const { session, date } = await setupWithAppointments(3);
    const response = await api.get('/api/dashboard/total').set(auth(session.token)).query({ from: date, to: date });
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(3);
  });

  it('devuelve cero cuando no hay citas en el periodo', async () => {
    const { session } = await setupWithAppointments(1);
    const response = await api.get('/api/dashboard/total').set(auth(session.token)).query({ from: '2001-01-01', to: '2001-01-31' });
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(0);
  });

  it('rechaza periodos inválidos', async () => {
    const { session } = await setupWithAppointments(1);
    const response = await api.get('/api/dashboard/consolidated').set(auth(session.token)).query({ from: '2026-05-10', to: '2026-05-01' });
    expect(response.status).toBe(400);
  });

  it('consolida KPIs con ranking y sin fugas entre tenants', async () => {
    const { session, service, client, date } = await setupWithAppointments(2);
    const response = await api.get('/api/dashboard/consolidated').set(auth(session.token)).query({ from: date, to: date });
    expect(response.status).toBe(200);
    expect(response.body.data.totalAppointments).toBe(2);
    expect(response.body.data.topServices[0].name).toBe(service.name);
    expect(response.body.data.topClients[0].name).toContain(client.firstName);
    expect(response.body.data.auditCount).toBe(2);
  });
});
