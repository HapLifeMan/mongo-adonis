/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import kleur from 'kleur'
import prettyHrtime from 'pretty-hrtime'
import { EventEmitter } from 'node:events'

import { MongoConnectionManager } from './connection_manager.js'
import type { MongoConnectionContract, MongoDatabaseContract, MongoQueryEventNode } from '../types/database.js'
import type { MongoDBConfig } from '../define_config.js'

/**
 * Database class exposes the API to manage multiple connections and execute
 * queries against one or more connections.
 */
export class MongoDatabase implements MongoDatabaseContract {
  /**
   * Connection manager to manage multiple named connections
   */
  public manager: MongoConnectionManager

  /**
   * Default connection name
   */
  private defaultConnectionName: string

  constructor(
    public config: MongoDBConfig & { prettyPrintDebugQueries?: boolean },
    public logger: any,
    public emitter: EventEmitter
  ) {
    this.defaultConnectionName = config.connection
    this.manager = new MongoConnectionManager(logger, emitter)

    /**
     * Register connections
     */
    Object.keys(config.connections).forEach((name) => {
      this.manager.add(name, config.connections[name])
    })
  }

  /**
   * Returns connection for a specific name or the default connection
   */
  connection(name?: string): MongoConnectionContract {
    const connectionName = name || this.defaultConnectionName
    const connection = this.manager.get(connectionName)

    /**
     * Connect when not already connected
     */
    if (!this.manager.isConnected(connectionName)) {
      this.manager.connect(connectionName)
    }

    return connection
  }

  /**
   * Pretty print query
   */
  prettyPrint(query: MongoQueryEventNode): void {
    const { connection, duration, query: queryObject, error } = query
    const time = prettyHrtime(duration)

    /**
     * Print error
     */
    if (error) {
      console.log(`${kleur.red('error:')} ${error.message}`)
      console.log('')
      return
    }

    /**
     * Print query
     */
    console.log(`${kleur.magenta('mongo:')} ${connection}`)
    console.log(`${kleur.gray('query:')} ${JSON.stringify(queryObject, null, 2)}`)
    console.log(`${kleur.gray('time:')} ${time}`)
    console.log('')
  }
}