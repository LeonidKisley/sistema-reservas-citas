import { Types } from 'mongoose';
import { ApiError } from '../utils/apiError.js';

export class TenantRepository {
  constructor(model) {
    if (!model) throw new Error('TenantRepository requiere un modelo de Mongoose');
    this.model = model;
  }

  oid(value) {
    if (value instanceof Types.ObjectId) return value;
    if (!Types.ObjectId.isValid(value)) {
      throw ApiError.badRequest('Identificador de tenant inválido');
    }
    return new Types.ObjectId(value);
  }

  async existsInTenantForOwnershipCheck(id, tenantId) {
    if (!Types.ObjectId.isValid(id)) return false;
    return this.exists({ _id: this.oid(id) }, tenantId);
  }

  async existsAnywhereForOwnershipCheck(id) {
    if (!Types.ObjectId.isValid(id)) return false;
    return Boolean(await this.model.exists({ _id: this.oid(id) }).exec());
  }

  scoped(filter = {}, tenantId, options = {}) {
    if (!tenantId) throw ApiError.internal('Violación de aislamiento: falta tenantId en el repositorio');
    const query = { ...filter, tenantId: this.oid(tenantId) };
    if (options.excludeDeleted && this.model.schema.path('deletedAt')) {
      query.deletedAt = null;
    }
    return query;
  }

  buildQuery(filter, tenantId, options = {}) {
    let query = this.model.find(this.scoped(filter, tenantId, options));
    if (options.select) query = query.select(options.select);
    if (options.sort) query = query.sort(options.sort);
    if (options.skip) query = query.skip(options.skip);
    if (options.limit) query = query.limit(options.limit);
    if (options.populate) query = query.populate(options.populate);
    if (options.session) query = query.session(options.session);
    return options.lean ? query.lean() : query;
  }

  async find(filter = {}, tenantId, options = {}) {
    return this.buildQuery(filter, tenantId, options).exec();
  }

  async findOne(filter = {}, tenantId, options = {}) {
    return this.buildQuery(filter, tenantId, options).limit(1).exec().then((rows) => rows[0] || null);
  }

  async findById(id, tenantId, options = {}) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.findOne({ _id: this.oid(id) }, tenantId, options);
  }

  async create(data = {}, tenantId, session) {
    const document = { ...data, tenantId: this.oid(tenantId) };
    const [created] = await this.model.create([document], session ? { session } : undefined);
    return created;
  }

  async insertMany(documents = [], tenantId, session) {
    const payload = documents.map((document) => ({ ...document, tenantId: this.oid(tenantId) }));
    return this.model.insertMany(payload, session ? { session } : undefined);
  }

  async countDocuments(filter = {}, tenantId, options = {}) {
    let query = this.model.countDocuments(this.scoped(filter, tenantId, options));
    if (options.session) query = query.session(options.session);
    return query.exec();
  }

  async exists(filter = {}, tenantId, options = {}) {
    let query = this.model.exists(this.scoped(filter, tenantId, options));
    if (options.session) query = query.session(options.session);
    return Boolean(await query.exec());
  }

  async updateOne(filter = {}, update, tenantId, options = {}) {
    const { session, excludeDeleted, ...mongoOptions } = options;
    const query = this.model.updateOne(
      this.scoped(filter, tenantId, { excludeDeleted }),
      update,
      { new: true, ...mongoOptions, ...(session ? { session } : {}) }
    );
    return query.exec();
  }

  async findOneAndUpdate(filter = {}, update, tenantId, options = {}) {
    const { session, excludeDeleted, ...mongoOptions } = options;
    return this.model.findOneAndUpdate(
      this.scoped(filter, tenantId, { excludeDeleted }),
      update,
      { new: true, runValidators: true, ...mongoOptions, ...(session ? { session } : {}) }
    ).exec();
  }

  async findByIdAndUpdate(id, update, tenantId, options = {}) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.findOneAndUpdate({ _id: this.oid(id) }, update, tenantId, options);
  }

  async deleteOne(filter = {}, tenantId, options = {}) {
    const { session, excludeDeleted, ...mongoOptions } = options;
    return this.model.deleteOne(
      this.scoped(filter, tenantId, { excludeDeleted }),
      { ...mongoOptions, ...(session ? { session } : {}) }
    ).exec();
  }

  async aggregate(pipeline = [], tenantId, options = {}) {
    if (!tenantId) throw ApiError.internal('Violación de aislamiento: falta tenantId en aggregate');
    let query = this.model.aggregate([
      { $match: { tenantId: this.oid(tenantId) } },
      ...pipeline
    ]);
    if (options.session) query = query.session(options.session);
    return query.exec();
  }

  async distinct(field, filter = {}, tenantId, options = {}) {
    let query = this.model.distinct(field, this.scoped(filter, tenantId, options));
    if (options.session) query = query.session(options.session);
    return query.exec();
  }
}
