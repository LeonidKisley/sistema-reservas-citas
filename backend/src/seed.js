import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { tenantRepository } from './repositories/tenantRepository.js';
import { tenantService } from './services/tenantService.js';
import { serviceService } from './services/serviceService.js';
import { serviceRepository } from './repositories/serviceRepository.js';
import { professionalService } from './services/professionalService.js';
import { professionalRepository } from './repositories/professionalRepository.js';
import { clientRepository } from './repositories/clientRepository.js';
import { userService } from './services/userService.js';
import { userRepository } from './repositories/userRepository.js';
import { clientService } from './services/clientService.js';
import { appointmentRepository } from './repositories/appointmentRepository.js';
import { ROLES } from './utils/permissions.js';

const slugify = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 42);

const tenantName = process.env.SEED_TENANT_NAME || 'Auraria';
const slug = process.env.SEED_TENANT_SLUG || slugify(tenantName) || 'auraria';
const domain = `${slug}.com`;
const contactEmail = `contacto@${domain}`;
const adminEmail = process.env.SEED_ADMIN_EMAIL || `admin@${domain}`;
const legacySlug = 'demo';
const toDomainEmail = (email) => String(email).replace('@demo.local', `@${domain}`);
const adminActor = { id: 'seed', role: ROLES.ADMIN };
const clientPassword = 'Cliente1234';
const professionalPassword = 'Profesional1234';

const SERVICE_CATALOG = [
  { name: 'Corte de cabello', description: 'Corte personalizado según tipo de rostro y cabello', durationMinutes: 45, price: 35 },
  { name: 'Coloración', description: 'Tinte y cobertura de canas', durationMinutes: 120, price: 85 },
  { name: 'Mechas y reflejos', description: 'Mechas, balayage y reflejos', durationMinutes: 120, price: 95 },
  { name: 'Tratamientos capilares', description: 'Hidratación, keratina y reparación', durationMinutes: 60, price: 55 },
  { name: 'Manicura', description: 'Manicura clásica y cuidado de cutículas', durationMinutes: 45, price: 30 },
  { name: 'Pedicura', description: 'Pedicura completa con hidratación', durationMinutes: 50, price: 35 },
  { name: 'Uñas y diseño', description: 'Gel, acrílico y nail art', durationMinutes: 60, price: 45 },
  { name: 'Maquillaje profesional', description: 'Maquillaje para eventos y sesiones', durationMinutes: 60, price: 60 },
  { name: 'Tratamientos faciales', description: 'Limpieza, hidratación y rejuvenecimiento', durationMinutes: 60, price: 65 },
  { name: 'Masajes y relax', description: 'Masaje corporal y terapéutico', durationMinutes: 60, price: 70 },
  { name: 'Depilación', description: 'Depilación con cera', durationMinutes: 30, price: 25 },
  { name: 'Microblading', description: 'Diseño de cejas pelo a pelo', durationMinutes: 90, price: 110 },
  { name: 'Spa y bienestar', description: 'Rituales de spa y bienestar', durationMinutes: 90, price: 95 },
  { name: 'Estilismo y peinado', description: 'Peinado para eventos', durationMinutes: 45, price: 40 }
];

