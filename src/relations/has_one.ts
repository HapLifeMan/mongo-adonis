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
 * HasOne relationship for MongoDB
 */
export class HasOne extends HasOneOrMany {
  /**
   * Execute the relation query
   */
  async exec(): Promise<MongoModel | null> {
    this.boot()

    const localKeyValue = this.getLocalKeyValue()
    if (localKeyValue === undefined || localKeyValue === null) {
      return null
    }

    return this.relatedModel.findBy(this.foreignKey, this.ensureObjectId(localKeyValue))
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
