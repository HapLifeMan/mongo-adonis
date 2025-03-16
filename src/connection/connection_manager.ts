/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EventEmitter } from 'node:events'

import * as errors from '../errors.js'
import { MongoConnection } from './connection.js'
import type { MongoConnectionContract, MongoConnectionManagerContract } from '../types/database.js'
import type { MongoDBConnectionConfig } from '../define_config.js'

/**
 * Connection node represents a single connection with its
 * configuration and current state
 */
type ConnectionNode = {
  name: string
  config: MongoDBConnectionConfig
  connection?: MongoConnectionContract
  state: 'registered' | 'open' | 'closed'
}

/**
 * Connection manager exposes the API to manage multiple named connections
 */
export class MongoConnectionManager implements MongoConnectionManagerContract {
  /**
   * A map of registered connections with their config
   */
  private connections: Map<string, ConnectionNode> = new Map()

  constructor(private logger: any, private emitter: EventEmitter) {}

  /**
   * Handles event when a connection is closed
   */
  private handleDisconnect(connection: MongoConnectionContract) {
    const internalConnection = this.get(connection.name)
    if (!internalConnection) {
      return
    }

    this.emitter.emit('mongodb:connection:disconnect', connection)
    internalConnection.state = 'closed'
  }

  /**
   * Handles event when a new connection is added
   */
  private handleConnect(connection: MongoConnectionContract) {
    const internalConnection = this.get(connection.name)
    if (!internalConnection) {
      return
    }

    this.emitter.emit('mongodb:connection:connect', connection)
    internalConnection.state = 'open'
  }

  /**
   * Monitors a given connection by listening for lifecycle events
   */
  private monitorConnection(connection: MongoConnectionContract): void {
    connection.on('disconnect', ($connection) => this.handleDisconnect($connection))
    connection.on('connect', ($connection) => this.handleConnect($connection))
    connection.on('error', (error, $connection) => {
      this.emitter.emit('mongodb:connection:error', [error, $connection])
    })
  }

  /**
   * Add a new connection with its configuration. The connection is not established
   * right away and one must call `connect` to establish the connection.
   */
  add(name: string, config: MongoDBConnectionConfig): MongoConnectionContract {
    /**
     * Return existing connection when exists
     */
    if (this.connections.has(name)) {
      const connection = this.connections.get(name)!
      return connection.connection!
    }

    /**
     * Create a new connection instance
     */
    const connection = new MongoConnection(name, config, this.logger)

    /**
     * Store reference to the connection
     */
    this.connections.set(name, {
      name,
      config,
      connection,
      state: 'registered',
    })

    /**
     * Monitor connection for lifecycle events
     */
    this.monitorConnection(connection)

    return connection
  }

  /**
   * Connect to the database using config for a given named connection
   */
  connect(connectionName: string): void {
    const connection = this.connections.get(connectionName)
    if (!connection) {
      throw new errors.ConnectionNotFoundException(`Connection "${connectionName}" is not registered`)
    }

    /**
     * Ignore when there is already a connection.
     */
    if (this.isConnected(connection.name)) {
      return
    }

    /**
     * Connect to the database
     */
    connection.connection!.connect()
  }

  /**
   * Returns the connection node for a given named connection
   */
  getConnectionNode(connectionName: string): ConnectionNode | undefined {
    return this.connections.get(connectionName)
  }

  /**
   * Returns the connection for a given named connection
   */
  get(connectionName: string): MongoConnectionContract {
    const connection = this.connections.get(connectionName)
    if (!connection) {
      throw new errors.ConnectionNotFoundException(`Connection "${connectionName}" is not registered`)
    }

    return connection.connection!
  }

  /**
   * Returns a boolean telling if we have connection details for
   * a given named connection. This method doesn't tell if
   * connection is connected or not.
   */
  has(connectionName: string): boolean {
    return this.connections.has(connectionName)
  }

  /**
   * Returns a boolean telling if connection has been established
   * with the database or not
   */
  isConnected(connectionName: string): boolean {
    if (!this.has(connectionName)) {
      return false
    }

    const connection = this.getConnectionNode(connectionName)!
    return !!connection.connection && connection.state === 'open'
  }

  /**
   * Close a given connection
   */
  async close(connectionName: string): Promise<void> {
    if (!this.has(connectionName)) {
      return
    }

    const connection = this.getConnectionNode(connectionName)!
    if (!connection.connection) {
      return
    }

    await connection.connection.disconnect()
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    const connections = Array.from(this.connections.keys())
    await Promise.all(connections.map((connection) => this.close(connection)))
  }
}