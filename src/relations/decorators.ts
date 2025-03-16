/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { HasOne } from './has_one.js'
import { HasMany } from './has_many.js'
import { BelongsTo } from './belongs_to.js'
import type { MongoModelConstructor } from '../model/base_model.js'

/**
 * Define a hasOne relationship
 */
export function hasOne(
  relatedModel: () => MongoModelConstructor,
  foreignKey?: string,
  localKey?: string
): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    /**
     * Define the relationship getter
     */
    Object.defineProperty(target, property, {
      get() {
        const model = relatedModel()
        return new HasOne(model, this, foreignKey, localKey)
      },
    })
  }
}

/**
 * Define a hasMany relationship
 */
export function hasMany(
  relatedModel: () => MongoModelConstructor,
  foreignKey?: string,
  localKey?: string
): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    /**
     * Define the relationship getter
     */
    Object.defineProperty(target, property, {
      get() {
        const model = relatedModel()
        return new HasMany(model, this, foreignKey, localKey)
      },
    })
  }
}

/**
 * Define a belongsTo relationship
 */
export function belongsTo(
  relatedModel: () => MongoModelConstructor,
  foreignKey?: string,
  localKey?: string
): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    /**
     * Define the relationship getter
     */
    Object.defineProperty(target, property, {
      get() {
        const model = relatedModel()
        return new BelongsTo(model, this, foreignKey, localKey)
      },
    })
  }
}