/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for Cocktail, Price, and Ingredient relationships and hooks
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import {
  Cocktail,
  Price,
  Ingredient,
} from '../fixtures.js'

test.group('Cocktail Relationships and Hooks', (group) => {
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

  test('automatically creates a price when a cocktail is created', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Piña Colada',
      description: 'A sweet cocktail made with rum, coconut cream, and pineapple juice',
      instructions: 'Blend all ingredients with ice until smooth. Serve in a chilled glass.',
      glassType: 'Hurricane',
      imageUrl: 'https://example.com/pina-colada.jpg'
    })

    // Verify the cocktail was created
    assert.exists(cocktail)
    assert.equal(cocktail.name, 'Piña Colada')

    // Verify that a price was automatically created
    const price = await cocktail.price.exec()
    assert.exists(price)
    assert.isNumber(price.amount)
    assert.equal(price.currency, 'USD')
    assert.equal(price.cocktailId.equals(cocktail._id), true)
  })

  test('can create ingredients for a cocktail', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Daiquiri',
      description: 'A family of cocktails whose main ingredients are rum, citrus juice, and sugar',
      instructions: 'Shake ingredients with ice. Strain into a chilled cocktail glass.',
      glassType: 'Cocktail',
      imageUrl: 'https://example.com/daiquiri.jpg'
    })

    // Create ingredients for the cocktail
    const ingredients = await cocktail.ingredients.createMany([
      { name: 'White Rum', quantity: '2', unit: 'oz' },
      { name: 'Fresh Lime Juice', quantity: '1', unit: 'oz' },
      { name: 'Simple Syrup', quantity: '0.5', unit: 'oz' }
    ])

    // Verify the ingredients were created
    assert.lengthOf(ingredients, 3)
    assert.equal(ingredients[0].name, 'White Rum')
    assert.equal(ingredients[1].name, 'Fresh Lime Juice')
    assert.equal(ingredients[2].name, 'Simple Syrup')

    // Verify the relationship
    const cocktailIngredients = await cocktail.ingredients.exec()
    assert.lengthOf(cocktailIngredients, 3)

    // Verify each ingredient has the correct cocktailId
    for (const ingredient of cocktailIngredients) {
      assert.equal(ingredient.cocktailId.equals(cocktail._id), true)
    }
  })

  test('deletes related price and ingredients when a cocktail is deleted', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Moscow Mule',
      description: 'A cocktail made with vodka, spicy ginger beer, and lime juice',
      instructions: 'Combine vodka and lime juice in a copper mug filled with ice. Top with ginger beer.',
      glassType: 'Copper Mug',
      imageUrl: 'https://example.com/moscow-mule.jpg'
    })

    // Create ingredients for the cocktail
    await cocktail.ingredients.createMany([
      { name: 'Vodka', quantity: '2', unit: 'oz' },
      { name: 'Ginger Beer', quantity: '4', unit: 'oz' },
      { name: 'Fresh Lime Juice', quantity: '0.5', unit: 'oz' }
    ])

    // Get the price and ingredients IDs for later verification
    const price = await cocktail.price.exec()
    const ingredients = await cocktail.ingredients.exec()

    const priceId = price._id
    const ingredientIds = ingredients.map((ing: Ingredient) => ing._id)

    // Delete the cocktail
    await cocktail.delete()

    // Verify the price was deleted
    const deletedPrice = await Price.find(priceId)
    assert.isNull(deletedPrice)

    // Verify all ingredients were deleted
    for (const id of ingredientIds) {
      const deletedIngredient = await Ingredient.find(id)
      assert.isNull(deletedIngredient)
    }
  })

  test('can retrieve a cocktail with its price and ingredients', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Whiskey Sour',
      description: 'A mixed drink containing whiskey, lemon juice, sugar, and optionally, a dash of egg white',
      instructions: 'Shake ingredients with ice. Strain into a rocks glass over fresh ice.',
      glassType: 'Rocks',
      imageUrl: 'https://example.com/whiskey-sour.jpg'
    })

    // Create ingredients for the cocktail
    await cocktail.ingredients.createMany([
      { name: 'Bourbon', quantity: '2', unit: 'oz' },
      { name: 'Fresh Lemon Juice', quantity: '0.75', unit: 'oz' },
      { name: 'Simple Syrup', quantity: '0.75', unit: 'oz' },
      { name: 'Egg White', quantity: '0.5', unit: 'oz', optional: true }
    ])

    // Retrieve the cocktail with its relationships
    const retrievedCocktail = await Cocktail.find(cocktail._id)
    assert.exists(retrievedCocktail)

    // Load the relationships
    const price = await retrievedCocktail!.price.exec()
    const ingredients = await retrievedCocktail!.ingredients.exec()

    // Verify the price
    assert.exists(price)
    assert.isNumber(price.amount)
    assert.equal(price.currency, 'USD')

    // Verify the ingredients
    assert.lengthOf(ingredients, 4)
    assert.isTrue(ingredients.some((ing: Ingredient) => ing.name === 'Bourbon'))
    assert.isTrue(ingredients.some((ing: Ingredient) => ing.name === 'Fresh Lemon Juice'))
    assert.isTrue(ingredients.some((ing: Ingredient) => ing.name === 'Simple Syrup'))
    assert.isTrue(ingredients.some((ing: Ingredient) => ing.name === 'Egg White'))
  })

  test('updates the price of a cocktail', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Negroni',
      description: 'A popular Italian cocktail made with gin, vermouth rosso, and Campari',
      instructions: 'Stir ingredients with ice. Strain into a rocks glass over fresh ice. Garnish with orange peel.',
      glassType: 'Rocks',
      imageUrl: 'https://example.com/negroni.jpg'
    })

    // Get the automatically created price
    let price = await cocktail.price.exec()
    assert.exists(price)

    // Update the price
    price.amount = 12.50
    price.currency = 'EUR'
    await price.save()

    // Retrieve the updated price
    const updatedPrice = await cocktail.price.exec()
    assert.equal(updatedPrice.amount, 12.50)
    assert.equal(updatedPrice.currency, 'EUR')
  })

  test('can retrieve a cocktail with its ingredients', async ({ assert }) => {
    // Create a new cocktail
    const cocktail = await Cocktail.create({
      name: 'Moscow Mule',
      description: 'A cocktail made with vodka, spicy ginger beer, and lime juice',
      instructions: 'Combine vodka and lime juice in a copper mug filled with ice. Top with ginger beer.',
      glassType: 'Copper Mug',
      imageUrl: 'https://example.com/moscow-mule.jpg'
    })

    // Create ingredients for the cocktail
    await cocktail.ingredients.createMany([
      { name: 'Vodka', quantity: '2', unit: 'oz' },
      { name: 'Ginger Beer', quantity: '4', unit: 'oz' },
      { name: 'Fresh Lime Juice', quantity: '0.5', unit: 'oz' }
    ])

    // Retrieve the cocktail with its ingredients
    const retrievedCocktail = await Cocktail.find(cocktail._id)
    assert.exists(retrievedCocktail)

    // Load the ingredients
    const ingredients = await retrievedCocktail!.ingredients.exec()

    // Verify the ingredients are correctly associated with the cocktail
    const firstIngredient = ingredients[0]
    assert.equal(firstIngredient.name, 'Vodka')
    assert.equal(firstIngredient.quantity, '2')
    assert.equal(firstIngredient.unit, 'oz')
    assert.equal(firstIngredient.cocktailId.equals(cocktail._id), true)
  })
})