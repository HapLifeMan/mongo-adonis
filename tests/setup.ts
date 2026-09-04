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

// Load .env.test when present (available since Node 20.12); shell env wins.
try {
  process.loadEnvFile(new URL('../.env.test', import.meta.url).pathname)
} catch {
  // No .env.test file — rely on shell environment and defaults below.
}

console.log('Setting up tests with MongoDB connection...')
console.log(`Connection to ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '27017'}/${process.env.DB_TEST_DATABASE || 'adonis_test'}...`)

// Configure tests. Specs run from source via the ts-node loader registered
// in loader.js — no build step required before `npm test`.
configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert()],
  importer: (filePath) => import(filePath.toString()),
})

// Run tests. Japa sets process.exitCode to 1 when tests fail — honor it
// instead of forcing 0.
run().then(() => {
  process.exit(process.exitCode ?? 0)
}).catch(() => {
  process.exit(1)
})
