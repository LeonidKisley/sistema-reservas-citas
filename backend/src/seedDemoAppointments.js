import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDatabase, disconnectDatabase, isUsingMemoryDatabase } from './config/database.js';
import { seedDatabase } from './seed.js';
import { tenantRepository } from './repositories/tenantRepository.js';
import { userRepository } from './repositories/userRepository.js';
import { clientRepository } from './repositories/clientRepository.js';
import { professionalRepository } from './repositories/professionalRepository.js';
import { serviceRepository } from './repositories/serviceRepository.js';
import { appointmentRepository } from './repositories/appointmentRepository.js';
import { appointmentService } from './services/appointmentService.js';
import { ROLES } from './utils/permissions.js';
import { rangesOverlap, timeToMinutes } from './utils/dates.js';

dayjs.extend(utc);

const slug = process.env.SEED_TENANT_SLUG || 'auraria';
const adminEmail = (process.env.SEED_ADMIN_EMAIL || `admin@${slug}.com`).toLowerCase().trim();
const currentMonth = dayjs.utc().format('YYYY-MM');

const BASE_APPOINTMENTS = [
  { client: 'cliente@demo.local', professional: 'lucia.fernandez@demo.local', service: 'Corte de cabello', status: 'confirmada' },
  { client: 'laura.martinez@demo.local', professional: 'marta.gomez@demo.local', service: 'Manicura', status: 'completada' },
  { client: 'carmen.ruiz@demo.local', professional: 'sofia.ramirez@demo.local', service: 'Maquillaje profesional', status: 'programada' },
  { client: 'diego.sanz@demo.local', professional: 'carolina.diaz@demo.local', service: 'Masajes y relax', status: 'completada' },
  { client: 'nuria.vidal@demo.local', professional: 'jimena.lopez@demo.local', service: 'Coloración', status: 'confirmada' },
  { client: 'javier.ortega@demo.local', professional: 'elena.torres@demo.local', service: 'Spa y bienestar', status: 'programada' },
  { client: 'cliente@demo.local', professional: 'natalia.rivas@demo.local', service: 'Uñas y diseño', status: 'completada' },
  { client: 'laura.martinez@demo.local', professional: 'andrea.molina@demo.local', service: 'Estilismo y peinado', status: 'cancelada' },
  { client: 'carmen.ruiz@demo.local', professional: 'gabriela.serrano@demo.local', service: 'Tratamientos faciales', status: 'confirmada' },
  { client: 'diego.sanz@demo.local', professional: 'rocio.perez@demo.local', service: 'Tratamientos capilares', status: 'programada' }
];

const CAMPAIGNS = [
  { month: currentMonth, theme: '', historical: false, count: 10, statuses: null },
  { month: '2026-10', theme: 'Cita culminada', historical: true, count: 6, statuses: ['completada', 'completada', 'completada', 'completada', 'completada', 'completada'] },
  { month: '2026-12', theme: 'Promo Navidad', historical: false, count: 10, statuses: ['programada', 'confirmada', 'programada', 'confirmada', 'cancelada', 'programada', 'confirmada', 'programada', 'confirmada', 'programada'] },
  { month: '2027-01', theme: 'Promo Año Nuevo/Rebajas', historical: false, count: 12, statuses: ['programada', 'programada', 'confirmada', 'programada', 'confirmada', 'programada', 'cancelada', 'programada', 'confirmada', 'programada', 'programada', 'confirmada'] }
];

export const DAILY_RANGE = { from: '2026-08-01', to: '2027-01-31' };
const DAILY_BATCH_SIZE = 100;
const SUNDAY_WORK_HOUR = { dayOfWeek: 0, start: '10:00', end: '14:00' };

const STATUS_CHAIN = {
  programada: [],
  confirmada: ['confirmada'],
  completada: ['confirmada', 'completada'],
  cancelada: ['cancelada']
};

