/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ObjectId } from 'mongodb'
import type { MongoModel, MongoModelConstructor } from '../model/base_model.js'

/**
 * Base relation class for MongoDB relationships
 */
export abstract class BaseRelation {
  /**
   * The related model
   */
  protected relatedModel: MongoModelConstructor

  /**
   * The owner model
   */
  protected ownerModel: MongoModel

  /**
   * The local key on the owner model
   */
  protected localKey: string

  /**
   * The foreign key on the related model
   */
  protected foreignKey: string

  /**
   * Whether the relation is already booted
   */
  protected booted: boolean = false

  constructor(
    relatedModel: MongoModelConstructor,
    ownerModel: MongoModel,
    foreignKey?: string,
    localKey?: string
  ) {
    this.relatedModel = relatedModel
    this.ownerModel = ownerModel
    this.foreignKey = foreignKey || `${this.ownerModel.constructor.name.toLowerCase()}_id`
    this.localKey = localKey || this.ownerModel.$primaryKey
  }

  /**
   * Boot the relation
   */
  boot(): void {
    if (this.booted) {
      return
    }

    this.relatedModel.boot()
    this.booted = true
  }

  /**
   * Get the local key value
   */
  getLocalKeyValue(): any {
    return this.ownerModel[this.localKey]
  }

  /**
   * Convert a value to ObjectId if needed
   */
  protected ensureObjectId(value: any): any {
    if (typeof value === 'string' && ObjectId.isValid(value)) {
      return new ObjectId(value)
    }
    return value
  }

  /**
   * Execute the relation query
   */
  abstract exec(): Promise<any>
}