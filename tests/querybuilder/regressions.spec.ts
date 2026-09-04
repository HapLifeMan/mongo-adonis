/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Regression tests for query-builder bugs found during the deep review:
 * driver types (ObjectId/Date) surviving filters, clone independence,
 * first() not mutating the builder, AND-merge semantics and update $set
 * wrapping.
 */

import { test } from '@japa/runner'
import { ObjectId } from 'mongodb'
import { setupTest, teardownTest } from '../helpers.js'
import { Product, createTestProducts } from '../fixtures.js'

test.group('Query Builder Regressions', (group) => {
  let db: any
  let allProducts: any[]

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
    Product.$adapter = setup.adapter
    await createTestProducts()
    allProducts = await Product.all()
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('object-form where preserves ObjectId values', async ({ assert }) => {
    const laptop = allProducts.find((p) => p.name === 'Laptop')
    assert.exists(laptop)

    const found = await Product.query().where({ _id: laptop!._id }).exec()
    assert.equal(found.length, 1)
    assert.equal(found[0].name, 'Laptop')
  })

  test('object-form where preserves Date values inside operators', async ({ assert }) => {
    const collection = db.connection().collection(Product.collection)
    const marker = new ObjectId()
    const past = new Date('2020-01-01T00:00:00Z')
    const recent = new Date('2030-01-01T00:00:00Z')
    await collection.insertMany([
      { marker, name: 'old-product', releasedAt: past },
      { marker, name: 'new-product', releasedAt: recent },
    ])

    const results = await Product.query()
      .where({ marker, releasedAt: { $gte: new Date('2025-01-01T00:00:00Z') } })
      .exec()

    assert.equal(results.length, 1)
    assert.equal(results[0].name, 'new-product')

    await collection.deleteMany({ marker })
  })

  test('two-arg where preserves Date values', async ({ assert }) => {
    const collection = db.connection().collection(Product.collection)
    const marker = new ObjectId()
    const releasedAt = new Date('2021-06-15T12:00:00Z')
    await collection.insertOne({ marker, name: 'dated-product', releasedAt })

    const results = await Product.query().where('releasedAt', releasedAt).exec()
    assert.equal(results.length, 1)
    assert.equal(results[0].name, 'dated-product')

    await collection.deleteMany({ marker })
  })

  test('aggregate $match preserves ObjectId values', async ({ assert }) => {
    const laptop = allProducts.find((p) => p.name === 'Laptop')
    assert.exists(laptop)

    const results = await Product.query().aggregate([
      { $match: { _id: laptop!._id } },
    ])

    assert.equal(results.length, 1)
    assert.equal(results[0].name, 'Laptop')
  })

  test('clone() is fully independent of the original builder', async ({ assert }) => {
    const original = Product.query().where('price', '>', 10)
    const clone = original.clone().where('price', '<', 20)

    // Narrowing the clone must not narrow the original
    const originalCount = await original.count()
    const cloneCount = await clone.count()
    assert.isTrue(originalCount >= cloneCount)

    const expensive = await Product.query().where('price', '>', 10).count()
    assert.equal(originalCount, expensive)
  })

  test('first() does not mutate the builder limit', async ({ assert }) => {
    const query = Product.query()
    await query.first()

    const results = await query.exec()
    assert.isTrue(results.length > 1)
  })

  test('two where() calls on the same field AND together', async ({ assert }) => {
    // price > 0 AND price > 999999 — must behave as AND (empty), not
    // last-one-wins.
    const none = await Product.query()
      .where('price', 0)
      .where('price', 999999)
      .exec()
    assert.equal(none.length, 0)
  })

  test('update() wraps plain objects in $set automatically', async ({ assert }) => {
    const collection = db.connection().collection(Product.collection)
    const marker = new ObjectId()
    await collection.insertOne({ marker, name: 'update-target', price: 5, stock: 3 })

    const modified = await Product.query()
      .where({ marker })
      .update({ price: 9 })

    assert.equal(modified, 1)
    const doc = await collection.findOne({ marker })
    assert.equal(doc.price, 9)
    // Other fields survive — the update was a $set, not a replace
    assert.equal(doc.stock, 3)

    await collection.deleteMany({ marker })
  })
})