const STAFF_PROFILES = [
  ['Carlos', 'Profesional', 'profesional@demo.local', 'Corte y color', ['Corte de cabello', 'Tratamientos capilares', 'Estilismo y peinado']],
  ['Lucía', 'Fernández', 'lucia.fernandez@demo.local', 'Corte y color', ['Corte de cabello', 'Coloración', 'Mechas y reflejos', 'Estilismo y peinado']],
  ['Marta', 'Gómez', 'marta.gomez@demo.local', 'Manicura y pedicura', ['Manicura', 'Pedicura', 'Uñas y diseño']],
  ['Sofía', 'Ramírez', 'sofia.ramirez@demo.local', 'Maquillaje profesional', ['Maquillaje profesional', 'Tratamientos faciales', 'Microblading']],
  ['Elena', 'Torres', 'elena.torres@demo.local', 'Tratamientos faciales', ['Tratamientos faciales', 'Spa y bienestar']],
  ['Carolina', 'Díaz', 'carolina.diaz@demo.local', 'Masajes y relax', ['Masajes y relax', 'Spa y bienestar']],
  ['Paula', 'Navarro', 'paula.navarro@demo.local', 'Depilación', ['Depilación', 'Tratamientos faciales']],
  ['Andrea', 'Molina', 'andrea.molina@demo.local', 'Estilismo', ['Estilismo y peinado', 'Corte de cabello']],
  ['Natalia', 'Rivas', 'natalia.rivas@demo.local', 'Uñas y diseño', ['Uñas y diseño', 'Manicura', 'Pedicura']],
  ['Gabriela', 'Serrano', 'gabriela.serrano@demo.local', 'Spa y bienestar', ['Spa y bienestar', 'Masajes y relax', 'Tratamientos faciales']],
  ['Valeria', 'Cuesta', 'valeria.cuesta@demo.local', 'Microblading', ['Microblading', 'Maquillaje profesional']],
  ['Jimena', 'López', 'jimena.lopez@demo.local', 'Coloración', ['Coloración', 'Mechas y reflejos', 'Tratamientos capilares']],
  ['Rocío', 'Pérez', 'rocio.perez@demo.local', 'Tratamientos capilares', ['Tratamientos capilares', 'Corte de cabello', 'Estilismo y peinado']]
];

const CLIENT_PROFILES = [
  ['María', 'Cliente', 'cliente@demo.local', '80000001'],
  ['Laura', 'Martínez', 'laura.martinez@demo.local', '80000002'],
  ['Carmen', 'Ruiz', 'carmen.ruiz@demo.local', '80000003'],
  ['Diego', 'Sanz', 'diego.sanz@demo.local', '80000004'],
  ['Nuria', 'Vidal', 'nuria.vidal@demo.local', '80000005'],
  ['Javier', 'Ortega', 'javier.ortega@demo.local', '80000006']
];

const workHours = [
  { dayOfWeek: 1, start: '09:00', end: '18:00' },
  { dayOfWeek: 2, start: '09:00', end: '18:00' },
  { dayOfWeek: 3, start: '09:00', end: '18:00' },
  { dayOfWeek: 4, start: '09:00', end: '18:00' },
  { dayOfWeek: 5, start: '09:00', end: '18:00' },
  { dayOfWeek: 6, start: '09:00', end: '13:00' }
];

async function backfillPublicIds(tenantId) {
  const repos = [userRepository, clientRepository, professionalRepository, serviceRepository, appointmentRepository];
  for (const repo of repos) {
    const docs = await repo.find({ publicId: { $exists: false } }, tenantId, { select: '_id', lean: true });
    for (const doc of docs) {
      await repo.findByIdAndUpdate(doc._id, { $set: { publicId: randomUUID() } }, tenantId);
    }
  }
}

async function migrateEmailDomains(tenantId) {
  const legacyEmails = [
    'admin@demo.local',
    ...STAFF_PROFILES.map(([, , email]) => email),
    ...CLIENT_PROFILES.map(([, , email]) => email)
  ];

  for (const legacy of legacyEmails) {
    const next = toDomainEmail(legacy);
    const user = await userRepository.findByTenantAndEmail(tenantId, legacy);
    if (user) await userRepository.findByIdAndUpdate(user._id, { $set: { email: next } }, tenantId);

    const professional = await professionalRepository.findOne({ email: legacy }, tenantId);
    if (professional) await professionalRepository.findByIdAndUpdate(professional._id, { $set: { email: next } }, tenantId);

    const client = await clientRepository.findOne({ email: legacy }, tenantId);
    if (client) await clientRepository.findByIdAndUpdate(client._id, { $set: { email: next } }, tenantId);
  }
}

