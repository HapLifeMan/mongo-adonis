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

/**
 * HasMany relationship for MongoDB
 */
export class HasMany extends BaseRelation {
  constructor(
    relatedModel: MongoModelConstructor,
    ownerModel: MongoModel,
    foreignKey?: string,
    localKey?: string
  ) {
    super(relatedModel, ownerModel, foreignKey, localKey)
  }

  /**
   * Set up the relationship
   */
  async setup(): Promise<void> {
    this.boot()
  }

  /**
   * Execute the relation query
   */
  async exec(): Promise<MongoModel[]> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return []
    }

    return this.relatedModel.query()
      .where(this.foreignKey, this.ensureObjectId(localKeyValue))
      .all()
  }

  /**
   * Save a related model
   */
  async save(related: MongoModel): Promise<MongoModel> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot save relation. The local key value is undefined')
    }

    related[this.foreignKey] = this.ensureObjectId(localKeyValue)
    await related.save()

    return related
  }

  /**
   * Save multiple related models
   */
  async saveMany(relatedList: MongoModel[]): Promise<MongoModel[]> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot save relation. The local key value is undefined')
    }

    for (const related of relatedList) {
      related[this.foreignKey] = this.ensureObjectId(localKeyValue)
    }

    await Promise.all(relatedList.map((related) => related.save()))
    return relatedList
  }

  /**
   * Create a related model
   */
  async create(values: Partial<MongoModel>): Promise<MongoModel> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot create relation. The local key value is undefined')
    }

    const related = await this.relatedModel.create({
      ...values,
      [this.foreignKey]: this.ensureObjectId(localKeyValue),
    })

    return related
  }

  /**
   * Create multiple related models
   */
  async createMany(valuesList: Partial<MongoModel>[]): Promise<MongoModel[]> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot create relation. The local key value is undefined')
    }

    const relatedList = await Promise.all(
      valuesList.map((values) =>
        this.relatedModel.create({
          ...values,
          [this.foreignKey]: this.ensureObjectId(localKeyValue),
        })
      )
    )

    return relatedList
  }

  /**
   * Associate a model
   */
  async associate(related: MongoModel): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot associate relation. The local key value is undefined')
    }

    related[this.foreignKey] = this.ensureObjectId(localKeyValue)
    await related.save()
  }

  /**
   * Associate multiple models
   */
  async associateMany(relatedList: MongoModel[]): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      throw new Error('Cannot associate relation. The local key value is undefined')
    }

    for (const related of relatedList) {
      related[this.foreignKey] = this.ensureObjectId(localKeyValue)
    }

    await Promise.all(relatedList.map((related) => related.save()))
  }

  /**
   * Dissociate all related models
   */
  async dissociate(): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return
    }

    await this.relatedModel.query()
      .where(this.foreignKey, this.ensureObjectId(localKeyValue))
      .update({ $set: { [this.foreignKey]: null } })
  }

  /**
   * Delete all related models
   */
  async delete(): Promise<void> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return
    }

    await this.relatedModel.query()
      .where(this.foreignKey, this.ensureObjectId(localKeyValue))
      .delete()
  }

  /**
   * Delete many related models
   */
  async deleteMany(relatedList: MongoModel[]): Promise<void> {
    this.boot()

    if (relatedList.length === 0) {
      return
    }

    const ids = relatedList.map(model => model.$primaryKeyValue)
    await this.relatedModel.query()
      .whereIn('_id', ids)
      .delete()
  }
}