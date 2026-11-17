import { connectDatabase, disconnectDatabase } from './config/database.js';
import { tenantRepository } from './repositories/tenantRepository.js';
import { tenantService } from './services/tenantService.js';
import { serviceService } from './services/serviceService.js';
import { professionalService } from './services/professionalService.js';
import { clientService } from './services/clientService.js';
import { ROLES } from './utils/permissions.js';

const slug = process.env.SEED_TENANT_SLUG || 'demo';
const adminActor = { id: 'seed', role: ROLES.ADMIN };

async function seed() {
  await connectDatabase();

  let tenant = await tenantRepository.findBySlug(slug);
  let adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin1234';

  if (!tenant) {
    const created = await tenantService.register({
      name: process.env.SEED_TENANT_NAME || 'Organización Demo',
      slug,
      identifier: 'DEMO-001',
      contactEmail: 'contacto@demo.local',
      adminFirstName: 'Ana',
      adminLastName: 'Administradora',
      adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@demo.local',
      adminPassword
    });
    tenant = await tenantRepository.findById(created.tenant.id);
    console.log('✅ Tenant y administrador creados');
  } else {
    console.log('ℹ️  El tenant ya existe; se omitió la creación del administrador');
  }

  const tenantId = tenant._id.toString();
  let services = await Promise.all(
    ['Consulta general', 'Control', 'Procedimiento especial'].map((name, index) =>
      serviceService.create(
        tenantId,
        { name, description: `Servicio ${name}`, durationMinutes: 30 + index * 15, price: 50 + index * 25 },
        adminActor
      ).catch(() => null)
    )
  );
  services = services.filter(Boolean);

  const workHours = [
    { dayOfWeek: 1, start: '09:00', end: '18:00' },
    { dayOfWeek: 2, start: '09:00', end: '18:00' },
    { dayOfWeek: 3, start: '09:00', end: '18:00' },
    { dayOfWeek: 4, start: '09:00', end: '18:00' },
    { dayOfWeek: 5, start: '09:00', end: '18:00' },
    { dayOfWeek: 6, start: '09:00', end: '13:00' }
  ];

  const professional = await professionalService.create(
    tenantId,
    {
      firstName: 'Carlos',
      lastName: 'Profesional',
      document: 'PROF-001',
      email: 'profesional@demo.local',
      specialty: 'Atención general',
      workHours,
      services: services.map((service) => service.id)
    },
    adminActor
  ).catch(() => null);

  const client = await clientService.createForTenant(
    tenantId,
    {
      firstName: 'María',
      lastName: 'Cliente',
      document: 'CLI-001',
      email: 'cliente@demo.local',
      phone: '600000000',
      password: 'Cliente1234'
    },
    { withAccount: true, password: 'Cliente1234' }
  ).catch(() => null);

  console.log('\n📋 Datos de acceso de prueba');
  console.log(`Tenant (slug): ${slug}`);
  console.log(`Admin: ${process.env.SEED_ADMIN_EMAIL || 'admin@demo.local'} / ${adminPassword}`);
  console.log(`Cliente: cliente@demo.local / Cliente1234`);
  console.log(`Profesional creado: ${professional ? professional.id : 'ya existía'}`);
  console.log(`Cliente creado: ${client ? client.id : 'ya existía'}`);
  console.log(`Servicios: ${services.map((service) => service.name).join(', ') || 'ya existían'}`);

  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error('[SEED ERROR]', error.message);
  await disconnectDatabase();
  process.exit(1);
});
