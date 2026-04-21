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
  private _connecting: Promise<void> | null = null

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
   * Connect to the MongoDB server.
   * Idempotent: concurrent callers share a single in-flight handshake.
   */
  async connect(): Promise<void> {
    if (this.isReady) {
      return
    }
    if (this._connecting) {
      return this._connecting
    }

    this._connecting = this.performConnect().finally(() => {
      this._connecting = null
    })
    return this._connecting
  }

  private async performConnect(): Promise<void> {
    try {
      const uri = this.buildConnectionUri()

      this.logger.trace({ connection: this.name }, 'connecting to MongoDB server')

      const pool = this.config.pool || {}
      const maxPoolSize = pool.max ?? 10
      const minPoolSize = pool.min ?? 1
      if (minPoolSize > maxPoolSize) {
        throw new errors.ConnectionRefusedException(
          `Invalid pool config for "${this.name}": min (${minPoolSize}) cannot exceed max (${maxPoolSize})`
        )
      }

      const options = {
        ...(this.config.connection?.options || {}),
        maxPoolSize,
        minPoolSize,
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
      if (error instanceof errors.ConnectionRefusedException) {
        throw error
      }
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