/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MongoDatabase } from '../connection/database.js'
import { MongoQueryBuilder } from '../querybuilder/query_builder.js'
import type { MongoModel, MongoModelConstructor } from './base_model.js'

/**
 * Adapter to bridge the communication between the model and the database
 */
export class MongoAdapter {
  constructor(private db: MongoDatabase) {}

  /**
   * Get the query builder for a model. The collection is resolved lazily and
   * the builder awaits connection readiness before its first operation, so
   * queries issued during application boot don't race the connection
   * handshake.
   */
  query<T extends MongoModel = MongoModel>(modelConstructor: MongoModelConstructor): MongoQueryBuilder<T> {
    const connection = this.db.connection(modelConstructor.connection)

    return new MongoQueryBuilder<T>(
      () => connection.collection(modelConstructor.collection),
      modelConstructor.collection,
      connection.name,
      this.db.emitter,
      modelConstructor as any,
      () => connection.connect()
    )
  }

  /**
   * Truncate a collection
   */
  async truncate(modelConstructor: MongoModelConstructor): Promise<void> {
    const connection = this.db.connection(modelConstructor.connection)
    await connection.connect()
    await connection.collection(modelConstructor.collection).deleteMany({})
  }
}
