/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for additional query builder methods not covered in the advanced queries tests
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import { Product, createTestProducts } from '../fixtures.js'
import { ObjectId } from 'mongodb'

test.group('MongoQueryBuilder Additional Methods', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Seed test data
    await createTestProducts()
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('can use whereNotIn clause', async ({ assert }) => {
    const products = await Product.query()
      .where('category', 'not in', ['electronics', 'furniture'])
      .exec()

    assert.lengthOf(products, 3)
    assert.equal(products[0].category, 'appliances')
    assert.equal(products[1].category, 'appliances')
    assert.equal(products[2].category, 'appliances')
  })

  test('can use whereLike clause', async ({ assert }) => {
    const products = await Product.query()
      .whereLike('name', 'phone')
      .exec()

    assert.lengthOf(products, 2)
    assert.isTrue(products.some(product => product.name === 'Smartphone'))
    assert.isTrue(products.some(product => product.name === 'Headphones'))
  })

  test('can use whereExists clause', async ({ assert }) => {
    // Since all products have a rating, we'll test with a field that only some products have
    const products = await Product.query()
      .where('description', { $exists: true })
      .where('description', { $ne: null })
      .exec()

    assert.lengthOf(products, 6)
    assert.isTrue(products.every(product => product.description !== null))
  })

  test('can use whereNull clause', async ({ assert }) => {
    const products = await Product.query()
      .whereNull('description')
      .exec()

    assert.lengthOf(products, 3)
    assert.isTrue(products.every(product => product.description === null))
  })

  test('can use whereNotNull clause', async ({ assert }) => {
    const products = await Product.query()
      .whereNotNull('description')
      .exec()

    assert.lengthOf(products, 6)
    assert.isTrue(products.every(product => product.description !== null))
  })

  test('can use orWhere clause', async ({ assert }) => {
    const products = await Product.query()
      .where('category', 'electronics')
      .orWhere('price', '>', 200)
      .exec()

    assert.isTrue(products.every(product =>
      product.category === 'electronics' || product.price > 200
    ))
  })

  test('can use orWhere with multiple conditions', async ({ assert }) => {
    const products = await Product.query()
      .where('category', 'electronics')
      .orWhere('price', '>', 200)
      .orWhere('inStock', false)
      .exec()

    assert.isTrue(products.every(product =>
      product.category === 'electronics' ||
      product.price > 200 ||
      product.inStock === false
    ))
  })

  test('can use all method to get all results', async ({ assert }) => {
    const products = await Product.query().all()

    assert.lengthOf(products, 9)
  })

  test('can use update method to update documents', async ({ assert }) => {
    // Create a specific product for testing updates
    const testProduct = await Product.create({
      name: 'Test Product',
      price: 500,
      category: 'test',
      inStock: true,
      tags: ['test'],
      description: 'Test product for update',
      rating: 5.0
    })

    // Update the test product
    const updateCount = await Product.query()
      .where('name', 'Test Product')
      .update({ $set: { price: 600, inStock: false } })

    // Verify the update count
    assert.equal(updateCount, 1)

    // Fetch the updated product
    const updatedProduct = await Product.find(testProduct._id)

    // Verify the product was updated
    assert.exists(updatedProduct)
    assert.equal(updatedProduct!.price, 600)
    assert.equal(updatedProduct!.inStock, false)
  })

  test('can use delete method to delete documents', async ({ assert }) => {
    // Count before deletion
    const countBefore = await Product.query().count()

    // Count out of stock products
    const outOfStockCount = await Product.query()
      .where('inStock', false)
      .count()

    // Delete all out of stock products
    const deleteCount = await Product.query()
      .where('inStock', false)
      .delete()

    // Verify the deletion count matches the number of out of stock products
    assert.equal(deleteCount, outOfStockCount)

    // Verify the total count after deletion
    const countAfter = await Product.query().count()
    assert.equal(countAfter, countBefore - deleteCount)

    // Verify no out of stock products remain
    const remainingOutOfStock = await Product.query()
      .where('inStock', false)
      .count()

    assert.equal(remainingOutOfStock, 0)
  })

  test('can use insert method to insert a document', async ({ assert }) => {
    // Count before insertion
    const countBefore = await Product.query().count()

    // Insert a new product
    const newProductId = await Product.query().insert({
      name: 'Microwave',
      price: 120,
      category: 'appliances',
      inStock: true,
      tags: ['kitchen', 'electric'],
      description: 'Heats food quickly',
      rating: 4.0
    } as any) // Cast to any to fix type error

    // Verify the insertion
    const countAfter = await Product.query().count()
    assert.equal(countAfter, countBefore + 1)

    // Verify the inserted product
    const newProduct = await Product.find(newProductId as unknown as ObjectId)
    assert.exists(newProduct)
    assert.equal(newProduct!.name, 'Microwave')
  })

  test('can use insertMany method to insert multiple documents', async ({ assert }) => {
    // Count before insertion
    const countBefore = await Product.query().count()

    // Insert multiple new products
    const newProductIds = await Product.query().insertMany([
      {
        name: 'Dishwasher',
        price: 400,
        category: 'appliances',
        inStock: true,
        tags: ['kitchen', 'electric'],
        description: 'Cleans dishes automatically',
        rating: 4.2
      } as any, // Use type assertion to fix the linter error
      {
        name: 'Refrigerator',
        price: 800,
        category: 'appliances',
        inStock: true,
        tags: ['kitchen', 'electric'],
        description: 'Keeps food cold',
        rating: 4.5
      } as any // Use type assertion to fix the linter error
    ])

    // Verify the insertion
    const countAfter = await Product.query().count()
    assert.equal(countAfter, countBefore + 2)
    assert.lengthOf(newProductIds, 2)

    // Verify the inserted products
    const newProducts = await Product.query()
      .whereIn('name', ['Dishwasher', 'Refrigerator'])
      .exec()

    assert.lengthOf(newProducts, 2)
    assert.isTrue(newProducts.some(product => product.name === 'Dishwasher'))
    assert.isTrue(newProducts.some(product => product.name === 'Refrigerator'))
  })

  test('can combine multiple where clauses with different operators', async ({ assert }) => {
    const products = await Product.query()
      .where('price', '>=', 100)
      .where('price', '<=', 300)
      .where('inStock', true)
      .whereNotNull('description')
      .exec()

    assert.isTrue(products.every(product =>
      product.price >= 100 &&
      product.price <= 300 &&
      product.inStock === true &&
      product.description !== null
    ))
  })

  test('can use complex filtering with nested conditions', async ({ assert }) => {
    // Find products that are either:
    // 1. Electronics with price > 500, or
    // 2. Furniture that is in stock
    const electronicsProducts = await Product.query()
      .where('category', 'electronics')
      .where('price', '>', 500)
      .exec()

    const furnitureProducts = await Product.query()
      .where('category', 'furniture')
      .where('inStock', true)
      .exec()

    const combinedProducts = [...electronicsProducts, ...furnitureProducts]

    assert.isTrue(combinedProducts.every(product =>
      (product.category === 'electronics' && product.price > 500) ||
      (product.category === 'furniture' && product.inStock === true)
    ))
  })
})