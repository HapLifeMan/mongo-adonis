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
import type { MongoModelConstructor } from './base_model.js'

/**
 * Adapter to bridge the communication between the model and the database
 */
export class MongoAdapter {
  constructor(private db: MongoDatabase) {}

  /**
   * Get the query builder for a model
   */
  query(modelConstructor: MongoModelConstructor): {
    as<T>(): T
  } {
    const connection = this.db.connection(modelConstructor.connection)
    const queryClient = connection.collection(modelConstructor.collection)

    const queryBuilder = new MongoQueryBuilder(
      queryClient,
      modelConstructor.collection,
      connection.name,
      this.db.emitter,
      modelConstructor as any
    )

    return {
      as<T>(): T {
        return queryBuilder as unknown as T
      },
    }
  }

  /**
   * Truncate a collection
   */
  async truncate(modelConstructor: MongoModelConstructor): Promise<void> {
    const connection = this.db.connection(modelConstructor.connection)
    await connection.collection(modelConstructor.collection).deleteMany({})
  }
}