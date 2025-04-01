/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseRelation } from './base_relation.js'
import type { MongoModel, MongoModelConstructor } from '../model/base_model.js'
import { ObjectId } from 'mongodb'

/**
 * BelongsToMany relationship for MongoDB
 * Handles many-to-many relationships through a pivot collection
 */
export class BelongsToMany extends BaseRelation {
  /**
   * The pivot model
   */
  protected pivotModel: MongoModelConstructor

  /**
   * The foreign key on the pivot model that references the owner model
   */
  protected pivotForeignKey: string

  /**
   * The foreign key on the pivot model that references the related model
   */
  protected pivotRelatedKey: string

  constructor(
    relatedModel: MongoModelConstructor,
    ownerModel: MongoModel,
    pivotModel: MongoModelConstructor,
    pivotForeignKey?: string,
    pivotRelatedKey?: string,
    localKey?: string,
    relatedKey?: string
  ) {
    super(relatedModel, ownerModel, undefined, localKey)
    this.pivotModel = pivotModel
    this.pivotForeignKey = pivotForeignKey || `${this.ownerModel.constructor.name.toLowerCase()}_id`
    this.pivotRelatedKey = pivotRelatedKey || `${this.relatedModel.name.toLowerCase()}_id`
    this.foreignKey = relatedKey || '_id'
  }

  /**
   * Set up the relationship
   */
  async setup(): Promise<void> {
    this.boot()
  }

  /**
   * Execute the relation query to get related models through the pivot
   */
  async exec(): Promise<MongoModel[]> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return []
    }

    // Find pivot records that reference the owner model
    const pivotRecords = await this.pivotModel.query()
      .where(this.pivotForeignKey, this.ensureObjectId(localKeyValue))
      .all()

    if (pivotRecords.length === 0) {
      return []
    }

    // Extract related model IDs from pivot records
    const relatedIds = pivotRecords.map(pivot => pivot[this.pivotRelatedKey])

    // Find all related models with those IDs
    return this.relatedModel.query()
      .whereIn(this.foreignKey, relatedIds)
      .all()
  }

  /**
   * Attach one or more related models to the owner model
   */
  async attach(ids: string[] | ObjectId[]): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot attach relation. The local key value is undefined')
    }

    const pivotRecords = ids.map(id => ({
      [this.pivotForeignKey]: this.ensureObjectId(localKeyValue),
      [this.pivotRelatedKey]: this.ensureObjectId(id)
    }))

    await this.pivotModel.createMany(pivotRecords)
  }

  /**
   * Attach related models with additional pivot data
   */
  async attachWithPivotData(data: { id: string | ObjectId, pivotData?: Record<string, any> }[]): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot attach relation with pivot data. The local key value is undefined')
    }

    const pivotRecords = data.map(item => ({
      [this.pivotForeignKey]: this.ensureObjectId(localKeyValue),
      [this.pivotRelatedKey]: this.ensureObjectId(item.id),
      ...(item.pivotData || {})
    }))

    await this.pivotModel.createMany(pivotRecords)
  }

  /**
   * Detach one or more related models from the owner model
   */
  async detach(ids?: string[] | ObjectId[]): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return
    }

    const query = this.pivotModel.query()
      .where(this.pivotForeignKey, this.ensureObjectId(localKeyValue))

    if (ids && ids.length > 0) {
      query.whereIn(this.pivotRelatedKey, ids.map(id => this.ensureObjectId(id)))
    }

    await query.delete()
  }

  /**
   * Sync the relationship by detaching all existing relations and attaching the given IDs
   */
  async sync(ids: string[] | ObjectId[]): Promise<void> {
    this.boot()

    // First detach all existing relations
    await this.detach()

    // If there are no ids to sync, we're done
    if (!ids || ids.length === 0) {
      return
    }

    // Attach the new relations
    await this.attach(ids)
  }

  /**
   * Sync the relationship with pivot data
   */
  async syncWithPivotData(data: { id: string | ObjectId, pivotData?: Record<string, any> }[]): Promise<void> {
    this.boot()

    // First detach all existing relations
    await this.detach()

    // If there's no data to sync, we're done
    if (!data || data.length === 0) {
      return
    }

    // Attach the new relations with pivot data
    await this.attachWithPivotData(data)
  }

  /**
   * Check if a relationship exists between the owner and the given related ID
   */
  async exists(id: string | ObjectId): Promise<boolean> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return false
    }

    const count = await this.pivotModel.query()
      .where(this.pivotForeignKey, this.ensureObjectId(localKeyValue))
      .where(this.pivotRelatedKey, this.ensureObjectId(id))
      .count()

    return count > 0
  }

  /**
   * Get pivot data for a specific relation
   */
  async pivotData(id: string | ObjectId): Promise<Record<string, any> | null> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return null
    }

    const pivotRecord = await this.pivotModel.query()
      .where(this.pivotForeignKey, this.ensureObjectId(localKeyValue))
      .where(this.pivotRelatedKey, this.ensureObjectId(id))
      .first()

    if (!pivotRecord) {
      return null
    }

    // Return all pivot data excluding the foreign keys
    const { [this.pivotForeignKey]: _, [this.pivotRelatedKey]: __, ...pivotData } = pivotRecord
    return pivotData
  }

  /**
   * Update pivot data for a specific relation
   */
  async updatePivotData(id: string | ObjectId, data: Record<string, any>): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot update pivot data. The local key value is undefined')
    }

    await this.pivotModel.query()
      .where(this.pivotForeignKey, this.ensureObjectId(localKeyValue))
      .where(this.pivotRelatedKey, this.ensureObjectId(id))
      .update({ $set: data })
  }
}