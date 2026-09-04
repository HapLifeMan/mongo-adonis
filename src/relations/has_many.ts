/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HasOneOrMany } from './base_relation.js'
import type { MongoModel } from '../model/base_model.js'

/**
 * HasMany relationship for MongoDB
 */
export class HasMany extends HasOneOrMany {
  /**
   * Execute the relation query
   */
  async exec(): Promise<MongoModel[]> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (localKeyValue === undefined || localKeyValue === null) {
      return []
    }

    return this.relatedModel.query()
      .where(this.foreignKey, this.ensureObjectId(localKeyValue))
      .all()
  }

  /**
   * Save multiple related models
   */
  async saveMany(relatedList: MongoModel[]): Promise<MongoModel[]> {
    this.boot()

    const localKeyValue = this.requireLocalKeyValue('save')
    for (const related of relatedList) {
      related[this.foreignKey] = this.ensureObjectId(localKeyValue)
    }

    await Promise.all(relatedList.map((related) => related.save()))
    return relatedList
  }

  /**
   * Create multiple related models
   */
  async createMany(valuesList: Partial<MongoModel>[]): Promise<MongoModel[]> {
    this.boot()

    const localKeyValue = this.requireLocalKeyValue('create')
    return this.relatedModel.createMany(
      valuesList.map((values) => ({
        ...values,
        [this.foreignKey]: this.ensureObjectId(localKeyValue),
      }))
    )
  }

  /**
   * Associate multiple models
   */
  async associateMany(relatedList: MongoModel[]): Promise<void> {
    this.boot()

    const localKeyValue = this.requireLocalKeyValue('associate')
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
    if (localKeyValue === undefined || localKeyValue === null) {
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
    if (localKeyValue === undefined || localKeyValue === null) {
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

    const ids = relatedList.map((model) => model.$primaryKeyValue)
    await this.relatedModel.query()
      .whereIn(this.relatedModel.primaryKey, ids)
      .delete()
  }
}
