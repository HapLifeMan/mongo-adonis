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

test.group('MongoConnection', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('can connect to MongoDB', async ({ assert }) => {
    const connection = db.connection()
    assert.isTrue(connection.isReady)
    assert.isFalse(connection.isClosed)
  })

  test('can get a collection', async ({ assert }) => {
    const connection = db.connection()
    const collection = connection.collection('test_collection')
    assert.exists(collection)
  })

  test('can disconnect from MongoDB', async ({ assert }) => {
    const connection = db.connection()
    await connection.disconnect()
    assert.isFalse(connection.isReady)
    assert.isTrue(connection.isClosed)
  })
})