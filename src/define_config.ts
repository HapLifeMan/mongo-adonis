/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * MongoDB connection config
 */
export type MongoDBConnectionConfig = {
  /**
   * MongoDB client name. Always 'mongodb'
   */
  client: 'mongodb'

  /**
   * Connection string for MongoDB
   */
  connectionString?: string

  /**
   * Connection details
   */
  connection?: {
    /**
     * Database host
     */
    host?: string

    /**
     * Database port
     */
    port?: number

    /**
     * Database username
     */
    user?: string

    /**
     * Database password
     */
    password?: string

    /**
     * Database name
     */
    database?: string

    /**
     * Authentication source
     */
    authSource?: string

    /**
     * Connection options
     */
    options?: Record<string, any>
  }

  /**
   * Pool configuration
   */
  pool?: {
    /**
     * Min connections in pool
     */
    min?: number

    /**
     * Max connections in pool
     */
    max?: number
  }

  /**
   * Health check configuration
   */
  healthCheck?: boolean

  /**
   * Debug mode
   */
  debug?: boolean
}

/**
 * MongoDB config
 */
export type MongoDBConfig = {
  /**
   * Default connection to use
   */
  connection: string

  /**
   * Map of connection configurations
   */
  connections: Record<string, MongoDBConnectionConfig>
}

/**
 * Define MongoDB configuration
 */
export function defineConfig(config: MongoDBConfig): MongoDBConfig {
  return config
}