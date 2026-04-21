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
import { BelongsToMany } from './belongs_to_many.js'
import type { MongoModelConstructor } from '../model/base_model.js'

/**
 * Memoize a relation instance per owner model. Decorators used to build a
 * fresh relation on every property access, which meant `model.posts ===
 * model.posts` was false and every access allocated. Cache on a hidden,
 * non-enumerable slot keyed by property name.
 */
function memoizedGetter(
  property: string | symbol,
  factory: (owner: any) => any
): (this: any) => any {
  const slot = typeof property === 'symbol'
    ? Symbol(`__relation_${property.description}`)
    : Symbol(`__relation_${property}`)

  return function (this: any) {
    const existing = this[slot]
    if (existing) return existing
    const instance = factory(this)
    Object.defineProperty(this, slot, {
      value: instance,
      enumerable: false,
      configurable: true,
      writable: true,
    })
    return instance
  }
}

/**
 * Define a hasOne relationship
 */
export function hasOne(
  relatedModel: () => MongoModelConstructor,
  foreignKey?: string,
  localKey?: string
): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    Object.defineProperty(target, property, {
      get: memoizedGetter(property, (owner) => new HasOne(relatedModel(), owner, foreignKey, localKey)),
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
    Object.defineProperty(target, property, {
      get: memoizedGetter(property, (owner) => new HasMany(relatedModel(), owner, foreignKey, localKey)),
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
    Object.defineProperty(target, property, {
      get: memoizedGetter(property, (owner) => new BelongsTo(relatedModel(), owner, foreignKey, localKey)),
    })
  }
}

/**
 * Define a belongsToMany relationship
 */
export function belongsToMany(
  relatedModel: () => MongoModelConstructor,
  pivotModel: () => MongoModelConstructor,
  pivotForeignKey?: string,
  pivotRelatedKey?: string,
  localKey?: string,
  relatedKey?: string
): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    Object.defineProperty(target, property, {
      get: memoizedGetter(property, (owner) =>
        new BelongsToMany(
          relatedModel(),
          owner,
          pivotModel(),
          pivotForeignKey,
          pivotRelatedKey,
          localKey,
          relatedKey
        )
      ),
    })
  }
}