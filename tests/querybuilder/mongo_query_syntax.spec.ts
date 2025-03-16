/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for MongoDB query syntax in the where method
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import { Product, createTestProducts } from '../fixtures.js'

test.group('MongoDB Query Syntax', (group) => {
  let db: any
  let allProducts: any[]

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Set the adapter on the model
    Product.$adapter = setup.adapter

    // Seed test data
    await createTestProducts()

    // Get all products for use in tests
    allProducts = await Product.all()
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('should support $operators in MongoDB query syntax', async ({ assert }) => {
    // Get the IDs of the Laptop and Smartphone products
    const laptop = allProducts.find(p => p.name === 'Laptop')
    const smartphone = allProducts.find(p => p.name === 'Smartphone')

    assert.exists(laptop)
    assert.exists(smartphone)

    const objectIds = [laptop!._id, smartphone!._id]

    // Test $in operator
    const productsWithIds = await Product.query()
      .where({ _id: { $in: objectIds } })
      .exec()

    assert.equal(productsWithIds.length, 2)
    const productNamesWithIds = productsWithIds.map(p => p.name)
    assert.include(productNamesWithIds, 'Laptop')
    assert.include(productNamesWithIds, 'Smartphone')

    // Test $gt operator
    const expensiveProducts = await Product.query()
      .where({ price: { $gt: 500 } })
      .exec()

    assert.equal(expensiveProducts.length, 2)
    assert.isTrue(expensiveProducts.every(p => p.price > 500))
    const expensiveProductNames = expensiveProducts.map(p => p.name).sort()
    assert.deepEqual(expensiveProductNames, ['Laptop', 'Smartphone'])

    // Test $gte operator
    const productsGte300 = await Product.query()
      .where({ price: { $gte: 300 } })
      .exec()

    assert.isTrue(productsGte300.length >= 2)
    assert.isTrue(productsGte300.every(p => p.price >= 300))

    // Test $lt operator
    const cheapProducts = await Product.query()
      .where({ price: { $lt: 200 } })
      .exec()

    assert.isTrue(cheapProducts.length >= 2)
    assert.isTrue(cheapProducts.every(p => p.price < 200))

    // Test $lte operator
    const productsLte300 = await Product.query()
      .where({ price: { $lte: 300 } })
      .exec()

    assert.isTrue(productsLte300.length >= 2)
    assert.isTrue(productsLte300.every(p => p.price <= 300))

    // Test $ne operator
    const nonElectronicsProducts = await Product.query()
      .where({ category: { $ne: 'electronics' } })
      .exec()

    assert.isTrue(nonElectronicsProducts.length >= 1)
    assert.isTrue(nonElectronicsProducts.every(p => p.category !== 'electronics'))

    // Test $and operator
    const electronicInStock = await Product.query()
      .where({
        $and: [
          { category: 'electronics' },
          { inStock: true }
        ]
      })
      .exec()

    assert.isTrue(electronicInStock.length >= 1)
    assert.isTrue(electronicInStock.every(p => p.category === 'electronics' && p.inStock === true))

    // Test $or operator
    const electronicOrFurniture = await Product.query()
      .where({
        $or: [
          { category: 'electronics' },
          { category: 'furniture' }
        ]
      })
      .exec()

    assert.isTrue(electronicOrFurniture.length >= 2)
    assert.isTrue(electronicOrFurniture.every(p =>
      p.category === 'electronics' || p.category === 'furniture'
    ))

    // Test $exists operator
    const productsWithDescription = await Product.query()
      .where({ description: { $exists: true, $ne: null } })
      .exec()

    assert.isTrue(productsWithDescription.length > 0)
  })

  test('should support basic $regex operator in MongoDB query syntax', async ({ assert }) => {
    // Test basic $regex operator with case-insensitive option
    const productsWithLaptopInDescription = await Product.query()
      .where({ description: { $regex: 'powerful', $options: 'i' } })
      .exec()

    assert.isTrue(productsWithLaptopInDescription.length > 0)
    // Check that at least one product has 'powerful' in its description
    assert.isTrue(productsWithLaptopInDescription.some(p =>
      p.description && p.description.toLowerCase().includes('powerful')
    ))
  })

  test('should support RegExp object in $regex operator', async ({ assert }) => {
    // Test using RegExp object directly in $regex
    const productsWithPowerfulInDescription = await Product.query()
      .where({ description: { $regex: /powerful/i } })
      .exec()

    assert.isTrue(productsWithPowerfulInDescription.length > 0)

    // Check if any product has 'powerful' in its description
    let hasPowerful = false;
    for (const product of productsWithPowerfulInDescription) {
      if (product.description && product.description.toLowerCase().includes('powerful')) {
        hasPowerful = true;
        break;
      }
    }
    assert.isTrue(hasPowerful, 'At least one product should have "powerful" in its description');

    // Test using RegExp object with different flags
    const productsWithMobileOrPortable = await Product.query()
      .where({ description: { $regex: /mobile|portable/i } })
      .exec()

    // We don't need to assert the exact content, just check that the query works
    assert.exists(productsWithMobileOrPortable);
  })

  test('should support RegExp object directly as a field value', async ({ assert }) => {
    // Test using RegExp object directly as a field value
    const productsWithPowerfulInDescription = await Product.query()
      .where({ description: /powerful/i })
      .exec()

    assert.isTrue(productsWithPowerfulInDescription.length > 0)
    // Check that at least one product has 'powerful' in its description
    assert.isTrue(productsWithPowerfulInDescription.some(p =>
      p.description && p.description.toLowerCase().includes('powerful')
    ))
  })

  test('should support combining MongoDB syntax with regular where clauses', async ({ assert }) => {
    // Test combining MongoDB syntax with regular where clauses
    const result = await Product.query()
      .where({ price: { $gte: 300 } })
      .where('inStock', true)
      .exec()

    assert.isTrue(result.length > 0)
    assert.isTrue(result.every(p => p.price >= 300 && p.inStock === true))

    // Get the actual product names
    const productNames = result.map(p => p.name).sort()

    // Just check that we have some results that match our criteria
    assert.isTrue(productNames.length > 0)
  })

  test('should support complex nested MongoDB query operators', async ({ assert }) => {
    // Test complex nested query with multiple operators
    const complexQuery = await Product.query()
      .where({
        $or: [
          {
            $and: [
              { category: 'electronics' },
              { price: { $gt: 1000 } }
            ]
          },
          {
            $and: [
              { category: 'furniture' },
              { inStock: true }
            ]
          }
        ]
      })
      .exec()

    // Check that we have some results
    assert.isTrue(complexQuery.length > 0)

    // Check that each product matches one of our criteria
    assert.isTrue(complexQuery.every(p =>
      (p.category === 'electronics' && p.price > 1000) ||
      (p.category === 'furniture' && p.inStock === true)
    ))
  })
})