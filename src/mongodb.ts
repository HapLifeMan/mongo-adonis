/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MongoDBClient, getMongoDBClient } from './db.js'

/**
 * Direct MongoDB client singleton
 * Use this to directly access MongoDB collections using dot notation
 *
 * Example:
 * ```ts
 * import { db } from 'mongo-adonis'
 *
 * // Now you can directly access collections
 * const users = await db.users.find({}).toArray()
 * ```
 *
 * Note: The MongoDB client must be initialized before using this export.
 * This is typically done by the Adonis service provider during application boot.
 */
export const db = new Proxy({}, {
  get: (_target, prop) => {
    // Get the MongoDB client (will throw if not initialized)
    const client = getMongoDBClient()

    // Forward the property access to the actual client
    return client[prop as keyof typeof client]
  }
}) as MongoDBClient