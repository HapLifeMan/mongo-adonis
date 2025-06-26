/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for automatic timestamp functionality (createdAt/updatedAt)
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import { MongoModel } from '../../src/model/base_model.js'
import { column } from '../../src/model/main.js'
import { ObjectId } from 'mongodb'

// Type alias for DateTime to represent Date objects
type DateTime = Date;

// Create test models with different timestamp configurations
class DefaultTimestampModel extends MongoModel {
  static collection = 'default_timestamps'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column.dateTime({ columnName: 'created_at', autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

class CustomTimestampModel extends MongoModel {
  static collection = 'custom_timestamps'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column.dateTime({ columnName: 'createdAt', autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ columnName: 'updatedAt', autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

class DisabledTimestampModel extends MongoModel {
  static collection = 'disabled_timestamps'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  // No timestamp fields defined
}

test.group('Model Timestamps', (group) => {
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
    await DefaultTimestampModel.truncate()
    await CustomTimestampModel.truncate()
    await DisabledTimestampModel.truncate()
  })

  test('default model sets created_at and updated_at on creation', async ({ assert }) => {
    const beforeCreate = new Date()

    // Wait a small amount to ensure timestamp difference is noticeable
    await new Promise(resolve => setTimeout(resolve, 5))

    const model = await DefaultTimestampModel.create({ name: 'Test Model' })

    await new Promise(resolve => setTimeout(resolve, 5))
    const afterCreate = new Date()

    // Verify timestamps exist and are Date objects
    assert.exists(model.createdAt)
    assert.exists(model.updatedAt)
    assert.instanceOf(model.createdAt, Date)
    assert.instanceOf(model.updatedAt, Date)

    // Verify timestamps are within expected time range
    assert.isTrue(model.createdAt >= beforeCreate)
    assert.isTrue(model.createdAt <= afterCreate)

    // On creation, createdAt and updatedAt should be equal
    assert.deepEqual(model.createdAt, model.updatedAt)
  })

  test('default model updates only updatedAt on update', async ({ assert }) => {
    const model = await DefaultTimestampModel.create({ name: 'Original Name' })
    const createdAt = model.createdAt

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10))

    // Update the model
    model.name = 'Updated Name'
    await model.save()

    // Verify createdAt hasn't changed
    assert.deepEqual(model.createdAt, createdAt)

    // Verify updatedAt has been updated and is more recent
    assert.instanceOf(model.updatedAt, Date)
    assert.isTrue(model.updatedAt > model.createdAt)
  })

  test('custom timestamp model uses custom column names', async ({ assert }) => {
    const model = await CustomTimestampModel.create({ name: 'Custom Model' })

    // Verify custom timestamp column names
    assert.exists(model.createdAt)
    assert.exists(model.updatedAt)
    assert.instanceOf(model.createdAt, Date)
    assert.instanceOf(model.updatedAt, Date)

    // Verify standard column names don't exist
    assert.notExists(model.created_at)
    assert.notExists(model.updated_at)

    // On creation, createdAt and updatedAt should be equal
    assert.deepEqual(model.createdAt, model.updatedAt)
  })

  test('custom timestamp model updates only updatedAt on update', async ({ assert }) => {
    const model = await CustomTimestampModel.create({ name: 'Original Custom Name' })
    const createdAt = model.createdAt

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10))

    // Update the model
    model.name = 'Updated Custom Name'
    await model.save()

    // Verify createdAt hasn't changed
    assert.deepEqual(model.createdAt, createdAt)

    // Verify updatedAt has been updated and is more recent
    assert.instanceOf(model.updatedAt, Date)
    assert.isTrue(model.updatedAt > model.createdAt)
  })

  test('disabled timestamp model does not set timestamp fields', async ({ assert }) => {
    const model = await DisabledTimestampModel.create({ name: 'No Timestamps' })

    // Verify timestamp fields don't exist
    assert.notExists(model.created_at)
    assert.notExists(model.updated_at)
    assert.notExists(model.createdAt)
    assert.notExists(model.updatedAt)
  })

  test('timestamps are preserved when retrieving models from database', async ({ assert }) => {
    // Create a model
    const originalModel = await DefaultTimestampModel.create({ name: 'Persistent Model' })
    const originalCreatedAt = originalModel.createdAt
    const originalUpdatedAt = originalModel.updatedAt

    // Retrieve the model from database
    const retrievedModel = await DefaultTimestampModel.find(originalModel._id)

    // Verify timestamps are preserved
    assert.exists(retrievedModel)
    assert.instanceOf(retrievedModel!.createdAt, Date)
    assert.instanceOf(retrievedModel!.updatedAt, Date)
    assert.deepEqual(retrievedModel!.createdAt, originalCreatedAt)
    assert.deepEqual(retrievedModel!.updatedAt, originalUpdatedAt)
  })

  test('firstOrCreate sets timestamps on new records but preserves them on existing records', async ({ assert }) => {
    // Create model with firstOrCreate
    const model1 = await DefaultTimestampModel.firstOrCreate(
      { name: 'FirstOrCreate Model' },
      { name: 'FirstOrCreate Model' }
    )

    // Verify timestamps are set
    assert.exists(model1.createdAt)
    assert.exists(model1.updatedAt)

    const originalCreatedAt = model1.createdAt
    const originalUpdatedAt = model1.updatedAt

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10))

    // Use firstOrCreate again with the same search criteria
    const model2 = await DefaultTimestampModel.firstOrCreate(
      { name: 'FirstOrCreate Model' },
      { name: 'This name will not be used' }
    )

    // Verify it's the same record with unchanged createdAt
    assert.equal(model2._id.equals(model1._id), true)
    assert.deepEqual(model2.createdAt, originalCreatedAt)

    // updatedAt should not change for firstOrCreate when finding an existing record
    assert.deepEqual(model2.updatedAt, originalUpdatedAt)
  })

  test('updateOrCreate updates timestamps appropriately', async ({ assert }) => {
    // Create a model with updateOrCreate
    const model1 = await DefaultTimestampModel.updateOrCreate(
      { name: 'UpdateOrCreate Model' },
      { name: 'UpdateOrCreate Model' }
    )

    // Verify timestamps are set
    assert.exists(model1.createdAt)
    assert.exists(model1.updatedAt)

    const originalCreatedAt = model1.createdAt

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10))

    // Use updateOrCreate to update the model
    const model2 = await DefaultTimestampModel.updateOrCreate(
      { name: 'UpdateOrCreate Model' },
      { name: 'Updated with updateOrCreate' }
    )

    // Verify it's the same record with unchanged createdAt
    assert.equal(model2._id.equals(model1._id), true)
    assert.deepEqual(model2.createdAt, originalCreatedAt)

    // updatedAt should change for updateOrCreate
    assert.isTrue(model2.updatedAt > originalCreatedAt)
  })

  test('createMany sets timestamps on all created models', async ({ assert }) => {
    const beforeCreate = new Date()

    // Wait a small amount to ensure timestamp difference is noticeable
    await new Promise(resolve => setTimeout(resolve, 5))

    // Create multiple models
    const models = await DefaultTimestampModel.createMany([
      { name: 'Batch Model 1' },
      { name: 'Batch Model 2' },
      { name: 'Batch Model 3' }
    ])

    await new Promise(resolve => setTimeout(resolve, 5))
    const afterCreate = new Date()

    // Verify all models have timestamps
    for (const model of models) {
      assert.exists(model.createdAt)
      assert.exists(model.updatedAt)
      assert.instanceOf(model.createdAt, Date)
      assert.instanceOf(model.updatedAt, Date)

      // Verify timestamps are within expected time range
      assert.isTrue(model.createdAt >= beforeCreate)
      assert.isTrue(model.createdAt <= afterCreate)

      // On creation, createdAt and updatedAt should be equal
      assert.deepEqual(model.createdAt, model.updatedAt)
    }
  })
})