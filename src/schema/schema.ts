/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { MongoDatabase } from '../connection/database.js'
import { MongoSchemaBuilder } from './builder.js'

/**
 * Schema class for MongoDB
 */
export class MongoSchema {
  constructor(private db: MongoDatabase) {}

  /**
   * Create a schema builder for a collection
   */
  createCollection(name: string, connectionName?: string): MongoSchemaBuilder {
    const connection = this.db.connection(connectionName)
    return new MongoSchemaBuilder(name, connection, this.db.emitter)
  }

  /**
   * Drop a collection
   */
  async dropCollection(name: string, connectionName?: string): Promise<void> {
    const builder = this.createCollection(name, connectionName)
    await builder.drop()
  }

  /**
   * Drop all collections in the database
   */
  async dropCollections(connectionName?: string): Promise<void> {
    const connection = this.db.connection(connectionName)

    // Check if the connection is ready before proceeding
    if (!connection.isReady) {
      return
    }

    const collections = await connection.db.collections()

    await Promise.all(
      collections
        .filter((collection) => !collection.collectionName.startsWith('system.'))
        .map((collection) => this.dropCollection(collection.collectionName, connectionName))
    )
  }

  /**
   * Create a migration collection
   */
  async createMigrationCollection(connectionName?: string): Promise<void> {
    const builder = this.createCollection('adonis_schema', connectionName)

    await builder
      .unique({ name: 1 })
      .create()
  }

  /**
   * Get all migrations
   */
  async getMigrations(connectionName?: string): Promise<{ name: string; batch: number }[]> {
    const connection = this.db.connection(connectionName)
    const collection = connection.collection('adonis_schema')

    const results = await collection.find().toArray()
    return results.map(doc => ({
      name: doc.name as string,
      batch: doc.batch as number
    }))
  }

  /**
   * Add a migration
   */
  async addMigration(name: string, batch: number, connectionName?: string): Promise<void> {
    const connection = this.db.connection(connectionName)
    const collection = connection.collection('adonis_schema')

    await collection.insertOne({ name, batch })
  }

  /**
   * Remove a migration
   */
  async removeMigration(name: string, connectionName?: string): Promise<void> {
    const connection = this.db.connection(connectionName)
    const collection = connection.collection('adonis_schema')

    await collection.deleteOne({ name })
  }

  /**
   * Get the latest batch number
   */
  async getLatestBatch(connectionName?: string): Promise<number> {
    const connection = this.db.connection(connectionName)
    const collection = connection.collection('adonis_schema')

    const result = await collection
      .find()
      .sort({ batch: -1 })
      .limit(1)
      .toArray()

    return result.length ? result[0].batch : 0
  }
}