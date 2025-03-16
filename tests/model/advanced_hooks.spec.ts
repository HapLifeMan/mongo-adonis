/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ObjectId } from 'mongodb'
import { MongoModel, column } from '../../src/model/main.js'
import { setupTest, teardownTest } from '../helpers.js'

/**
 * Test model with asynchronous hooks
 */
class AsyncHookModel extends MongoModel {
  public static collection = 'async_hook_models'

  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public name!: string

  @column()
  public email!: string

  @column()
  public processed!: boolean

  @column()
  public created_at!: Date

  @column()
  public updated_at!: Date

  /**
   * Async before create hook
   */
  public static async beforeCreate(model: AsyncHookModel): Promise<void> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Validate email
    if (!model.email.includes('@')) {
      throw new Error('Invalid email address')
    }

    model.created_at = new Date()
    model.updated_at = new Date()
  }

  /**
   * Async before update hook
   */
  public static async beforeUpdate(model: AsyncHookModel): Promise<void> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Validate email if changed
    if (model.email !== model.$original.email && !model.email.includes('@')) {
      throw new Error('Invalid email address')
    }

    model.updated_at = new Date()
  }

  /**
   * Async after create hook
   */
  public static async afterCreate(model: AsyncHookModel): Promise<void> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Mark as processed
    model.processed = true
  }

  /**
   * Async after update hook
   */
  public static async afterUpdate(model: AsyncHookModel): Promise<void> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Mark as processed
    model.processed = true
  }
}

test.group('Advanced Model Hooks', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Set the adapter on the model
    AsyncHookModel.$adapter = setup.adapter
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('async beforeCreate hook is called and can validate data', async ({ assert }) => {
    const model = new AsyncHookModel()
    model.name = 'Test Model'
    model.email = 'invalid-email' // Invalid email without @

    try {
      await model.save()
      assert.fail('Should have thrown an error for invalid email')
    } catch (error) {
      assert.equal((error as Error).message, 'Invalid email address')
    }

    // Now with valid email
    model.email = 'valid@example.com'
    await model.save()

    // Assert that the beforeCreate hook was called
    assert.instanceOf(model.created_at, Date)
    assert.instanceOf(model.updated_at, Date)
  })

  test('async beforeUpdate hook is called and can validate data', async ({ assert }) => {
    // Create a model with valid email
    const model = new AsyncHookModel()
    model.name = 'Test Model'
    model.email = 'valid@example.com'
    await model.save()

    // Try to update with invalid email
    model.email = 'invalid-email'

    try {
      await model.save()
      assert.fail('Should have thrown an error for invalid email')
    } catch (error) {
      assert.equal((error as Error).message, 'Invalid email address')
    }

    // Update with valid email
    model.email = 'updated@example.com'
    const originalUpdatedAt = model.updated_at

    // Wait a bit to ensure the timestamps are different
    await new Promise((resolve) => setTimeout(resolve, 20))

    await model.save()

    // Assert that the beforeUpdate hook was called
    assert.notEqual(model.updated_at.getTime(), originalUpdatedAt.getTime())
  })

  test('async afterCreate hook is called and can modify the model', async ({ assert }) => {
    const model = new AsyncHookModel()
    model.name = 'Test Model'
    model.email = 'test@example.com'
    model.processed = false

    // Save the model
    await model.save()

    // Assert that the afterCreate hook was called and modified the model
    assert.isTrue(model.processed)
  })

  test('async afterUpdate hook is called and can modify the model', async ({ assert }) => {
    // Create a model
    const model = new AsyncHookModel()
    model.name = 'Test Model'
    model.email = 'test@example.com'
    model.processed = false
    await model.save()

    // Reset the processed flag
    model.processed = false

    // Update the model
    model.name = 'Updated Test Model'
    await model.save()

    // Assert that the afterUpdate hook was called and modified the model
    assert.isTrue(model.processed)
  })

  test('hooks are executed in the correct order', async ({ assert }) => {
    // Create a model with hooks that track execution order
    const executionOrder: string[] = []

    class OrderTrackingModel extends MongoModel {
      public static collection = 'order_tracking_models'

      @column({ isPrimary: true })
      public _id!: ObjectId

      @column()
      public name!: string

      public static async beforeCreate(_model: OrderTrackingModel): Promise<void> {
        executionOrder.push('beforeCreate')
      }

      public static async afterCreate(_model: OrderTrackingModel): Promise<void> {
        executionOrder.push('afterCreate')
      }

      public static async beforeUpdate(_model: OrderTrackingModel): Promise<void> {
        executionOrder.push('beforeUpdate')
      }

      public static async afterUpdate(_model: OrderTrackingModel): Promise<void> {
        executionOrder.push('afterUpdate')
      }
    }

    // Set the adapter on the model
    OrderTrackingModel.$adapter = AsyncHookModel.$adapter

    // Create a new model
    const model = new OrderTrackingModel()
    model.name = 'Test Model'
    await model.save()

    // Assert that create hooks were executed in the correct order
    assert.deepEqual(executionOrder, ['beforeCreate', 'afterCreate'])

    // Reset execution order
    executionOrder.length = 0

    // Update the model
    model.name = 'Updated Test Model'
    await model.save()

    // Assert that update hooks were executed in the correct order
    assert.deepEqual(executionOrder, ['beforeUpdate', 'afterUpdate'])
  })
})