async function seed() {
  await connectDatabase();

  let tenant = await tenantRepository.findBySlug(slug);
  let migrated = false;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin1234';

  if (!tenant && slug !== legacySlug) {
    const legacy = await tenantRepository.findBySlug(legacySlug);
    if (legacy) {
      const legacyTenantId = legacy._id.toString();
      await tenantRepository.findByIdAndUpdate(legacy._id, {
        $set: { name: tenantName, slug, domain, identifier: 'AUR-001', contactEmail }
      }, legacyTenantId);
      await migrateEmailDomains(legacyTenantId);
      tenant = await tenantRepository.findById(legacy._id);
      migrated = true;
    }
  }

  if (!tenant) {
    const created = await tenantService.register({
      name: tenantName,
      slug,
      identifier: 'AUR-001',
      contactEmail,
      adminFirstName: 'Ana',
      adminLastName: 'Administradora',
      adminEmail,
      adminPassword
    });
    tenant = await tenantRepository.findById(created.tenant.id);
    console.log('✅ Tenant y administrador creados');
  } else if (migrated) {
    console.log(`✅ Tenant migrado a ${tenantName} · ${domain}`);
  } else {
    console.log(`ℹ️  El tenant ${slug} ya existe; se omitió la creación del administrador`);
  }

  const tenantId = tenant._id.toString();
  if (!tenant.publicId) {
    await tenantRepository.findByIdAndUpdate(tenant._id, { $set: { publicId: randomUUID() } }, tenantId);
  }
  await backfillPublicIds(tenantId);

  const platformEmail = (process.env.PLATFORM_ADMIN_EMAIL || `plataforma@${domain}`).toLowerCase().trim();
  const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'Platform1234';
  if (!await userRepository.findByTenantAndEmail(tenantId, platformEmail)) {
    await userRepository.create(
      {
        email: platformEmail,
        password: await bcrypt.hash(platformPassword, 10),
        role: ROLES.ADMIN,
        platformAdmin: true
      },
      tenantId
    );
    console.log('✅ Administrador de plataforma creado');
  }

  for (const service of SERVICE_CATALOG) {
    await serviceService.create(tenantId, service, adminActor).catch(() => null);
  }
  const serviceDocs = await serviceRepository.findAll(tenantId);
  const serviceIdsByName = new Map(serviceDocs.map((service) => [service.name, service._id.toString()]));
  const idsFor = (names) => names.map((name) => serviceIdsByName.get(name)).filter(Boolean);

  const accounts = [];
  for (const [position, [firstName, lastName, legacyEmail, specialty, serviceNames]] of STAFF_PROFILES.entries()) {
    const email = toDomainEmail(legacyEmail);
    const index = position + 1;
    const phone = `+519${String(index).padStart(8, '0')}`;
    const services = idsFor(serviceNames);
    const existingUser = await userRepository.findByTenantAndEmail(tenantId, email);

    if (existingUser?.professionalId) {
      await professionalRepository.findByIdAndUpdate(
        existingUser.professionalId,
        { $set: { email, phone, specialty, services } },
        tenantId
      ).catch(() => null);
      accounts.push(email);
      continue;
    }

    try {
      await userService.createStaff(
        tenantId,
        {
          firstName,
          lastName,
          email,
          specialty,
          document: `9000${String(index).padStart(4, '0')}`,
          phone,
          password: professionalPassword,
          role: ROLES.PROFESSIONAL,
          workHours,
          services
        },
        adminActor
      );
      accounts.push(email);
    } catch (error) {
      console.warn(`⚠️  No se pudo crear ${email}: ${error.message}`);
    }
  }

  for (const [index, [firstName, lastName, legacyEmail, document]] of CLIENT_PROFILES.entries()) {
    const email = toDomainEmail(legacyEmail);
    await clientService.createForTenant(
      tenantId,
      {
        firstName,
        lastName,
        document,
        email,
        phone: `+519${String(index + 1).padStart(8, '0')}`,
        password: clientPassword
      },
      { withAccount: true, password: clientPassword }
    ).catch(() => null);
  }

  console.log('\n📋 Datos de acceso de prueba');
  console.log(`Salón: ${tenantName} · Dominio: ${domain} · Identificador: ${slug}`);
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`Plataforma: ${platformEmail} / ${platformPassword}`);
  console.log(`Cliente: ${toDomainEmail('cliente@demo.local')} / ${clientPassword}`);
  console.log(`Profesionales con cuenta: ${accounts.length} (${professionalPassword})`);
  accounts.forEach((email) => console.log(`  - ${email}`));
  console.log(`Servicios (${serviceDocs.length}): ${serviceDocs.map((service) => service.name).join(', ')}`);
  console.log(`Clientes de prueba: ${CLIENT_PROFILES.length}`);

  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error('[SEED ERROR]', error.message);
  await disconnectDatabase();
  process.exit(1);
});
