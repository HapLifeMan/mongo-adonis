/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { configure, run } from '@japa/runner'
import { assert } from '@japa/assert'

console.log('Setting up tests with MongoDB connection...')
console.log(`Connection to ${process.env.MONGODB_HOST || '127.0.0.1'}:${process.env.MONGODB_PORT || '27017'}/${process.env.MONGODB_DATABASE || 'adonis_test'}...`)

// Configure tests
configure({
  files: ['build/tests/**/*.spec.js'],
  plugins: [assert()],
  importer: (filePath) => import(filePath.toString()),
})

// Run tests
run().then(() => {
  process.exit(0)
}).catch(() => {
  process.exit(1)
})