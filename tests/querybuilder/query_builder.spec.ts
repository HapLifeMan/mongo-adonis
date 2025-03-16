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

test.group('MongoQueryBuilder', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('can insert a document', async ({ assert }) => {
    const connection = db.connection()
    const collection = connection.collection('test_collection')

    const result = await collection.insertOne({ name: 'Test Document' })
    assert.exists(result.insertedId)
  })

  test('can find documents', async ({ assert }) => {
    const connection = db.connection()
    const collection = connection.collection('test_collection')

    await collection.insertOne({ name: 'Test Document 1' })
    await collection.insertOne({ name: 'Test Document 2' })

    const documents = await collection.find().toArray()
    assert.lengthOf(documents, 3) // Including the one from the previous test
  })
})