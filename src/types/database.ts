/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events'
import type { MongoClient, Collection, Db, Document } from 'mongodb'
import type { MongoDBConfig } from '../define_config.js'

/**
 * Shape of the query event emitted by the MongoDB connection
 */
export type MongoQueryEventNode = {
  /**
   * The connection name
   */
  connection: string

  /**
   * The query object
   */
  query: any

  /**
   * The duration of the query in milliseconds
   */
  duration: [number, number]

  /**
   * The error that occurred during the query
   */
  error?: Error
}

/**
 * Shape of the MongoDB connection contract
 */
export interface MongoConnectionContract {
  /**
   * The name of the connection
   */
  name: string

  /**
   * The MongoDB client instance
   */
  client: MongoClient

  /**
   * The MongoDB database instance
   */
  db: Db

  /**
   * Get a collection from the database
   */
  collection<T extends Document = Document>(name: string): Collection<T>

  /**
   * Connect to the MongoDB server
   */
  connect(): Promise<void>

  /**
   * Disconnect from the MongoDB server
   */
  disconnect(): Promise<void>

  /**
   * Check if the connection is ready
   */
  isReady: boolean

  /**
   * Check if the connection is closed
   */
  isClosed: boolean

  /**
   * Connection state
   */
  state: 'registered' | 'open' | 'closed'

  /**
   * Event listeners
   */
  on(event: string, callback: (...args: any[]) => void): void
}

/**
 * Shape of the MongoDB connection manager
 */
export interface MongoConnectionManagerContract {
  /**
   * Get a connection by name
   */
  get(name?: string): MongoConnectionContract

  /**
   * Add a new connection
   */
  add(name: string, config: any): MongoConnectionContract

  /**
   * Close all connections
   */
  closeAll(): Promise<void>
}

/**
 * Shape of the MongoDB database
 */
export interface MongoDatabaseContract {
  /**
   * The MongoDB connection manager
   */
  manager: MongoConnectionManagerContract

  /**
   * The MongoDB configuration
   */
  config: MongoDBConfig & { prettyPrintDebugQueries?: boolean }

  /**
   * The logger instance
   */
  logger: any

  /**
   * The emitter instance
   */
  emitter: EventEmitter

  /**
   * Get a connection by name
   */
  connection(name?: string): MongoConnectionContract

  /**
   * Pretty print a query
   */
  prettyPrint(query: MongoQueryEventNode): void
}