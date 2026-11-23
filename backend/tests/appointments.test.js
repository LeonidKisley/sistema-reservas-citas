import { describe, it, expect } from 'vitest';
import { api, createTenant, login, auth, createService, createProfessional, createClient, createClientSession, createAppointment, nextWeekdayDate } from './helpers.js';

async function setup() {
  const tenant = await createTenant();
  const session = await login(tenant.tenant.slug, tenant.admin.email);
  const service = await createService(session.token, { name: `Consulta ${Date.now()}`, durationMinutes: 30 });
  const professional = await createProfessional(session.token, service.id);
  const client = await createClient(session.token);
  return { tenant, session, service, professional, client, date: nextWeekdayDate() };
}

describe('US-15 a US-21: disponibilidad, citas y no solapamiento', () => {
  it('retorna bloques libres y respeta jornada del profesional', async () => {
    const { session, professional, service, date } = await setup();
    const response = await api
      .get('/api/availability')
      .set(auth(session.token))
      .query({ professionalId: professional.id, serviceId: service.id, date });
    expect(response.status).toBe(200);
    expect(response.body.data.slots.length).toBeGreaterThan(0);
    expect(response.body.data.slots[0].startTime).toBeDefined();
  });

  it('rechaza solapamientos y permite bloques contiguos', async () => {
    const { session, service, professional, client, date } = await setup();
    const first = await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: '10:00'
    });
    expect(first.status).toBe(201);

    const overlapping = await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: '10:15'
    });
    expect(overlapping.status).toBe(409);

    const contiguous = await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: '10:30'
    });
    expect(contiguous.status).toBe(201);
  });

  it('valida transiciones de estado del catálogo oficial', async () => {
    const { session, service, professional, client, date } = await setup();
    const created = await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: '11:00'
    });
    const id = created.body.data.id;

    const invalid = await api.patch(`/api/appointments/${id}/status`).set(auth(session.token)).send({ status: 'completada' });
    expect(invalid.status).toBe(409);

    const unknown = await api.patch(`/api/appointments/${id}/status`).set(auth(session.token)).send({ status: 'en revision' });
    expect(unknown.status).toBe(400);

    const confirmed = await api.patch(`/api/appointments/${id}/status`).set(auth(session.token)).send({ status: 'confirmada' });
    expect(confirmed.status).toBe(200);
    const completed = await api.patch(`/api/appointments/${id}/status`).set(auth(session.token)).send({ status: 'completada' });
    expect(completed.status).toBe(200);

    const afterCompleted = await api.patch(`/api/appointments/${id}/status`).set(auth(session.token)).send({ status: 'cancelada' });
    expect(afterCompleted.status).toBe(409);
  });

  it('reprograma, cancela de forma idempotente y libera el bloque', async () => {
    const { session, service, professional, client, date } = await setup();
    const base = { clientId: client.id, professionalId: professional.id, serviceId: service.id, date };

    const first = await createAppointment(session.token, { ...base, time: '12:00' });
    const second = await createAppointment(session.token, { ...base, time: '13:00' });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const busyReschedule = await api
      .patch(`/api/appointments/${first.body.data.id}/reschedule`)
      .set(auth(session.token))
      .send({ date, time: '13:00' });
    expect(busyReschedule.status).toBe(409);

    const cancelSecond = await api.patch(`/api/appointments/${second.body.data.id}/cancel`).set(auth(session.token)).send({ reason: 'Prueba' });
    expect(cancelSecond.status).toBe(200);
    const idempotent = await api.patch(`/api/appointments/${second.body.data.id}/cancel`).set(auth(session.token)).send({});
    expect(idempotent.body.data.idempotent).toBe(true);

    const rescheduled = await api
      .patch(`/api/appointments/${first.body.data.id}/reschedule`)
      .set(auth(session.token))
      .send({ date, time: '13:00' });
    expect(rescheduled.status).toBe(200);
    expect(rescheduled.body.data.clientId).toBe(client.id);
    expect(rescheduled.body.data.serviceId).toBe(service.id);
  });

  it('publica el bloque reservado con su dueño y marca isMine solo para ese cliente', async () => {
    const { tenant, session, service, professional, date } = await setup();
    const owner = await createClientSession(tenant.tenant.slug, { firstName: 'Ana', lastName: 'Dueña' });
    const other = await createClientSession(tenant.tenant.slug, { firstName: 'Luis', lastName: 'Otro' });
    const created = await createAppointment(session.token, {
      clientId: owner.session.user.clientId,
      professionalId: professional.id,
      serviceId: service.id,
      date,
      time: '09:00'
    });
    expect(created.status).toBe(201);

    const query = { professionalId: professional.id, serviceId: service.id, date };
    const asOwner = await api.get('/api/availability').set(auth(owner.session.token)).query(query);
    expect(asOwner.status).toBe(200);
    const mine = asOwner.body.data.bookedSlots.find((slot) => slot.id === created.body.data.id);
    expect(mine).toMatchObject({
      available: false,
      isMine: true,
      status: 'programada',
      startTime: '09:00',
      clientName: 'Ana Dueña'
    });
    expect(asOwner.body.data.slots.some((slot) => slot.startTime === '09:00')).toBe(false);

    const asOther = await api.get('/api/availability').set(auth(other.session.token)).query(query);
    const foreign = asOther.body.data.bookedSlots.find((slot) => slot.id === created.body.data.id);
    expect(foreign).toMatchObject({
      isMine: false,
      clientName: 'Ana Dueña',
      professionalName: `${professional.firstName} ${professional.lastName}`.trim(),
      serviceName: service.name
    });

    const agenda = await api.get('/api/agenda').set(auth(owner.session.token)).query({ view: 'day', date });
    const event = agenda.body.data.events.find((item) => item.id === created.body.data.id);
    expect(event.extendedProps.isMine).toBe(true);
  });

  it('sincroniza la agenda entre clientas del mismo negocio sin mezclar tenants', async () => {
    const { tenant, session, service, professional, date } = await setup();
    const owner = await createClientSession(tenant.tenant.slug, { firstName: 'María', lastName: 'Agenda' });
    const other = await createClientSession(tenant.tenant.slug, { firstName: 'Lucía', lastName: 'Agenda' });
    const created = await createAppointment(session.token, {
      clientId: owner.session.user.clientId,
      professionalId: professional.id,
      serviceId: service.id,
      date,
      time: '10:00'
    });
    expect(created.status).toBe(201);

    const query = { view: 'day', date };
    const asOwner = await api.get('/api/agenda').set(auth(owner.session.token)).query(query);
    const asOther = await api.get('/api/agenda').set(auth(other.session.token)).query(query);
    expect(asOwner.status).toBe(200);
    expect(asOther.status).toBe(200);

    const ownerEvent = asOwner.body.data.events.find((item) => item.id === created.body.data.id);
    const otherEvent = asOther.body.data.events.find((item) => item.id === created.body.data.id);
    expect(ownerEvent.extendedProps).toMatchObject({ isMine: true, clientName: 'María Agenda' });
    expect(otherEvent.extendedProps).toMatchObject({ isMine: false, clientName: 'María Agenda' });
    expect(asOwner.body.data.count).toBe(asOther.body.data.count);

    const forbidden = await api
      .patch(`/api/appointments/${created.body.data.id}/cancel`)
      .set(auth(other.session.token))
      .send({ reason: 'No soy la dueña' });
    expect(forbidden.status).toBe(403);

    const otherTenant = await createTenant();
    const otherSession = await login(otherTenant.tenant.slug, otherTenant.admin.email);
    const outside = await api.get('/api/agenda').set(auth(otherSession.token)).query(query);
    expect(outside.status).toBe(200);
    expect(outside.body.data.events.some((item) => item.id === created.body.data.id)).toBe(false);
  });

  it('vuelve a liberar el bloque cuando se cancela la cita', async () => {
    const { session, service, professional, client, date } = await setup();
    const created = await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: '09:00'
    });
    expect(created.status).toBe(201);

    const query = { professionalId: professional.id, serviceId: service.id, date };
    const before = await api.get('/api/availability').set(auth(session.token)).query(query);
    expect(before.body.data.bookedSlots.some((slot) => slot.id === created.body.data.id)).toBe(true);

    const canceled = await api.patch(`/api/appointments/${created.body.data.id}/cancel`).set(auth(session.token)).send({ reason: 'Prueba' });
    expect(canceled.status).toBe(200);

    const after = await api.get('/api/availability').set(auth(session.token)).query(query);
    expect(after.body.data.bookedSlots.some((slot) => slot.id === created.body.data.id)).toBe(false);
    expect(after.body.data.slots.some((slot) => slot.startTime === '09:00')).toBe(true);
  });

  it('garantiza que otro tenant no puede consultar la cita', async () => {
    const { session, service, professional, client, date } = await setup();
    const created = await createAppointment(session.token, {
      clientId: client.id, professionalId: professional.id, serviceId: service.id, date, time: '14:00'
    });

    const otherTenant = await createTenant();
    const otherSession = await login(otherTenant.tenant.slug, otherTenant.admin.email);
    const response = await api.get(`/api/appointments/${created.body.data.id}`).set(auth(otherSession.token));
    expect(response.status).toBe(403);
  });
});
