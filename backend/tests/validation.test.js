import { describe, it, expect } from 'vitest';
import { api, createTenant, uniqueDni, emailAt } from './helpers.js';

function salonPayload(overrides = {}) {
  const slug = `validacion-${uniqueDni()}`;
  return {
    name: `Salón ${uniqueDni()}`,
    slug,
    adminFirstName: 'Ana',
    adminLastName: 'Administradora',
    adminEmail: `admin@${slug}.com`,
    adminPassword: 'Admin1234',
    ...overrides
  };
}

function clientPayload(tenant, overrides = {}) {
  return {
    tenant: tenant.tenant.slug,
    firstName: 'Cliente',
    lastName: 'Reservas',
    document: uniqueDni(),
    email: emailAt(tenant, `cliente${uniqueDni()}`),
    password: 'Cliente1234',
    ...overrides
  };
}

describe('Validaciones de registro: nombres, DNI, teléfono y dominio de correo', () => {
  it('rechaza nombres con números o símbolos al registrar un salón', async () => {
    const response = await api.post('/api/tenants').send(salonPayload({ adminFirstName: 'Ana 123' }));
    expect(response.status).toBe(400);
    expect(response.body.errors.adminFirstName).toBeDefined();

    const symbols = await api.post('/api/tenants').send(salonPayload({ adminLastName: 'Adm@inistradora' }));
    expect(symbols.status).toBe(400);
    expect(symbols.body.errors.adminLastName).toBeDefined();
  });

  it('obliga a que el correo de acceso use el dominio generado para el salón', async () => {
    const response = await api.post('/api/tenants').send(salonPayload({ adminEmail: 'admin@otro.com' }));
    expect(response.status).toBe(400);
    expect(response.body.errors.adminEmail).toContain('.com');
  });

  it('rechaza nombres con números o símbolos al registrar un cliente', async () => {
    const tenant = await createTenant();
    const numbers = await api.post('/api/auth/register-client').send(clientPayload(tenant, { firstName: 'Ana2' }));
    expect(numbers.status).toBe(400);
    expect(numbers.body.errors.firstName).toBeDefined();

    const symbols = await api.post('/api/auth/register-client').send(clientPayload(tenant, { lastName: 'De-La-Cruz' }));
    expect(symbols.status).toBe(400);
    expect(symbols.body.errors.lastName).toBeDefined();
  });

  it('exige un DNI de exactamente 8 dígitos', async () => {
    const tenant = await createTenant();
    for (const document of ['1234567', '123456789', 'ABC12345']) {
      const response = await api.post('/api/auth/register-client').send(clientPayload(tenant, { document }));
      expect(response.status).toBe(400);
      expect(response.body.errors.document).toBeDefined();
    }

    const valid = await api.post('/api/auth/register-client').send(clientPayload(tenant, { document: '12345678' }));
    expect(valid.status).toBe(201);
    expect(valid.body.data.client.document).toBe('12345678');
  });

  it('exige que el correo del cliente pertenezca al dominio del salón', async () => {
    const tenant = await createTenant();
    const response = await api.post('/api/auth/register-client').send(
      clientPayload(tenant, { email: 'cliente@gmail.com' })
    );
    expect(response.status).toBe(400);
    expect(response.body.errors.email).toContain(tenant.tenant.domain);
  });

  it('exige el prefijo +51 y 9 dígitos, y normaliza el teléfono almacenado', async () => {
    const tenant = await createTenant();
    for (const phone of ['+34 600 000 000', '+51987654', '+519876543210']) {
      const response = await api.post('/api/auth/register-client').send(clientPayload(tenant, { phone }));
      expect(response.status).toBe(400);
      expect(response.body.errors.phone).toBeDefined();
    }

    const valid = await api.post('/api/auth/register-client').send(clientPayload(tenant, { phone: '+51 987 654 321' }));
    expect(valid.status).toBe(201);
    expect(valid.body.data.client.phone).toBe('+51987654321');
  });
});
