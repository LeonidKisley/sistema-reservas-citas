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
  updateAppointmentStatus,
  nextWeekdayDate
} from './helpers.js';

async function setupWithAppointments(count = 3, date = nextWeekdayDate()) {
  const tenant = await createTenant();
  const session = await login(tenant.tenant.slug, tenant.admin.email);
  const service = await createService(session.token, { durationMinutes: 30 });
  const professional = await createProfessional(session.token, service.id);
  const client = await createClient(session.token);
  const appointments = [];

  for (let index = 0; index < count; index += 1) {
    const hour = String(9 + index).padStart(2, '0');
    const created = await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: `${hour}:00`
    });
    if (created.status !== 201) throw new Error(`No se pudo crear cita: ${JSON.stringify(created.body)}`);
    appointments.push(created.body.data);
  }
  return { session, service, professional, client, date, appointments };
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

  it('aplica filtros combinados de profesional, servicio y estado en todos los indicadores', async () => {
    const { session, service, professional, client, date, appointments } = await setupWithAppointments(3);
    const confirmed = await updateAppointmentStatus(session.token, appointments[0].id, 'confirmada');
    expect(confirmed.status).toBe(200);

    const otherService = await createService(session.token, { durationMinutes: 30 });
    const otherProfessional = await createProfessional(session.token, otherService.id);
    const otherAppointment = await createAppointment(session.token, {
      clientId: client.id, professionalId: otherProfessional.id, serviceId: otherService.id, date, time: '12:00'
    });
    expect(otherAppointment.status).toBe(201);

    const response = await api.get('/api/dashboard/consolidated').set(auth(session.token)).query({
      from: date, to: date, professionalId: professional.id, serviceId: service.id, status: 'confirmada'
    });
    expect(response.status).toBe(200);
    expect(response.body.data.totalAppointments).toBe(1);
    expect(response.body.data.auditCount).toBe(1);
    expect(response.body.data.byStatus).toEqual({ confirmada: 1 });
    expect(response.body.data.topServices).toEqual([expect.objectContaining({ id: service.id, count: 1 })]);
    expect(response.body.data.topClients).toEqual([expect.objectContaining({ id: client.id, count: 1 })]);
    expect(response.body.data.topProfessionals).toEqual([expect.objectContaining({ id: professional.id, count: 1 })]);
  });

  it('rechaza identificadores y estados inválidos en los filtros', async () => {
    const { session, date } = await setupWithAppointments(1);
    const invalidQueries = [
      { professionalId: 'not-an-object-id' },
      { serviceId: 'not-an-object-id' },
      { clientId: 'not-an-object-id' },
      { status: 'pendiente' }
    ];

    for (const invalid of invalidQueries) {
      const response = await api.get('/api/dashboard/consolidated')
        .set(auth(session.token))
        .query({ from: date, to: date, ...invalid });
      expect(response.status).toBe(400);
    }
  });

  it('aísla totalAppointments y auditCount entre tenants con los mismos filtros', async () => {
    const date = nextWeekdayDate();
    const first = await setupWithAppointments(2, date);
    const second = await setupWithAppointments(1, date);
    const foreignQuery = {
      from: date,
      to: date,
      professionalId: first.professional.id,
      serviceId: first.service.id,
      status: 'programada'
    };

    const [firstResponse, secondResponse, secondOwnResponse] = await Promise.all([
      api.get('/api/dashboard/consolidated').set(auth(first.session.token)).query(foreignQuery),
      api.get('/api/dashboard/consolidated').set(auth(second.session.token)).query(foreignQuery),
      api.get('/api/dashboard/consolidated').set(auth(second.session.token)).query({
        ...foreignQuery, professionalId: second.professional.id, serviceId: second.service.id
      })
    ]);

    expect(firstResponse.body.data.totalAppointments).toBe(2);
    expect(firstResponse.body.data.auditCount).toBe(2);
    expect(secondResponse.body.data.totalAppointments).toBe(0);
    expect(secondResponse.body.data.auditCount).toBe(0);
    expect(secondOwnResponse.body.data.totalAppointments).toBe(1);
    expect(secondOwnResponse.body.data.auditCount).toBe(1);
  });
});
