/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defineConfig } from './define_config.js'

/**
 * Configuration for the MongoDB adapter
 */
export default defineConfig({
  connection: 'mongodb',
  connections: {
    mongodb: {
      client: 'mongodb',
      connection: {
        host: process.env.MONGODB_HOST || '127.0.0.1',
        port: Number(process.env.MONGODB_PORT || 27017),
        user: process.env.MONGODB_USER,
        password: process.env.MONGODB_PASSWORD,
        database: process.env.MONGODB_DATABASE || 'adonis',
        authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
      },
    },
  },
})