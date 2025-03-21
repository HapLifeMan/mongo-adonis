/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import { initMongoDBClient } from '../../src/db.js'

// This test group demonstrates usage of the exported db singleton
test.group('MongoDB Exported Singleton', (group) => {
  let testDb: any

  group.setup(async () => {
    const setup = await setupTest()
    testDb = setup.db

    // Initialize the singleton
    initMongoDBClient(testDb)
  })

  group.teardown(async () => {
    await teardownTest(testDb)
  })

  test('can use exported db singleton', async ({ assert }) => {
    // Import the exported db singleton
    const { db } = await import('../../src/mongodb.js')

    // Use it to insert a document
    await db.test_singleton.insertOne({
      name: 'Direct Access Example',
      features: ['dot notation', 'direct access', 'concise syntax']
    })

    // Query using the singleton
    const doc = await db.test_singleton.findOne({ name: 'Direct Access Example' })

    // Verify the result
    assert.exists(doc)
    if (doc) {
      assert.equal(doc.name, 'Direct Access Example')
      assert.isArray(doc.features)
      assert.lengthOf(doc.features, 3)
      assert.include(doc.features, 'dot notation')
    }

    // Clean up
    await db.test_singleton.deleteOne({ name: 'Direct Access Example' })
  })

})