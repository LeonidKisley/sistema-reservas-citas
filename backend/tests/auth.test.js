import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { api, createTenant, login, auth, uniqueDni, emailAt } from './helpers.js';
import { env } from '../src/config/env.js';
import { seedDatabase } from '../src/seed.js';
import { tenantRepository } from '../src/repositories/tenantRepository.js';
import { userRepository } from '../src/repositories/userRepository.js';
import { tenantService } from '../src/services/tenantService.js';

describe('US-01, US-02, US-06, US-07: autenticación, JWT y RBAC', () => {
  it('registra una organización y emite JWT con tenantId y rol', async () => {
    const tenant = await createTenant();
    const session = await login(tenant.tenant.slug, tenant.admin.email);

    const payload = jwt.verify(session.token, env.jwtSecret);
    expect(payload.tenantId).toBe(tenant.tenant.id);
    expect(payload.role).toBe('Administrador');
    expect(session.user.tenant.slug).toBe(tenant.tenant.slug);
  });

  it('rechaza tenants duplicados por slug', async () => {
    const tenant = await createTenant({ slug: 'unico-demo' });
    const duplicate = await api.post('/api/tenants').send({
      name: 'Otro nombre',
      slug: tenant.tenant.slug,
      adminFirstName: 'Otro',
      adminLastName: 'Admin',
      adminEmail: `otro@${tenant.tenant.domain}`,
      adminPassword: 'Admin1234'
    });
    expect(duplicate.status).toBe(409);
  });

  it('rechaza credenciales inválidas sin emitir token', async () => {
    const tenant = await createTenant();
    const response = await api
      .post('/api/auth/login')
      .send({ tenant: tenant.tenant.slug, email: tenant.admin.email, password: 'Incorrecta123' });
    expect(response.status).toBe(401);
    expect(response.body.data).toBeNull();
  });

  it('bloquea escalada de privilegios de un Cliente', async () => {
    const tenant = await createTenant();
    const registered = await api.post('/api/auth/register-client').send({
      tenant: tenant.tenant.slug,
      firstName: 'Cliente',
      lastName: 'Seguro',
      document: uniqueDni(),
      email: emailAt(tenant, `seguro${Date.now()}`),
      password: 'Cliente1234'
    });
    expect(registered.status).toBe(201);

    const session = await login(tenant.tenant.slug, registered.body.data.client.email, 'Cliente1234');
    const attempt = await api.post('/api/services').set(auth(session.token)).send({
      name: 'Servicio prohibido',
      durationMinutes: 30,
      price: 10
    });
    expect(attempt.status).toBe(403);
  });

  it('invalida el token después del cierre de sesión', async () => {
    const tenant = await createTenant();
    const session = await login(tenant.tenant.slug, tenant.admin.email);

    const logout = await api.post('/api/auth/logout').set(auth(session.token));
    expect(logout.status).toBe(200);

    const reuse = await api.get('/api/auth/me').set(auth(session.token));
    expect(reuse.status).toBe(401);
  });

  it('edita y desactiva usuarios con PATCH/DELETE parciales y bloquea el acceso entre tenants', async () => {
    const tenant = await createTenant();
    const admin = await login(tenant.tenant.slug, tenant.admin.email);
    const email = emailAt(tenant, `staff${Date.now()}`);
    const staff = await api.post('/api/users').set(auth(admin.token)).send({
      email,
      password: 'Staff1234',
      role: 'Recepcionista',
      firstName: 'Ana',
      lastName: 'Recepción'
    });
    expect(staff.status).toBe(201);
    const userId = staff.body.data.id;

    const staffSession = await login(tenant.tenant.slug, email, 'Staff1234');
    const patched = await api.patch(`/api/users/${userId}`).set(auth(admin.token)).send({ active: false });
    expect(patched.status).toBe(200);
    expect(patched.body.data.active).toBe(false);

    const inactiveToken = await api.get('/api/auth/me').set(auth(staffSession.token));
    expect(inactiveToken.status).toBe(401);

    const otherTenant = await createTenant();
    const otherAdmin = await login(otherTenant.tenant.slug, otherTenant.admin.email);
    const crossUpdate = await api.patch(`/api/users/${userId}`).set(auth(otherAdmin.token)).send({ active: true });
    expect(crossUpdate.status).toBe(403);
    const crossDelete = await api.delete(`/api/users/${userId}`).set(auth(otherAdmin.token));
    expect(crossDelete.status).toBe(403);

    const missing = await api.patch('/api/users/64b7f9c2e4b0a53f1c9d1234').set(auth(admin.token)).send({ active: true });
    expect(missing.status).toBe(404);

    const removed = await api.delete(`/api/users/${userId}`).set(auth(admin.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.active).toBe(false);
  });

  it('bloquea tenant.read en el servicio y conserva el filtro por tenantId', async () => {
    const tenant = await createTenant();
    const otherTenant = await createTenant();
    const admin = await login(tenant.tenant.slug, tenant.admin.email);
    const email = emailAt(tenant, `recepcion${Date.now()}`);
    const staff = await api.post('/api/users').set(auth(admin.token)).send({
      email,
      password: 'Staff1234',
      role: 'Recepcionista',
      firstName: 'Rebeca',
      lastName: 'Recepción'
    });
    expect(staff.status).toBe(201);

    const staffSession = await login(tenant.tenant.slug, email, 'Staff1234');
    const deniedList = await api.get('/api/tenants').set(auth(staffSession.token));
    const deniedById = await api.get(`/api/tenants/${tenant.tenant.id}`).set(auth(staffSession.token));
    expect(deniedList.status).toBe(403);
    expect(deniedById.status).toBe(403);

    const nonAdmin = { role: 'Recepcionista' };
    await expect(tenantService.list(tenant.tenant.id, nonAdmin)).rejects.toMatchObject({ statusCode: 403 });
    await expect(tenantService.getById(tenant.tenant.id, tenant.tenant.id, nonAdmin)).rejects.toMatchObject({ statusCode: 403 });

    const allowedList = await api.get('/api/tenants').set(auth(admin.token));
    expect(allowedList.status).toBe(200);
    expect(allowedList.body.data).toHaveLength(1);
    expect(allowedList.body.data[0].id).toBe(tenant.tenant.id);

    const crossTenant = await api.get(`/api/tenants/${otherTenant.tenant.id}`).set(auth(admin.token));
    expect(crossTenant.status).toBe(403);
  });

  it('acepta identificadores en cualquier caso y espacios copiados en las credenciales', async () => {
    const identifier = `AUR-${Date.now()}`;
    const tenant = await createTenant({ identifier });
    const response = await api.post('/api/auth/login').send({
      tenant: identifier.toLowerCase(),
      email: ` ${tenant.admin.email} `,
      password: ' Admin1234 '
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.tenant.id).toBe(tenant.tenant.id);
  });

  it('repara las credenciales del seed aunque el tenant ya exista con otra contraseña', async () => {
    await seedDatabase({ logCredentials: false });

    const tenant = await tenantRepository.findBySlug('auraria');
    const admin = await userRepository.findByTenantAndEmail(tenant._id, 'admin@auraria.com', { withPassword: true });
    await userRepository.changePassword(admin._id, tenant._id, await bcrypt.hash('Otra1234', 10));

    await seedDatabase({ logCredentials: false });
    const session = await login('auraria', 'admin@auraria.com', 'Admin1234');
    const clientSession = await login('auraria', 'cliente@auraria.com', 'Cliente1234');
    const professionalSession = await login('auraria', 'profesional@auraria.com', 'Profesional1234');

    expect(session.user.role).toBe('Administrador');
    expect(clientSession.user.role).toBe('Cliente');
    expect(professionalSession.user.role).toBe('Profesional');
  });
});
