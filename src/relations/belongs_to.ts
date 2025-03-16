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
 * BelongsTo relationship for MongoDB
 */
export class BelongsTo extends BaseRelation {
  constructor(
    relatedModel: MongoModelConstructor,
    ownerModel: MongoModel,
    foreignKey?: string,
    localKey?: string
  ) {
    // For BelongsTo, the foreign key is on the owner model
    const relatedModelName = relatedModel.name.toLowerCase()

    const defaultForeignKey = `${relatedModelName}_id`
    const defaultLocalKey = relatedModel.primaryKey

    super(relatedModel, ownerModel, foreignKey || defaultForeignKey, localKey || defaultLocalKey)
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

    const foreignKeyValue = this.ownerModel[this.foreignKey]
    if (!foreignKeyValue) {
      return null
    }

    return this.relatedModel.findBy(this.localKey, this.ensureObjectId(foreignKeyValue))
  }

  /**
   * Associate a model
   */
  async associate(related: MongoModel): Promise<void> {
    this.boot()

    const relatedKeyValue = related[this.localKey]
    if (!relatedKeyValue) {
      throw new Error('Cannot associate relation. The related model primary key is undefined')
    }

    this.ownerModel[this.foreignKey] = this.ensureObjectId(relatedKeyValue)
    await this.ownerModel.save()
  }

  /**
   * Dissociate the relationship
   */
  async dissociate(): Promise<void> {
    this.boot()

    this.ownerModel[this.foreignKey] = null
    await this.ownerModel.save()
  }
}