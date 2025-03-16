/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'

import { MongoDatabase } from '../src/connection/database.js'
import { MongoAdapter } from '../src/model/adapter.js'
import { MongoQueryClient } from '../src/querybuilder/query_client.js'
import { MongoModel } from '../src/model/base_model.js'
import type { MongoConnectionContract, MongoQueryEventNode } from '../src/types/database.js'
import type { MongoDBConfig } from '../src/define_config.js'

/**
 * Extending AdonisJS types
 */
declare module '@adonisjs/core/types' {
  export interface ContainerBindings {
    'lucid.mongodb': MongoDatabase
  }
  export interface EventsList {
    'mongodb:query': MongoQueryEventNode
    'mongodb:connection:connect': MongoConnectionContract
    'mongodb:connection:disconnect': MongoConnectionContract
    'mongodb:connection:error': [Error, MongoConnectionContract]
  }
}

/**
 * MongoDB database service provider
 */
export default class MongoDBServiceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Registers repl bindings when running the application
   * in the REPL environment
   */
  protected async registerReplBindings() {
    // TODO: Implement repl bindings
  }

  /**
   * Register TestUtils database macro
   */
  protected async registerTestUtils() {
    // TODO: Implement test utils
  }

  /**
   * Registeres a listener to pretty print debug queries
   */
  protected async prettyPrintDebugQueries(db: MongoDatabase) {
    if (db.config.prettyPrintDebugQueries) {
      const emitter = await this.app.container.make('emitter')
      emitter.on('mongodb:query', db.prettyPrint)
    }
  }

  /**
   * Invoked by AdonisJS to register container bindings
   */
  register() {
    this.app.container.singleton(MongoDatabase, async (resolver) => {
      const config = this.app.config.get<MongoDBConfig>('mongodb')
      const emitter = await resolver.make('emitter')
      const logger = await resolver.make('logger')
      const db = new MongoDatabase(config, logger, emitter as any)
      return db
    })

    this.app.container.singleton(MongoQueryClient, async (resolver) => {
      const db = await resolver.make('lucid.mongodb')
      return db.connection() as unknown as MongoQueryClient
    })

    this.app.container.alias('lucid.mongodb', MongoDatabase)
  }

  /**
   * Invoked by AdonisJS to extend the framework or pre-configure
   * objects
   */
  async boot() {
    const db = await this.app.container.make('lucid.mongodb')
    MongoModel.$adapter = new MongoAdapter(db)

    // Force connection initialization before application starts handling requests
    const defaultConnection = db.connection()
    await defaultConnection.connect()

    await this.prettyPrintDebugQueries(db)
    // await this.registerTestUtils()
    // await this.registerReplBindings()
  }

  /**
   * Gracefully close connections during shutdown
   */
  async shutdown() {
    const db = await this.app.container.make('lucid.mongodb')
    await db.manager.closeAll()
  }
}