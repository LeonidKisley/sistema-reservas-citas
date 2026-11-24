import { describe, expect, it } from 'vitest';
import { api, auth, createClientSession, createService, createTenant, login } from './helpers.js';

describe('Servicios: categoría, tendencia, orden y reactivación', () => {
  it('crea y actualiza categoría, tendencia y orden, y valida la categoría', async () => {
    const tenant = await createTenant();
    const admin = await login(tenant.tenant.slug, tenant.admin.email);

    const created = await createService(admin.token, {
      name: 'Servicio con categoría',
      durationMinutes: 30,
      price: 10,
      category: 'unas',
      trending: true,
      order: 4
    });
    expect(created.category).toBe('unas');
    expect(created.trending).toBe(true);
    expect(created.order).toBe(4);
    expect(created.images).toEqual([]);
    expect(created.publicId).toBeTruthy();

    const invalid = await api.post('/api/services').set(auth(admin.token)).send({
      name: 'Categoría inválida', durationMinutes: 30, price: 10, category: 'inexistente'
    });
    expect(invalid.status).toBe(400);

    const updated = await api.patch(`/api/services/${created.id}`).set(auth(admin.token)).send({
      category: 'rostro', trending: false, order: 7, description: 'Descripción editada'
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.category).toBe('rostro');
    expect(updated.body.data.trending).toBe(false);
    expect(updated.body.data.order).toBe(7);
    expect(updated.body.data.description).toBe('Descripción editada');

    const listed = await api.get('/api/services').set(auth(admin.token));
    expect(listed.body.data.find((item) => item.id === created.id)).toMatchObject({
      category: 'rostro', trending: false, order: 7
    });
  });

  it('da de baja y reactiva un servicio limpiando deletedAt', async () => {
    const tenant = await createTenant();
    const admin = await login(tenant.tenant.slug, tenant.admin.email);
    const client = await createClientSession(tenant.tenant.slug);
    const service = await createService(admin.token, { name: 'Servicio temporal' });

    const removed = await api.delete(`/api/services/${service.id}`).set(auth(admin.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.active).toBe(false);

    const clientList = await api.get('/api/services').set(auth(client.session.token));
    expect(clientList.body.data.some((item) => item.id === service.id)).toBe(false);

    const staffList = await api.get('/api/services').query({ includeInactive: 'true' }).set(auth(admin.token));
    expect(staffList.body.data.some((item) => item.id === service.id)).toBe(true);

    const reactivated = await api.patch(`/api/services/${service.id}`).set(auth(admin.token)).send({ active: true });
    expect(reactivated.status).toBe(200);
    expect(reactivated.body.data.active).toBe(true);

    const clientAfter = await api.get('/api/services').set(auth(client.session.token));
    expect(clientAfter.body.data.some((item) => item.id === service.id)).toBe(true);
  });

  it('impide que un cliente solicite el listado con inactivos', async () => {
    const tenant = await createTenant();
    const client = await createClientSession(tenant.tenant.slug);
    const denied = await api.get('/api/services').query({ includeInactive: 'true' }).set(auth(client.session.token));
    expect(denied.status).toBe(403);
  });
});