function monthBounds(monthValue) {
  const [year, month] = String(monthValue).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) throw new Error(`Mes inválido: ${monthValue}`);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    endExclusive: new Date(Date.UTC(year, month, 1))
  };
}

function buildDates(monthValue) {
  const { start, endExclusive } = monthBounds(monthValue);
  const last = dayjs.utc(endExclusive).subtract(1, 'day').startOf('day');
  const dates = [];
  for (let cursor = dayjs.utc(start); !cursor.isAfter(last); cursor = cursor.add(1, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'));
  }
  return dates;
}

function dayOfWeek(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay();
}

function timesFor(dateKey) {
  const weekday = dayOfWeek(dateKey);
  if (weekday === 0) return ['10:00', '12:00'];
  if (weekday === 6) return ['09:00', '11:00'];
  return ['09:00', '11:00', '14:00', '16:00'];
}

function buildDateKeys(fromKey, toKey) {
  const dates = [];
  const last = dayjs.utc(toKey);
  for (let cursor = dayjs.utc(fromKey); !cursor.isAfter(last); cursor = cursor.add(1, 'day')) {
    dates.push(cursor.format('YYYY-MM-DD'));
  }
  return dates;
}

export function dailyCountFor(dateKey) {
  let count = 2;
  const month = dateKey.slice(0, 7);
  if (month === '2026-12' || month === '2027-01') count += 2;
  if (dayOfWeek(dateKey) === 0) count += 1;
  if (Number(dateKey.slice(8, 10)) % 5 === 0) count += 1;
  return Math.min(6, count);
}

export function dailyPublicId(dateKey, index) {
  return `demo-daily-${dateKey}-${String(index + 1).padStart(2, '0')}`;
}

export function dailyNotes(dateKey, publicId, serviceName) {
  const promo = dateKey.startsWith('2026-12')
    ? 'Promo Navidad'
    : dateKey.startsWith('2027-01')
      ? 'Promo Año Nuevo/Rebajas'
      : '';
  return `[DEMO ${dateKey}] ${promo ? `${promo} · ` : ''}${serviceName} · ${publicId}`;
}

export function dailyStatus(startAt, globalIndex, now = dayjs.utc()) {
  if (dayjs.utc(startAt).isBefore(now)) return 'completada';
  return (globalIndex + 1) % 3 === 0 ? 'confirmada' : 'programada';
}

export function buildDailyPlan() {
  const dates = buildDateKeys(DAILY_RANGE.from, DAILY_RANGE.to);
  const plan = [];
  let globalIndex = 0;

  dates.forEach((dateKey, dayIndex) => {
    const count = dailyCountFor(dateKey);
    for (let index = 0; index < count; index += 1) {
      const spec = BASE_APPOINTMENTS[(dayIndex + index) % BASE_APPOINTMENTS.length];
      const publicId = dailyPublicId(dateKey, index);
      plan.push({
        dateKey,
        dayIndex,
        slotIndex: index,
        globalIndex,
        publicId,
        spec,
        notes: dailyNotes(dateKey, publicId, spec.service)
      });
      globalIndex += 1;
    }
  });

  return plan;
}

function canUseSlot(professional, dateKey, time, durationMinutes) {
  const workHour = (professional.workHours || []).find((entry) => entry.dayOfWeek === dayOfWeek(dateKey));
  if (!workHour) return false;
  const start = timeToMinutes(time);
  const workStart = timeToMinutes(workHour.start);
  const workEnd = timeToMinutes(workHour.end);
  if (start === null || workStart === null || workEnd === null) return false;
  return start >= workStart && start + durationMinutes <= workEnd;
}

function specsFor(campaign) {
  const statuses = campaign.statuses || BASE_APPOINTMENTS.map((item) => item.status);
  return Array.from({ length: campaign.count }, (_, index) => {
    const base = BASE_APPOINTMENTS[index % BASE_APPOINTMENTS.length];
    return { ...base, status: statuses[index % statuses.length] };
  });
}

function findSlot(index, dates, service, professional, busy) {
  const offset = index % dates.length;
  const rotated = [...dates.slice(offset), ...dates.slice(0, offset)];

  for (const dateKey of rotated) {
    for (const time of timesFor(dateKey)) {
      if (!canUseSlot(professional, dateKey, time, service.durationMinutes)) continue;
      const startMinutes = timeToMinutes(time);
      const endMinutes = startMinutes + service.durationMinutes;
      const key = `${professional._id.toString()}|${dateKey}`;
      const occupied = busy.get(key) || [];
      if (occupied.some(([busyStart, busyEnd]) => rangesOverlap(startMinutes, endMinutes, busyStart, busyEnd))) continue;
      const startAt = new Date(`${dateKey}T${time}:00.000Z`);
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
      return { dateKey, time, startMinutes, endMinutes, startAt, endAt, key };
    }
  }
  return null;
}

async function ensureStatus(appointmentId, currentStatus, targetStatus, tenantId, actor) {
  let status = currentStatus;
  for (const next of STATUS_CHAIN[targetStatus] || []) {
    if (status === next) continue;
    const payload = next === 'cancelada'
      ? { status: next, reason: 'Cita demo cancelada para variar el dashboard' }
      : { status: next };
    try {
      const updated = await appointmentService.updateStatus(appointmentId, tenantId, payload, actor);
      status = updated.status;
    } catch (error) {
      if (error?.statusCode === 409 || /Transición no permitida/.test(error?.message || '')) break;
      throw error;
    }
  }
  return status;
}

function registerBusy(busy, appointment) {
  if (['cancelada', 'no asistió'].includes(appointment.status)) return;
  const dateKey = dayjs.utc(appointment.start).format('YYYY-MM-DD');
  const key = `${appointment.professionalId.toString()}|${dateKey}`;
  const start = dayjs.utc(appointment.start).hour() * 60 + dayjs.utc(appointment.start).minute();
  const end = dayjs.utc(appointment.end).hour() * 60 + dayjs.utc(appointment.end).minute();
  busy.set(key, [...(busy.get(key) || []), [start, end]]);
}

async function backfillSundayWorkHours(tenantId, professionals) {
  for (const professional of professionals) {
    if ((professional.workHours || []).some((entry) => entry.dayOfWeek === SUNDAY_WORK_HOUR.dayOfWeek)) continue;
    professional.workHours = [...(professional.workHours || []), { ...SUNDAY_WORK_HOUR }];
    await professionalRepository.findByIdAndUpdate(
      professional._id,
      { $addToSet: { workHours: { ...SUNDAY_WORK_HOUR } } },
      tenantId
    );
  }
}

function eligibleProfessionalsFor(service, spec, context) {
  const serviceId = service._id.toString();
  const eligible = context.professionals.filter((professional) => (
    (professional.services || []).some((id) => id.toString() === serviceId)
  ));
  if (!eligible.length) return [];

  const preferredEmail = String(spec.professional).replace('@demo.local', `@${context.domain}`);
  const preferred = context.professionalByEmail.get(preferredEmail);
  const preferredIndex = preferred
    ? eligible.findIndex((professional) => professional._id.toString() === preferred._id.toString())
    : -1;
  const start = preferredIndex >= 0 ? preferredIndex : 0;
  return [...eligible.slice(start), ...eligible.slice(0, start)];
}

function findDailySlot(item, context, busy, usedBySlot) {
  const { dateKey, service, spec } = item;
  const candidates = eligibleProfessionalsFor(service, spec, context);
  if (!candidates.length) return null;

  const times = timesFor(dateKey);
  const firstTime = item.slotIndex % times.length;
  const round = Math.floor(item.slotIndex / times.length);
  const startMinutesFor = (time) => timeToMinutes(time);

  for (let timeOffset = 0; timeOffset < times.length; timeOffset += 1) {
    const time = times[(firstTime + timeOffset) % times.length];
    const usedKey = `${dateKey}|${time}`;
    const used = usedBySlot.get(usedKey) || new Set();
    const roundForTime = round + timeOffset;
    const startMinutes = startMinutesFor(time);
    const endMinutes = startMinutes + service.durationMinutes;

    for (let attempt = 0; attempt < candidates.length; attempt += 1) {
      const professional = candidates[(item.dayIndex + roundForTime + attempt) % candidates.length];
      const professionalId = professional._id.toString();
      if (used.has(professionalId)) continue;
      if (!canUseSlot(professional, dateKey, time, service.durationMinutes)) continue;

      const key = `${professionalId}|${dateKey}`;
      const occupied = busy.get(key) || [];
      if (occupied.some(([busyStart, busyEnd]) => rangesOverlap(startMinutes, endMinutes, busyStart, busyEnd))) continue;

      const startAt = new Date(`${dateKey}T${time}:00.000Z`);
      const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);
      return { time, professional, professionalId, usedKey, key, startAt, endAt, startMinutes, endMinutes };
    }
  }

  return null;
}

