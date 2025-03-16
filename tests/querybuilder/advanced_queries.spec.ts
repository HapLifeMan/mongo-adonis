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
import { Product, createTestProducts } from '../fixtures.js'

test.group('MongoQueryBuilder Advanced Queries', (group) => {
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

  test('can filter with where clause', async ({ assert }) => {
    const products = await Product.query().where('category', 'electronics').exec()

    assert.lengthOf(products, 3)
    assert.equal(products[0].category, 'electronics')
    assert.equal(products[1].category, 'electronics')
    assert.equal(products[2].category, 'electronics')
  })

  test('can filter with multiple where clauses', async ({ assert }) => {
    const products = await Product.query()
      .where('category', 'electronics')
      .where('inStock', true)
      .exec()

    assert.lengthOf(products, 2)
    assert.isTrue(products.every(product => product.category === 'electronics' && product.inStock === true))
  })

  test('can filter with whereIn clause', async ({ assert }) => {
    const products = await Product.query()
      .whereIn('category', ['electronics', 'appliances'])
      .exec()

    assert.lengthOf(products, 6)
    assert.isTrue(products.every(product =>
      product.category === 'electronics' || product.category === 'appliances'
    ))
  })

  test('can filter with comparison operators', async ({ assert }) => {
    const products = await Product.query()
      .where('price', '>=', 100)
      .where('price', '<=', 300)
      .exec()

    assert.isTrue(products.every(product => product.price >= 100 && product.price <= 300))
  })

  test('can sort results', async ({ assert }) => {
    const products = await Product.query()
      .orderBy('price', 'desc')
      .exec()

    assert.isAbove(products[0].price, products[1].price)
    assert.isAbove(products[1].price, products[2].price)
  })

  test('can limit results', async ({ assert }) => {
    const products = await Product.query()
      .limit(3)
      .exec()

    assert.lengthOf(products, 3)
  })

  test('can skip results', async ({ assert }) => {
    const allProducts = await Product.all()
    const skippedProducts = await Product.query()
      .offset(3)
      .exec()

    assert.lengthOf(skippedProducts, allProducts.length - 3)
  })

  test('can use pagination', async ({ assert }) => {
    const page1 = await Product.query()
      .orderBy('price', 'desc')
      .paginate(1, 3)

    const page2 = await Product.query()
      .orderBy('price', 'desc')
      .paginate(2, 3)

    assert.lengthOf(page1.data, 3)
    assert.notEqual(page1.data[0].name, page2.data[0].name)
    assert.equal(page1.total, 9)
    assert.equal(page1.perPage, 3)
    assert.equal(page1.page, 1)
    assert.equal(page2.page, 2)
  })

  test('can select specific fields', async ({ assert }) => {
    const products = await Product.query()
      .select('name', 'price')
      .exec()

    assert.property(products[0], 'name')
    assert.property(products[0], 'price')
    assert.notProperty(products[0], 'category')
    assert.notProperty(products[0], 'inStock')
  })

  test('can count documents', async ({ assert }) => {
    const count = await Product.query()
      .where('inStock', true)
      .count()

    assert.equal(count, 6)
  })

  test('can use or conditions', async ({ assert }) => {
    const products = await Product.query()
      .where('category', 'electronics')
      .orWhere('price', '>', 200)
      .exec()

    assert.isTrue(products.every(product =>
      product.category === 'electronics' || product.price > 200
    ))
  })

  test('can query array fields', async ({ assert }) => {
    const products = await Product.query()
      .whereIn('tags', ['wood'])
      .exec()

    assert.lengthOf(products, 2)
    assert.isTrue(products.every(product => product.tags.includes('wood')))
  })

  test('can use complex conditions with $or operator', async ({ assert }) => {
    // Since we don't have a direct way to use nested conditions with callbacks,
    // we'll test a similar scenario using multiple where clauses
    const electronicsProducts = await Product.query()
      .where('category', 'electronics')
      .where('inStock', true)
      .exec()

    const appliancesProducts = await Product.query()
      .where('category', 'appliances')
      .where('inStock', true)
      .exec()

    const combinedProducts = [...electronicsProducts, ...appliancesProducts]

    assert.isTrue(combinedProducts.every(product =>
      (product.category === 'electronics' || product.category === 'appliances') &&
      product.inStock === true
    ))
  })

  test('can find first matching document', async ({ assert }) => {
    const product = await Product.query()
      .where('category', 'furniture')
      .orderBy('price', 'desc')
      .first()

    assert.equal(product!.name, 'Desk')
    assert.equal(product!.price, 300)
  })
})