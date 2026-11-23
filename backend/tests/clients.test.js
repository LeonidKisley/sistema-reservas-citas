import { describe, it, expect } from 'vitest';
import { api, createTenant, login, auth, createClient, createClientSession, createService, createProfessional, createAppointment, nextWeekdayDate, uniqueDni, emailAt } from './helpers.js';

describe('US-09 a US-11 y US-05: catálogo de clientes y aislamiento', () => {
  it('lista únicamente los clientes del tenant activo', async () => {
    const tenantA = await createTenant();
    const tenantB = await createTenant();
    const sessionA = await login(tenantA.tenant.slug, tenantA.admin.email);
    const sessionB = await login(tenantB.tenant.slug, tenantB.admin.email);

    const documentA = uniqueDni();
    const documentB = uniqueDni();
    await createClient(sessionA.token, { document: documentA });
    await createClient(sessionB.token, { document: documentB });

    const listA = await api.get('/api/clients').set(auth(sessionA.token));
    expect(listA.status).toBe(200);
    expect(listA.body.data.items).toHaveLength(1);
    expect(listA.body.data.items[0].document).toBe(documentA);
  });

  it('rechaza documentos duplicados dentro del mismo tenant', async () => {
    const tenant = await createTenant();
    const session = await login(tenant.tenant.slug, tenant.admin.email);
    const document = uniqueDni();
    await createClient(session.token, { document });

    const duplicate = await api.post('/api/clients').set(auth(session.token)).send({
      firstName: 'Otro',
      lastName: 'Cliente',
      document
    });
    expect(duplicate.status).toBe(409);
  });

  it('impide el borrado físico cuando el cliente tiene citas', async () => {
    const tenant = await createTenant();
    const session = await login(tenant.tenant.slug, tenant.admin.email);
    const service = await createService(session.token);
    const professional = await createProfessional(session.token, service.id);
    const client = await createClient(session.token, { document: uniqueDni() });

    const appointment = await createAppointment(session.token, {
      clientId: client.id,
      professionalId: professional.id,
      serviceId: service.id,
      date: nextWeekdayDate(),
      time: '10:00'
    });
    expect(appointment.status).toBe(201);

    const removed = await api.delete(`/api/clients/${client.id}`).set(auth(session.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.physicalDeleteBlocked).toBe(true);

    const get = await api.get(`/api/clients/${client.id}`).set(auth(session.token));
    expect(get.status).toBe(404);
  });

  it('permite a un cliente actualizar su propio nombre y no el de otro cliente', async () => {
    const tenant = await createTenant();
    const { client, session } = await createClientSession(tenant.tenant.slug, {
      firstName: 'Nombre',
      lastName: 'Original'
    });

    const me = await api.get('/api/auth/me').set(auth(session.token));
    expect(me.status).toBe(200);
    expect(me.body.data.firstName).toBe('Nombre');

    const updated = await api.patch(`/api/clients/${client.id}`).set(auth(session.token)).send({
      firstName: 'Carolina',
      lastName: 'Díaz',
      document: client.document,
      email: session.user.email
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.firstName).toBe('Carolina');
    expect(updated.body.data.lastName).toBe('Díaz');

    const admin = await login(tenant.tenant.slug, tenant.admin.email);
    const other = await createClient(admin.token, { document: uniqueDni() });
    const denied = await api.patch(`/api/clients/${other.id}`).set(auth(session.token)).send({
      firstName: 'Sin',
      lastName: 'Permiso',
      document: other.document
    });
    expect(denied.status).toBe(403);
  });

  it('un Recepcionista puede gestionar clientes pero no servicios', async () => {
    const tenant = await createTenant();
    const admin = await login(tenant.tenant.slug, tenant.admin.email);
    const staff = await api.post('/api/users').set(auth(admin.token)).send({
      email: emailAt(tenant, `recepcion${Date.now()}`),
      password: 'Recepcion1234',
      role: 'Recepcionista',
      firstName: 'Rebeca',
      lastName: 'Recepción'
    });
    expect(staff.status).toBe(201);

    const session = await login(tenant.tenant.slug, staff.body.data.email, 'Recepcion1234');
    const created = await api.post('/api/clients').set(auth(session.token)).send({
      firstName: 'Creado',
      lastName: 'Por Recepcion',
      document: uniqueDni()
    });
    expect(created.status).toBe(201);

    const forbidden = await api.post('/api/services').set(auth(session.token)).send({
      name: 'No permitido',
      durationMinutes: 30,
      price: 10
    });
    expect(forbidden.status).toBe(403);
  });
});
