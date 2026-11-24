import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { api, auth, createService, createTenant, emailAt, login } from './helpers.js';
import { env } from '../src/config/env.js';
import { SERVICE_IMAGE_MAX_BYTES } from '../src/constants/serviceImages.js';

const tenantIds = [];

afterEach(async () => {
  await Promise.all(tenantIds.splice(0).map((id) => fs.rm(
    resolve(process.cwd(), env.storageDir, 'servicios', id),
    { recursive: true, force: true }
  )));
});

async function setup() {
  const tenant = await createTenant();
  tenantIds.push(tenant.tenant.id);
  const admin = await login(tenant.tenant.slug, tenant.admin.email);
  const service = await createService(admin.token, { name: `Galería ${Date.now()}` });
  return { tenant, admin, service };
}

function attachImages(request, files) {
  files.forEach(({ filename = 'foto.jpg', contentType = 'image/jpeg', size = 64 }) => {
    request.attach('images', Buffer.alloc(size, 1), { filename, contentType });
  });
  return request;
}

describe('Fotos de servicios', () => {
  it('sube fotos, guarda la URL y las sirve por /uploads', async () => {
    const { admin, service } = await setup();
    const response = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(admin.token)),
      [{ filename: 'una.png', contentType: 'image/png' }]
    );
    expect(response.status).toBe(201);
    expect(response.body.data.images).toHaveLength(1);
    expect(response.body.data.images[0].name).toMatch(/\.png$/);
    expect(response.body.data.images[0].url).toMatch(/^\/uploads\/[^/]+\/[^/]+\/.+\.png$/);

    const file = await api.get(response.body.data.images[0].url);
    expect(file.status).toBe(200);
  });

  it('borra la foto de la BD y del disco', async () => {
    const { admin, service } = await setup();
    const uploaded = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(admin.token)),
      [{ filename: 'borrar.jpg' }]
    );
    const image = uploaded.body.data.images[0];

    const removed = await api.delete(`/api/services/${service.id}/images/${encodeURIComponent(image.name)}`).set(auth(admin.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.images).toEqual([]);

    const file = await api.get(image.url);
    expect(file.status).toBe(404);
  });

  it('rechaza formatos no permitidos', async () => {
    const { admin, service } = await setup();
    const response = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(admin.token)),
      [{ filename: 'no.gif', contentType: 'image/gif' }]
    );
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('jpg');
  });

  it('rechaza fotos de más de 2 MB', async () => {
    const { admin, service } = await setup();
    const response = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(admin.token)),
      [{ filename: 'grande.jpg', size: SERVICE_IMAGE_MAX_BYTES + 1 }]
    );
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('2 MB');
  });

  it('rechaza más de 6 fotos', async () => {
    const { admin, service } = await setup();
    const files = Array.from({ length: 7 }, () => ({ filename: 'foto.jpg', size: 32 }));
    const response = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(admin.token)),
      files
    );
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('6 fotos');
  });

  it('reordena las fotos sin renombrar los archivos', async () => {
    const { admin, service } = await setup();
    const uploaded = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(admin.token)),
      [{ filename: 'primera.jpg' }, { filename: 'segunda.jpg' }]
    );
    const names = uploaded.body.data.images.map((image) => image.name);

    const response = await api.patch(`/api/services/${service.id}/images/order`)
      .set(auth(admin.token))
      .send({ order: [names[1], names[0]] });

    expect(response.status).toBe(200);
    expect(response.body.data.images.map((image) => image.name)).toEqual([names[1], names[0]]);
    expect(response.body.data.images[0].url).toBe(uploaded.body.data.images[1].url);
  });

  it('impide que otro tenant y un Recepcionista toquen las fotos', async () => {
    const { tenant, admin, service } = await setup();
    const uploaded = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(admin.token)),
      [{ filename: 'privada.jpg' }]
    );
    const name = uploaded.body.data.images[0].name;

    const other = await createTenant();
    tenantIds.push(other.tenant.id);
    const otherAdmin = await login(other.tenant.slug, other.admin.email);
    const foreignUpload = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(otherAdmin.token)),
      [{ filename: 'ajena.jpg' }]
    );
    expect(foreignUpload.status).toBe(403);

    const foreignDelete = await api.delete(`/api/services/${service.id}/images/${encodeURIComponent(name)}`).set(auth(otherAdmin.token));
    expect(foreignDelete.status).toBe(403);

    const staff = await api.post('/api/users').set(auth(admin.token)).send({
      email: emailAt(tenant, `recepcion${Date.now()}`),
      password: 'Recepcion1234',
      role: 'Recepcionista',
      firstName: 'Rebeca',
      lastName: 'Recepción'
    });
    expect(staff.status).toBe(201);
    const receptionist = await login(tenant.tenant.slug, staff.body.data.email, 'Recepcion1234');
    const denied = await attachImages(
      api.post(`/api/services/${service.id}/images`).set(auth(receptionist.token)),
      [{ filename: 'no-permite.jpg' }]
    );
    expect(denied.status).toBe(403);
  });
});
