/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Collection, Document } from 'mongodb'
import { EventEmitter } from 'node:events'

import { MongoQueryBuilder, executeWithQueryEvent } from './query_builder.js'
import type { MongoConnectionContract } from '../types/database.js'
import type { MongoModel } from '../model/base_model.js'

/**
 * Query client exposes the API to execute queries against a MongoDB connection
 */
export class MongoQueryClient {
  constructor(
    private connection: MongoConnectionContract,
    private emitter: EventEmitter
  ) {}

  /**
   * Get a collection from the database
   */
  collection<T extends Document = Document>(collectionName: string): Collection<T> {
    return this.connection.collection<T>(collectionName)
  }

  /**
   * Create a query builder for a collection
   */
  query<T extends MongoModel = MongoModel>(collectionName: string): MongoQueryBuilder<T> {
    return new MongoQueryBuilder<T>(
      () => this.connection.collection(collectionName),
      collectionName,
      this.connection.name,
      this.emitter,
      undefined,
      () => this.connection.connect()
    )
  }

  /**
   * Execute a raw query against the database
   */
  async rawQuery<T = any>(collectionName: string, query: any, options?: any): Promise<T> {
    return executeWithQueryEvent(this.emitter, this.connection.name, query, async () => {
      return await this.collection(collectionName).find(query, options).toArray() as T
    })
  }

  /**
   * Execute a raw command against the database
   */
  async rawCommand<T = any>(command: any): Promise<T> {
    return executeWithQueryEvent(this.emitter, this.connection.name, command, async () => {
      return await this.connection.db.command(command) as T
    })
  }
}
