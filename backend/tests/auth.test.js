import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, createTenant, login, auth, uniqueDni, emailAt } from './helpers.js';
import { env } from '../src/config/env.js';

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
});
