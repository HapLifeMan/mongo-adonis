/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Collection, Document } from 'mongodb'
import { MongoDatabase } from './connection/database.js'

/**
 * Type for the MongoDB client that allows accessing collections via dot notation
 */
export type MongoDBClient = {
  [collectionName: string]: Collection<Document>
}

// Singleton instance
let dbInstance: MongoDBClient | null = null

/**
 * Creates a MongoDB client that allows direct access to collections using dot notation
 * Example: db.users.find({})
 */
export function createMongoDBClient(database: MongoDatabase, connectionName?: string): MongoDBClient {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        // Ignore symbols and internal properties
        if (typeof prop === 'symbol' || prop.toString().startsWith('_')) {
          return undefined
        }

        const connection = database.connection(connectionName)

        // Return the collection if the connection is ready
        if (connection.isReady) {
          return connection.collection(prop.toString())
        }

        // If connection is not ready, create a proxy that will wait for the connection to be ready
        return new Proxy(
          {},
          {
            get: (_target, method) => {
              return async (...args: any[]) => {
                // Connect if not already connected
                if (!connection.isReady) {
                  await connection.connect()
                }

                const collection: Collection<Document> = connection.collection(prop.toString())

                if (typeof collection[method as keyof Collection<Document>] === 'function') {
                  return (collection[method as keyof Collection<Document>] as Function).apply(collection, args)
                }

                return undefined
              }
            }
          }
        )
      }
    }
  ) as MongoDBClient
}

/**
 * Initialize the MongoDB client singleton with the provided database
 * This should be called once in your application bootstrap
 */
export function initMongoDBClient(database: MongoDatabase, connectionName?: string): MongoDBClient {
  if (!dbInstance) {
    dbInstance = createMongoDBClient(database, connectionName)
  }
  return dbInstance
}

/**
 * Get the MongoDB client singleton
 * Throws an error if the client hasn't been initialized
 */
export function getMongoDBClient(): MongoDBClient {
  if (!dbInstance) {
    throw new Error('MongoDB client has not been initialized. Call initMongoDBClient first.')
  }
  return dbInstance
}