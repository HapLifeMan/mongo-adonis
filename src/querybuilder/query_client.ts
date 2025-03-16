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

import { MongoQueryBuilder } from './query_builder.js'
import type { MongoConnectionContract } from '../types/database.js'

/**
 * Query client exposes the API to execute queries against a MongoDB connection
 */
export class MongoQueryClient {
  constructor(
    private connection: MongoConnectionContract,
    private emitter: EventEmitter
  ) {}

  /**
   * Returns the collection name with the prefix (if any)
   */
  private getCollectionName(collectionName: string): string {
    return collectionName
  }

  /**
   * Get a collection from the database
   */
  collection<T extends Document = Document>(collectionName: string): Collection<T> {
    return this.connection.collection<T>(this.getCollectionName(collectionName))
  }

  /**
   * Create a query builder for a collection
   */
  query<T extends Document = Document>(collectionName: string): MongoQueryBuilder<T> {
    return new MongoQueryBuilder<T>(
      this.collection<T>(collectionName),
      collectionName,
      this.connection.name,
      this.emitter
    )
  }

  /**
   * Execute a raw query against the database
   */
  async rawQuery<T = any>(collectionName: string, query: any, options?: any): Promise<T> {
    const collection = this.collection(collectionName)
    const startTime = process.hrtime()

    try {
      const result = await collection.find(query, options).toArray() as T

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connection.name,
        query,
        duration,
      })

      return result
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connection.name,
        query,
        duration,
        error,
      })

      throw error
    }
  }

  /**
   * Execute a raw command against the database
   */
  async rawCommand<T = any>(command: any): Promise<T> {
    const startTime = process.hrtime()

    try {
      const result = await this.connection.db.command(command) as T

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connection.name,
        query: command,
        duration,
      })

      return result
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connection.name,
        query: command,
        duration,
        error,
      })

      throw error
    }
  }
}