/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { MongoDatabase } from '../src/connection/database.js'

/**
 * Get the MongoDB database instance
 */
export function getMongoDb(container: any): MongoDatabase {
  return container.make('lucid.mongodb')
}