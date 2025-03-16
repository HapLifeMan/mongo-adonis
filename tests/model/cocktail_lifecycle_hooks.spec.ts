/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for Cocktail model lifecycle hooks
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import {
  Cocktail,
  Price,
  Ingredient,
} from '../fixtures.js'

test.group('Cocktail Lifecycle Hooks', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  // Clean up before each test
  group.each.setup(async () => {
    // Delete all existing cocktails, prices, and ingredients
    await Cocktail.query().delete()
    await Price.query().delete()
    await Ingredient.query().delete()
  })

  test('afterCreate hook automatically creates a price for a new cocktail', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Mai Tai',
      description: 'A cocktail based on rum, Curaçao liqueur, and lime juice',
      instructions: 'Shake all ingredients with ice. Strain into a glass filled with crushed ice.',
      glassType: 'Old Fashioned',
      imageUrl: 'https://example.com/mai-tai.jpg'
    })

    // Verify the cocktail was created
    assert.exists(cocktail)
    assert.equal(cocktail.name, 'Mai Tai')

    // Verify that a price was automatically created via the afterCreate hook
    const price = await cocktail.price.exec()
    assert.exists(price)
    assert.isNumber(price.amount)
    assert.equal(price.currency, 'USD')
    assert.equal(price.cocktailId.toString(), cocktail._id.toString())

    // Verify that the price was created using the relationship method
    // This tests that the hook is using cocktail.price.create() instead of Price.create()
    const allPrices = await Price.all()
    assert.lengthOf(allPrices, 1)
    assert.equal(allPrices[0].cocktailId.toString(), cocktail._id.toString())
  })

  test('beforeDelete hook deletes related price and ingredients', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Cosmopolitan',
      description: 'A cocktail made with vodka, triple sec, cranberry juice, and lime juice',
      instructions: 'Shake all ingredients with ice. Strain into a cocktail glass.',
      glassType: 'Cocktail',
      imageUrl: 'https://example.com/cosmopolitan.jpg'
    })

    // Create ingredients for the cocktail
    await cocktail.ingredients.createMany([
      { name: 'Vodka', quantity: '1.5', unit: 'oz' },
      { name: 'Triple Sec', quantity: '0.5', unit: 'oz' },
      { name: 'Cranberry Juice', quantity: '1', unit: 'oz' },
      { name: 'Fresh Lime Juice', quantity: '0.5', unit: 'oz' }
    ])

    // Verify the ingredients were created
    const ingredients = await cocktail.ingredients.exec()
    assert.lengthOf(ingredients, 4)

    // Verify the price was created
    const price = await cocktail.price.exec()
    assert.exists(price)

    // Count all ingredients and prices before deletion
    const initialIngredientCount = (await Ingredient.all()).length
    const initialPriceCount = (await Price.all()).length

    assert.equal(initialIngredientCount, 4)
    assert.equal(initialPriceCount, 1)

    // Delete the cocktail
    await cocktail.delete()

    // Verify all related ingredients were deleted by the beforeDelete hook
    const remainingIngredients = await Ingredient.all()
    assert.lengthOf(remainingIngredients, 0)

    // Verify the related price was deleted by the beforeDelete hook
    const remainingPrices = await Price.all()
    assert.lengthOf(remainingPrices, 0)
  })

  test('createMany with afterCreate hook creates prices for multiple cocktails', async ({ assert }) => {
    // Create multiple cocktails at once
    const cocktails = await Cocktail.createMany([
      {
        name: 'Martini',
        description: 'A cocktail made with gin and vermouth',
        instructions: 'Stir ingredients with ice. Strain into a chilled cocktail glass.',
        glassType: 'Cocktail',
        imageUrl: 'https://example.com/martini.jpg'
      },
      {
        name: 'Manhattan',
        description: 'A cocktail made with whiskey, sweet vermouth, and bitters',
        instructions: 'Stir ingredients with ice. Strain into a chilled cocktail glass.',
        glassType: 'Cocktail',
        imageUrl: 'https://example.com/manhattan.jpg'
      }
    ])

    // Verify the cocktails were created
    assert.lengthOf(cocktails, 2)

    // Verify that prices were automatically created for each cocktail
    for (const cocktail of cocktails) {
      const price = await cocktail.price.exec()
      assert.exists(price)
      assert.isNumber(price.amount)
      assert.equal(price.currency, 'USD')
      assert.equal(price.cocktailId.toString(), cocktail._id.toString())
    }

    // Verify the total number of prices
    const allPrices = await Price.all()
    assert.lengthOf(allPrices, 2)
  })

  test('deleting multiple cocktails triggers beforeDelete hook for each', async ({ assert }) => {
    // Create multiple cocktails
    const cocktails = await Cocktail.createMany([
      {
        name: 'Bloody Mary',
        description: 'A cocktail containing vodka, tomato juice, and other spices and flavorings',
        instructions: 'Stir ingredients with ice. Pour into a tall glass.',
        glassType: 'Highball',
        imageUrl: 'https://example.com/bloody-mary.jpg'
      },
      {
        name: 'Gin and Tonic',
        description: 'A highball cocktail made with gin and tonic water',
        instructions: 'Pour gin over ice, top with tonic water, and garnish with lime.',
        glassType: 'Highball',
        imageUrl: 'https://example.com/gin-tonic.jpg'
      }
    ])

    // Create ingredients for each cocktail
    for (const cocktail of cocktails) {
      if (cocktail.name === 'Bloody Mary') {
        await cocktail.ingredients.createMany([
          { name: 'Vodka', quantity: '1.5', unit: 'oz' },
          { name: 'Tomato Juice', quantity: '3', unit: 'oz' },
          { name: 'Lemon Juice', quantity: '0.5', unit: 'oz' },
          { name: 'Worcestershire Sauce', quantity: '2', unit: 'dashes' }
        ])
      } else if (cocktail.name === 'Gin and Tonic') {
        await cocktail.ingredients.createMany([
          { name: 'Gin', quantity: '2', unit: 'oz' },
          { name: 'Tonic Water', quantity: '4', unit: 'oz' },
          { name: 'Lime Wedge', quantity: '1', unit: '' }
        ])
      }
    }

    // Verify ingredients and prices were created
    const initialIngredientCount = (await Ingredient.all()).length
    const initialPriceCount = (await Price.all()).length

    assert.equal(initialIngredientCount, 7) // 4 for Bloody Mary + 3 for Gin and Tonic
    assert.equal(initialPriceCount, 2)

    // Delete all cocktails
    for (const cocktail of cocktails) {
      await cocktail.delete()
    }

    // Verify all related ingredients and prices were deleted
    const remainingIngredients = await Ingredient.all()
    const remainingPrices = await Price.all()

    assert.lengthOf(remainingIngredients, 0)
    assert.lengthOf(remainingPrices, 0)
  })
})