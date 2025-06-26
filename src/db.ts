/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Collection, Document } from 'mongodb'
import { MongoDatabase } from './connection/database.js'

/**
 * Type for the MongoDB client that allows accessing collections via dot notation
 */
export type MongoDBClient = {
  [collectionName: string]: Collection<Document>
}

// Singleton instance
let dbInstance: MongoDBClient | null = null
let cachedConnection: any = null

/**
 * Creates a MongoDB client that allows direct access to collections using dot notation
 * Example: db.users.find({})
 */
export function createMongoDBClient(database: MongoDatabase, connectionName?: string): MongoDBClient {
  // Cache connection for performance
  if (!cachedConnection) {
    cachedConnection = database.connection(connectionName)
  }

  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        // Ignore symbols and internal properties
        if (typeof prop === 'symbol' || prop.toString().startsWith('_')) {
          return undefined
        }

        // Direct collection access when ready (most common case)
        if (cachedConnection.isReady) {
          return cachedConnection.collection(prop.toString())
        }

        // Only create async proxy if connection not ready (rare case)
        const collectionName = prop.toString()
        return new Proxy(
          {},
          {
            get: (_target, method) => {
              if (typeof method === 'string' && method in Collection.prototype) {
                return async (...args: any[]) => {
                  // Connect if not ready
                  if (!cachedConnection.isReady) {
                    await cachedConnection.connect()
                  }

                  const collection = cachedConnection.collection(collectionName)
                  return (collection[method as keyof Collection<Document>] as Function).apply(collection, args)
                }
              }
              return undefined
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