async function seedDailyAppointments(context, now = dayjs.utc()) {
  const { tenantId } = context;
  await backfillSundayWorkHours(tenantId, context.professionals);

  const plan = buildDailyPlan().map((item) => ({
    ...item,
    service: context.serviceByName.get(item.spec.service)
  }));
  const publicIds = plan.map((item) => item.publicId);
  const rangeStart = new Date(`${DAILY_RANGE.from}T00:00:00.000Z`);
  const rangeEnd = dayjs.utc(DAILY_RANGE.to).add(1, 'day').toDate();

  const [existing, inRange] = await Promise.all([
    appointmentRepository.find(
      { publicId: { $in: publicIds } },
      tenantId,
      { select: 'publicId', lean: true }
    ),
    appointmentRepository.find(
      { start: { $lt: rangeEnd }, end: { $gt: rangeStart } },
      tenantId,
      { select: 'publicId status professionalId start end', lean: true }
    )
  ]);

  const existingIds = new Set(existing.map((appointment) => appointment.publicId));
  const busy = new Map();
  inRange.forEach((appointment) => registerBusy(busy, appointment));
  const usedBySlot = new Map();
  const documents = [];
  let reusedCount = 0;

  console.log(`\n→ ${DAILY_RANGE.from} … ${DAILY_RANGE.to} · citas diarias`);

  for (const item of plan) {
    if (!item.service) {
      throw new Error(`Falta el servicio demo "${item.spec.service}". Ejecuta "npm run seed".`);
    }
    if (existingIds.has(item.publicId)) {
      reusedCount += 1;
      continue;
    }

    const clientEmail = String(item.spec.client).replace('@demo.local', `@${context.domain}`);
    const client = context.clientByEmail.get(clientEmail);
    if (!client) throw new Error(`Falta el cliente demo ${clientEmail}. Ejecuta "npm run seed".`);

    const slot = findDailySlot(item, context, busy, usedBySlot);
    if (!slot) {
      throw new Error(`No hay profesional libre para ${item.publicId} en ${item.dateKey}.`);
    }

    const status = dailyStatus(slot.startAt, item.globalIndex, now);
    documents.push({
      publicId: item.publicId,
      clientId: client._id,
      professionalId: slot.professional._id,
      serviceId: item.service._id,
      start: slot.startAt,
      end: slot.endAt,
      status,
      notes: item.notes,
      createdBy: context.adminId,
      updatedBy: context.adminId
    });
    registerBusy(busy, {
      professionalId: slot.professional._id,
      start: slot.startAt,
      end: slot.endAt,
      status
    });
    usedBySlot.set(slot.usedKey, new Set([...(usedBySlot.get(slot.usedKey) || []), slot.professionalId]));
  }

  for (let offset = 0; offset < documents.length; offset += DAILY_BATCH_SIZE) {
    await appointmentRepository.insertMany(documents.slice(offset, offset + DAILY_BATCH_SIZE), tenantId);
  }

  console.log(`  ✓ ${documents.length} creadas, ${reusedCount} reutilizadas en ${buildDateKeys(DAILY_RANGE.from, DAILY_RANGE.to).length} días`);
  return { createdCount: documents.length, reusedCount, adjustedCount: 0 };
}

