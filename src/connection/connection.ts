/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events'
import { MongoClient, Collection, Db, Document } from 'mongodb'

import * as errors from '../errors.js'
import type { MongoConnectionContract } from '../types/database.js'
import type { MongoDBConnectionConfig } from '../define_config.js'

/**
 * MongoDB connection class manages a given database connection.
 * It uses the official MongoDB driver to establish and manage connections.
 */
export class MongoConnection extends EventEmitter implements MongoConnectionContract {
  /**
   * MongoDB client instance
   */
  public client!: MongoClient

  /**
   * MongoDB database instance
   */
  public db!: Db

  /**
   * Connection state
   */
  public state: 'registered' | 'open' | 'closed' = 'registered'
  private _isReady: boolean = false
  private _isClosed: boolean = false

  constructor(
    public name: string,
    private config: MongoDBConnectionConfig,
    private logger: any
  ) {
    super()
  }

  /**
   * Returns a boolean indicating if the connection is ready for making
   * database queries.
   */
  get isReady(): boolean {
    return this._isReady
  }

  /**
   * Returns a boolean indicating if the connection is closed.
   */
  get isClosed(): boolean {
    return this._isClosed
  }

  /**
   * Get a collection from the database
   */
  collection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.isReady) {
      throw new errors.ConnectionRefusedException(
        `Cannot access collection "${name}" because connection "${this.name}" is not ready`
      )
    }

    return this.db.collection<T>(name)
  }

  /**
   * Build the MongoDB connection URI from the config
   */
  private buildConnectionUri(): string {
    if (this.config.connectionString) {
      return this.config.connectionString
    }

    const connection = this.config.connection || {}

    const auth = connection.user && connection.password
      ? `${encodeURIComponent(connection.user)}:${encodeURIComponent(connection.password)}@`
      : ''

    const host = connection.host || '127.0.0.1'
    const port = connection.port || 27017
    const database = connection.database || 'admin'
    const authSource = connection.authSource || 'admin'

    return `mongodb://${auth}${host}:${port}/${database}?authSource=${authSource}`
  }

  /**
   * Connect to the MongoDB server
   */
  async connect(): Promise<void> {
    if (this.isReady) {
      return
    }

    try {
      const uri = this.buildConnectionUri()

      this.logger.trace({ connection: this.name }, 'connecting to MongoDB server')

      const options = {
        ...(this.config.connection?.options || {}),
        maxPoolSize: this.config.pool?.max || 100,
        minPoolSize: this.config.pool?.min || 5,
        maxIdleTimeMS: 60000,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
      }

      this.client = new MongoClient(uri, options)
      await this.client.connect()

      this.db = this.client.db()

      this._isReady = true
      this._isClosed = false

      this.logger.trace({ connection: this.name }, 'connected to MongoDB server')

      this.emit('connect', this)
    } catch (error) {
      this.logger.error(
        { connection: this.name, error: error.message },
        'unable to connect to MongoDB server'
      )

      this.emit('error', error, this)
      throw new errors.ConnectionRefusedException(
        `Unable to connect to MongoDB server: ${error.message}`,
        { cause: error }
      )
    }
  }

  /**
   * Disconnect from the MongoDB server
   */
  async disconnect(): Promise<void> {
    if (!this.client || this._isClosed) {
      return
    }

    try {
      this.logger.trace({ connection: this.name }, 'disconnecting from MongoDB server')

      await this.client.close()

      this._isReady = false
      this._isClosed = true

      this.logger.trace({ connection: this.name }, 'disconnected from MongoDB server')

      this.emit('disconnect', this)
    } catch (error) {
      this.logger.error(
        { connection: this.name, error: error.message },
        'unable to disconnect from MongoDB server'
      )

      this.emit('error', error, this)
      throw error
    }
  }
}