/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Collection, Document, IndexDescription } from 'mongodb'
import { EventEmitter } from 'node:events'

import type { MongoConnectionContract } from '../types/database.js'

/**
 * Schema builder for MongoDB collections
 */
export class MongoSchemaBuilder {
  /**
   * The collection to build the schema for
   */
  private collection: Collection

  /**
   * The indexes to create
   */
  private indexes: IndexDescription[] = []

  constructor(
    private collectionName: string,
    private connection: MongoConnectionContract,
    private emitter: EventEmitter
  ) {
    this.collection = this.connection.collection(this.collectionName)
  }

  /**
   * Create a new index
   */
  createIndex(
    keys: Document,
    options: {
      name?: string
      unique?: boolean
      sparse?: boolean
      expireAfterSeconds?: number
      background?: boolean
    } = {}
  ): this {
    this.indexes.push({
      key: keys,
      ...options,
    })
    return this
  }

  /**
   * Create a unique index
   */
  unique(keys: Document, options: { name?: string; sparse?: boolean } = {}): this {
    return this.createIndex(keys, { ...options, unique: true })
  }

  /**
   * Create a text index
   */
  text(keys: string | string[], options: { name?: string; weights?: Record<string, number> } = {}): this {
    const textKeys: Record<string, string> = {}

    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        textKeys[key] = 'text'
      })
    } else {
      textKeys[keys] = 'text'
    }

    return this.createIndex(textKeys, options)
  }

  /**
   * Create a TTL index
   */
  ttl(key: string, seconds: number, options: { name?: string } = {}): this {
    return this.createIndex({ [key]: 1 }, { ...options, expireAfterSeconds: seconds })
  }

  /**
   * Create a geospatial index
   */
  geo(key: string, options: { name?: string; sparse?: boolean } = {}): this {
    return this.createIndex({ [key]: '2dsphere' }, options)
  }

  /**
   * Drop the collection
   */
  async drop(): Promise<void> {
    const startTime = process.hrtime()

    try {
      await this.collection.drop()

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:schema', {
        connection: this.connection.name,
        query: { drop: true, collection: this.collectionName },
        duration,
      })
    } catch (error) {
      // Ignore error if collection doesn't exist
      if (error.code !== 26) {
        const duration = process.hrtime(startTime)
        this.emitter.emit('mongodb:schema', {
          connection: this.connection.name,
          query: { drop: true, collection: this.collectionName },
          duration,
          error,
        })
        throw error
      }
    }
  }

  /**
   * Create the collection with indexes
   */
  async create(): Promise<void> {
    const startTime = process.hrtime()

    try {
      // Create collection if it doesn't exist
      try {
        await this.connection.db.createCollection(this.collectionName)
      } catch (error) {
        // Ignore error if collection already exists
        if (error.code !== 48) {
          throw error
        }
      }

      // Create indexes
      if (this.indexes.length > 0) {
        await this.collection.createIndexes(this.indexes)
      }

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:schema', {
        connection: this.connection.name,
        query: { create: true, collection: this.collectionName, indexes: this.indexes },
        duration,
      })
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:schema', {
        connection: this.connection.name,
        query: { create: true, collection: this.collectionName, indexes: this.indexes },
        duration,
        error,
      })
      throw error
    }
  }
}