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
 * HasOne relationship for MongoDB
 */
export class HasOne extends BaseRelation {
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
  async exec(): Promise<MongoModel | null> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (!localKeyValue) {
      return null
    }

    return this.relatedModel.findBy(this.foreignKey, this.ensureObjectId(localKeyValue))
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
   * Dissociate a model
   */
  async dissociate(): Promise<void> {
    this.boot()

    const related = await this.exec()
    if (!related) {
      return
    }

    related[this.foreignKey] = null
    await related.save()
  }

  /**
   * Delete the related model
   */
  async delete(): Promise<void> {
    this.boot()

    const related = await this.exec()
    if (!related) {
      return
    }

    await related.delete()
  }
}