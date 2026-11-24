import { Types } from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import { assertPermission } from '../utils/permissions.js';
import { buildRange, isValidRange, toDateKey } from '../utils/dates.js';
import { APPOINTMENT_STATUSES, BLOCKING_STATUSES } from '../utils/states.js';
import { appointmentRepository } from '../repositories/appointmentRepository.js';

function resolveRange(query = {}) {
  let from = query.from;
  let to = query.to;

  if (!from && !to) {
    const today = new Date();
    to = toDateKey(today);
    from = toDateKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  }

  if (!isValidRange(from, to).valid) {
    throw ApiError.badRequest('Periodo inválido: usa fechas YYYY-MM-DD y una fecha inicial menor o igual a la final');
  }
  return buildRange(from, to);
}

const ID_FILTERS = ['professionalId', 'serviceId', 'clientId'];

function resolveFilters(query = {}) {
  const filters = {};
  for (const field of ID_FILTERS) {
    const value = query[field];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
      throw ApiError.badRequest(`Filtro ${field} inválido: se espera un identificador de MongoDB`, {
        [field]: 'Identificador inválido'
      });
    }
    filters[field] = value;
  }

  if (query.status !== undefined && query.status !== null && query.status !== '') {
    if (typeof query.status !== 'string' || !APPOINTMENT_STATUSES.includes(query.status)) {
      throw ApiError.badRequest(`Estado inválido: usa uno de ${APPOINTMENT_STATUSES.join(', ')}`, {
        status: `Estados permitidos: ${APPOINTMENT_STATUSES.join(', ')}`
      });
    }
    filters.status = query.status;
  }
  return filters;
}

function aggregateMatch(range, filters = {}, { excludeBlocking = false } = {}) {
  const match = {
    start: { $gte: range.from, $lt: range.to }
  };
  for (const field of ID_FILTERS) {
    if (filters[field]) match[field] = new Types.ObjectId(filters[field]);
  }
  if (filters.status) match.status = filters.status;
  else if (excludeBlocking) match.status = { $nin: BLOCKING_STATUSES };
  return match;
}

function rankingPipeline(tenantId, range, filters, groupField, collection, nameField) {
  const tenantObjectId = new Types.ObjectId(tenantId);
  return appointmentRepository.aggregate(
    [
      { $match: aggregateMatch(range, filters, { excludeBlocking: true }) },
      { $group: { _id: `$${groupField}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $setWindowFields: { sortBy: { count: -1 }, output: { rank: { $rank: {} } } } },
      {
        $lookup: {
          from: collection,
          let: { referenceId: '$_id' },
          pipeline: [
            {
              $match: {
                tenantId: tenantObjectId,
                $expr: { $eq: ['$_id', '$$referenceId'] }
              }
            }
          ],
          as: 'reference'
        }
      },
      { $unwind: '$reference' },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: {
            $concat: nameField.map((field) => ({ $ifNull: [`$reference.${field}`, ''] }))
          },
          count: 1,
          rank: 1
        }
      },
      { $sort: { rank: 1, name: 1 } }
    ],
    tenantId
  );
}

export const dashboardService = {
  async getTotalAppointments(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const filters = resolveFilters(query);
    const total = await appointmentRepository.countInRange(tenantId, range.from, range.to, filters);
    const byStatus = await appointmentRepository.aggregate(
      [
        { $match: aggregateMatch(range, filters) },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ],
      tenantId
    );
    return {
      period: { from: toDateKey(range.from), to: toDateKey(new Date(range.to.getTime() - 86_400_000)) },
      total,
      byStatus: Object.fromEntries(byStatus.map((entry) => [entry._id, entry.count]))
    };
  },

  async getTopServices(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const filters = resolveFilters(query);
    const items = await rankingPipeline(tenantId, range, filters, 'serviceId', 'services', ['name']);
    return { items, note: 'Los empates conservan el mismo rank y se listan sin omisiones' };
  },

  async getTopClients(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const filters = resolveFilters(query);
    const items = await rankingPipeline(tenantId, range, filters, 'clientId', 'clients', ['firstName', 'lastName']);
    return { items, note: 'Los empates conservan el mismo rank y se listan sin omisiones' };
  },

  async getTopProfessionals(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const filters = resolveFilters(query);
    const items = await rankingPipeline(tenantId, range, filters, 'professionalId', 'professionals', ['firstName', 'lastName']);
    return { items, note: 'Los empates conservan el mismo rank y se listan sin omisiones' };
  },

  async getConsolidated(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const filters = resolveFilters(query);
    const period = { from: toDateKey(range.from), to: toDateKey(new Date(range.to.getTime() - 86_400_000)) };
    const normalized = { ...period, ...filters };

    const [totalResult, topServices, topClients, topProfessionals] = await Promise.all([
      this.getTotalAppointments(tenantId, normalized, actor),
      this.getTopServices(tenantId, normalized, actor),
      this.getTopClients(tenantId, normalized, actor),
      this.getTopProfessionals(tenantId, normalized, actor)
    ]);

    const projectionAudit = await appointmentRepository.aggregate(
      [
        { $match: aggregateMatch(range, filters) },
        { $count: 'count' }
      ],
      tenantId
    );

    return {
      period,
      totalAppointments: totalResult.total,
      byStatus: totalResult.byStatus,
      topServices: topServices.items,
      topClients: topClients.items,
      topProfessionals: topProfessionals.items,
      auditCount: projectionAudit[0]?.count || 0
    };
  }
};
