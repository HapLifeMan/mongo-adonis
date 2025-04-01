/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Export connection module
 */
export { MongoConnection } from './connection/connection.js'
export { MongoConnectionManager } from './connection/connection_manager.js'
export { MongoDatabase } from './connection/database.js'

/**
 * Export query builder module
 */
export { MongoQueryClient } from './querybuilder/query_client.js'
export { MongoQueryBuilder } from './querybuilder/query_builder.js'

/**
 * Export model module
 */
export { MongoModel } from './model/base_model.js'
export { MongoAdapter } from './model/adapter.js'
export { column, computed } from './model/decorators.js'

/**
 * Export schema module
 */
export { MongoSchema } from './schema/schema.js'
export { MongoSchemaBuilder } from './schema/builder.js'

/**
 * Export relations module
 */
export { BaseRelation } from './relations/base_relation.js'
export { HasOne } from './relations/has_one.js'
export { HasMany } from './relations/has_many.js'
export { BelongsTo } from './relations/belongs_to.js'
export { hasOne, hasMany, belongsTo, belongsToMany } from './relations/decorators.js'

/**
 * Export errors
 */
export * from './errors.js'

/**
 * Export types
 */
export type { MongoConnectionContract, MongoConnectionManagerContract, MongoDatabaseContract } from './types/database.js'
export type { MongoModelConstructor } from './model/base_model.js'

/**
 * Export config
 */
export { defineConfig } from './define_config.js'
export type { MongoDBConfig, MongoDBConnectionConfig } from './define_config.js'

export { ObjectId } from 'mongodb'
export { withAuthFinder } from './mixins.js'
export { beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete, beforeFind, afterFind, beforeSave, afterSave } from './model/hooks.js'