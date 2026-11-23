import { Types } from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import { assertPermission } from '../utils/permissions.js';
import { buildRange, isValidRange, toDateKey } from '../utils/dates.js';
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

function rankingPipeline(tenantId, range, groupField, collection, nameField) {
  const tenantObjectId = new Types.ObjectId(tenantId);
  return appointmentRepository.aggregate(
    [
      {
        $match: {
          start: { $gte: range.from, $lt: range.to },
          status: { $nin: ['cancelada', 'no asistió'] }
        }
      },
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
    const total = await appointmentRepository.countInRange(tenantId, range.from, range.to);
    const byStatus = await appointmentRepository.aggregate(
      [
        { $match: { start: { $gte: range.from, $lt: range.to } } },
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
    const items = await rankingPipeline(tenantId, range, 'serviceId', 'services', ['name']);
    return { items, note: 'Los empates conservan el mismo rank y se listan sin omisiones' };
  },

  async getTopClients(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const items = await rankingPipeline(tenantId, range, 'clientId', 'clients', ['firstName', 'lastName']);
    return { items, note: 'Los empates conservan el mismo rank y se listan sin omisiones' };
  },

  async getTopProfessionals(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const items = await rankingPipeline(tenantId, range, 'professionalId', 'professionals', ['firstName', 'lastName']);
    return { items, note: 'Los empates conservan el mismo rank y se listan sin omisiones' };
  },

  async getConsolidated(tenantId, query = {}, actor) {
    assertPermission(actor, 'dashboard.read');
    const range = resolveRange(query);
    const normalized = { from: toDateKey(range.from), to: toDateKey(new Date(range.to.getTime() - 86_400_000)) };
    const tenantObjectId = new Types.ObjectId(tenantId);

    const [totalResult, topServices, topClients, topProfessionals] = await Promise.all([
      this.getTotalAppointments(tenantId, normalized, actor),
      this.getTopServices(tenantId, normalized, actor),
      this.getTopClients(tenantId, normalized, actor),
      this.getTopProfessionals(tenantId, normalized, actor)
    ]);

    const projectionAudit = await appointmentRepository.aggregate(
      [
        { $match: { tenantId: tenantObjectId, start: { $gte: range.from, $lt: range.to } } },
        { $count: 'count' }
      ],
      tenantId
    );

    return {
      period: normalized,
      totalAppointments: totalResult.total,
      byStatus: totalResult.byStatus,
      topServices: topServices.items,
      topClients: topClients.items,
      topProfessionals: topProfessionals.items,
      auditCount: projectionAudit[0]?.count || 0
    };
  }
};
