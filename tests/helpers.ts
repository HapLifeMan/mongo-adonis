/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events'
import { MongoDatabase } from '../src/connection/database.js'
import { MongoAdapter } from '../src/model/adapter.js'
import { MongoSchema } from '../src/schema/schema.js'
import { MongoModel } from '../src/model/base_model.js'

// Mock logger
const logger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

// Create emitter
const emitter = new EventEmitter()

// Test database configuration
const config = {
  connection: 'mongodb',
  connections: {
    mongodb: {
      client: 'mongodb' as const,
      connection: {
        host: process.env.MONGODB_HOST || '127.0.0.1',
        port: Number(process.env.MONGODB_PORT || 27017),
        database: process.env.MONGODB_TEST_DATABASE || 'adonis_test',
      },
    },
  },
}

/**
 * Create a test database instance
 */
export function createTestDatabase() {
  return new MongoDatabase(config, logger, emitter)
}

/**
 * Create a test adapter
 */
export function createTestAdapter(db: MongoDatabase) {
  return new MongoAdapter(db)
}

/**
 * Create a test schema
 */
export function createTestSchema(db: MongoDatabase) {
  return new MongoSchema(db)
}

/**
 * Setup the test environment
 */
export async function setupTest() {
  const db = createTestDatabase()
  const adapter = createTestAdapter(db)
  const schema = createTestSchema(db)

  // Set the adapter on the model
  MongoModel.$adapter = adapter

  // Connect to the database
  const connection = db.connection()
  await connection.connect()

  return { db, adapter, schema }
}

/**
 * Clean up the test database
 */
export async function cleanupDatabase(db: MongoDatabase) {
  const schema = createTestSchema(db)
  await schema.dropCollections()
}

/**
 * Tear down the test environment
 */
export async function teardownTest(db: MongoDatabase) {
  await cleanupDatabase(db)
  await db.manager.closeAll()
}