function notesFor(campaign, spec, publicId) {
  const theme = campaign.theme ? `${campaign.theme} · ` : '';
  return `[DEMO ${campaign.month}] ${theme}${spec.service} · ${publicId}`;
}

function effectiveStatus(campaign, spec, startAt) {
  if (campaign.historical || String(spec.status).toLowerCase() !== 'completada') return spec.status;
  return dayjs.utc(startAt).isBefore(dayjs.utc()) ? 'completada' : 'programada';
}

async function seedCampaign(campaign, context) {
  const { tenantId, actor, adminId, clientByEmail, professionalByEmail, serviceByName } = context;
  const specs = specsFor(campaign);
  const publicIds = specs.map((_, index) => `demo-${campaign.month}-${String(index + 1).padStart(2, '0')}`);
  const bounds = monthBounds(campaign.month);

  const [byPublicId, byRange] = await Promise.all([
    appointmentRepository.find(
      { publicId: { $in: publicIds } },
      tenantId,
      { select: 'publicId status professionalId start end notes', lean: true }
    ),
    appointmentRepository.find(
      { start: { $lt: bounds.endExclusive }, end: { $gt: bounds.start } },
      tenantId,
      { select: 'publicId status professionalId start end notes', lean: true }
    )
  ]);

  const known = new Map();
  [...byPublicId, ...byRange].forEach((appointment) => known.set(appointment._id.toString(), appointment));
  const existingByPublicId = new Map(
    [...known.values()]
      .filter((appointment) => publicIds.includes(appointment.publicId))
      .map((appointment) => [appointment.publicId, appointment])
  );
  const busy = new Map();
  known.forEach((appointment) => registerBusy(busy, appointment));
  const dates = buildDates(campaign.month);

  let createdCount = 0;
  let reusedCount = 0;
  let adjustedCount = 0;
  console.log(`\n→ ${campaign.month}${campaign.theme ? ` · ${campaign.theme}` : ''}`);

  for (const [index, spec] of specs.entries()) {
    const publicId = publicIds[index];
    const client = clientByEmail.get(String(spec.client).replace('@demo.local', `@${context.domain}`));
    const professional = professionalByEmail.get(String(spec.professional).replace('@demo.local', `@${context.domain}`));
    const service = serviceByName.get(spec.service);
    if (!client || !professional || !service) {
      throw new Error(`Falta datos demo: ${spec.client} / ${spec.professional} / ${spec.service}. Ejecuta "npm run seed".`);
    }

    const notes = notesFor(campaign, spec, publicId);
    const current = existingByPublicId.get(publicId);
    if (current) {
      reusedCount += 1;
      const targetStatus = effectiveStatus(campaign, spec, current.start);
      if (current.status !== targetStatus || current.notes !== notes) {
        await appointmentRepository.findByIdAndUpdate(
          current._id.toString(),
          { $set: { status: targetStatus, notes } },
          tenantId
        );
        adjustedCount += 1;
      }
      continue;
    }

    const slot = findSlot(index, dates, service, professional, busy);
    if (!slot) {
      throw new Error(`No hay horario disponible en ${campaign.month} para ${spec.service} con ${professional.firstName} ${professional.lastName}.`);
    }

    const targetStatus = effectiveStatus(campaign, spec, slot.startAt);
    if (!campaign.historical) {
      const created = await appointmentService.create(tenantId, {
        clientId: client._id.toString(),
        professionalId: professional._id.toString(),
        serviceId: service._id.toString(),
        date: slot.dateKey,
        time: slot.time,
        notes
      }, actor);
      await appointmentRepository.findByIdAndUpdate(created.id, { $set: { publicId } }, tenantId);
      const status = await ensureStatus(created.id, created.status, targetStatus, tenantId, actor);
      if (status !== created.status) adjustedCount += 1;
      console.log(`  ✓ ${publicId} · ${slot.dateKey} ${slot.time} · ${spec.service} · ${status}`);
      busy.set(slot.key, [...(busy.get(slot.key) || []), [slot.startMinutes, slot.endMinutes]]);
      createdCount += 1;
      continue;
    }

    await appointmentRepository.create({
      publicId,
      clientId: client._id,
      professionalId: professional._id,
      serviceId: service._id,
      start: slot.startAt,
      end: slot.endAt,
      status: targetStatus,
      notes,
      createdBy: adminId,
      updatedBy: adminId
    }, tenantId);
    console.log(`  ✓ ${publicId} · ${slot.dateKey} ${slot.time} · ${spec.service} · ${targetStatus}`);
    busy.set(slot.key, [...(busy.get(slot.key) || []), [slot.startMinutes, slot.endMinutes]]);
    createdCount += 1;
  }

  return { createdCount, reusedCount, adjustedCount };
}

export async function seedDemoAppointments() {
  let tenant = await tenantRepository.findBySlug(slug)
    || await tenantRepository.findByDomain(`${slug}.com`)
    || await tenantRepository.findByIdentifier('AUR-001');
  if (!tenant) {
    await seedDatabase({ logCredentials: false });
    tenant = await tenantRepository.findBySlug(slug)
      || await tenantRepository.findByDomain(`${slug}.com`)
      || await tenantRepository.findByIdentifier('AUR-001');
  }
  if (!tenant) throw new Error(`No se pudo crear el tenant "${slug}".`);

  const tenantId = tenant._id.toString();
  const domain = tenant.domain || `${slug}.com`;
  const admin = await userRepository.findByTenantAndEmail(tenantId, adminEmail);
  if (!admin) throw new Error(`No existe el administrador ${adminEmail} en el tenant "${slug}".`);

  const actor = { id: admin._id.toString(), role: ROLES.ADMIN };
  const [clients, professionals, services] = await Promise.all([
    clientRepository.search(tenantId, ''),
    professionalRepository.findAll(tenantId),
    serviceRepository.findAll(tenantId)
  ]);
  const context = {
    tenantId,
    actor,
    adminId: admin._id,
    domain,
    professionals,
    clientByEmail: new Map(clients.map((client) => [client.email?.toLowerCase(), client])),
    professionalByEmail: new Map(professionals.map((professional) => [professional.email?.toLowerCase(), professional])),
    serviceByName: new Map(services.map((service) => [service.name, service]))
  };

  const totals = { createdCount: 0, reusedCount: 0, adjustedCount: 0 };
  for (const campaign of CAMPAIGNS) {
    const result = await seedCampaign(campaign, context);
    totals.createdCount += result.createdCount;
    totals.reusedCount += result.reusedCount;
    totals.adjustedCount += result.adjustedCount;
  }

  const dailyResult = await seedDailyAppointments(context);
  totals.createdCount += dailyResult.createdCount;
  totals.reusedCount += dailyResult.reusedCount;
  totals.adjustedCount += dailyResult.adjustedCount;

  console.log(`\n✅ Citas demo: ${totals.createdCount} creadas, ${totals.reusedCount} reutilizadas, ${totals.adjustedCount} ajustadas.`);
  console.log(`   Tenant: ${tenant.name || slug} · Dashboard disponible para ${adminEmail}`);
  if (isUsingMemoryDatabase()) {
    console.warn('   ⚠️  Estás usando base de datos en memoria: las citas se perderán al reiniciar el backend.');
  }
}

async function runCli() {
  await connectDatabase();
  try {
    await seedDemoAppointments();
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli().catch((error) => {
    console.error(`❌ No se pudieron crear las citas demo: ${error.message}`);
    process.exitCode = 1;
  });
}
