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

import { MongoModel } from '../../src/model/base_model.js'
import { column } from '../../src/model/main.js'
import { setupTest, teardownTest } from '../helpers.js'

/**
 * Simple encryption/decryption function for testing
 */
const encryption = {
  encrypt: (value: string): string => {
    return `encrypted:${value}`
  },
  decrypt: (value: string): string => {
    if (!value.startsWith('encrypted:')) return value
    return value.substring(10)
  }
}

/**
 * JSON transformation for testing
 */
const jsonTransformer = {
  prepare: (value: object): string => {
    return JSON.stringify(value)
  },
  consume: (value: string): object => {
    if (typeof value === 'string') {
      return JSON.parse(value)
    }
    return value
  }
}

/**
 * Test model with transformed columns
 */
class User extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare username: string

  @column({
    prepare: (value: string | null) => value ? encryption.encrypt(value) : null,
    consume: (value: string | null) => value ? encryption.decrypt(value) : null,
  })
  declare token: string | null

  @column({
    prepare: (value: object) => jsonTransformer.prepare(value),
    consume: (value: string) => jsonTransformer.consume(value),
  })
  declare preferences: Record<string, any>

  @column({
    prepare: (value: string) => value.toLowerCase().trim(),
    consume: (value: string) => value,
  })
  declare email: string
}

/**
 * Test model with timestamps
 */
class TimestampModel extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: Date

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: Date
}

test.group('Column Transformers', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
    User.boot()
  })

  group.teardown(async () => {
    await User.truncate()
    await teardownTest(db)
  })

  group.each.setup(async () => {
    await User.truncate()
  })

  test('should apply prepare transformation when saving data', async ({ assert }) => {
    // Create a new user
    const user = new User()
    user.username = 'testuser'
    user.token = 'secret-token'
    user.preferences = { theme: 'dark', notifications: true }
    user.email = ' Test@Example.COM '

    await user.save()

    // Get the raw data from the database
    const rawUser = await db.connection()
      .collection(User.collection)
      .findOne({ _id: new ObjectId(user._id) })

    // Verify transformations were applied
    assert.equal(rawUser.username, 'testuser')
    assert.equal(rawUser.token, 'encrypted:secret-token')
    assert.equal(rawUser.preferences, '{"theme":"dark","notifications":true}')
    assert.equal(rawUser.email, 'test@example.com')
  })

  test('should apply consume transformation when loading data', async ({ assert }) => {
    // Insert raw data into the database
    const rawData = {
      username: 'testuser',
      token: 'encrypted:secret-token',
      preferences: '{"theme":"dark","notifications":true}',
      email: 'test@example.com'
    }

    const result = await db.connection()
      .collection(User.collection)
      .insertOne(rawData)

    // Load the user with the model
    const user = await User.find(result.insertedId.toString())

    // Verify transformations were applied
    assert.equal(user?.username, 'testuser')
    assert.equal(user?.token, 'secret-token')
    assert.deepEqual(user?.preferences, { theme: 'dark', notifications: true })
    assert.equal(user?.email, 'test@example.com')
  })

  test('should handle null values in transformations', async ({ assert }) => {
    // Create a user with null values
    const user = new User()
    user.username = 'nulluser'
    user.token = null
    user.preferences = { empty: true }
    user.email = 'null@example.com'

    await user.save()

    // Get the user back
    const loadedUser = await User.findBy('username', 'nulluser')

    // Verify null values are handled correctly
    assert.isNull(loadedUser?.token)
    assert.deepEqual(loadedUser?.preferences, { empty: true })
  })

  test('should apply transformations when refreshing a model', async ({ assert }) => {
    // Create a user
    const user = new User()
    user.username = 'refreshuser'
    user.token = 'refresh-token'
    user.preferences = { refresh: true }
    user.email = 'Refresh@Example.com'

    await user.save()

    // Manually update the database record
    await db.connection()
      .collection(User.collection)
      .updateOne(
        { _id: new ObjectId(user._id) },
        { $set: {
          token: 'encrypted:updated-token',
          preferences: '{"refresh":false,"updated":true}',
          email: 'updated@example.com'
        }}
      )

    // Refresh the model
    await user.refresh()

    // Verify transformations were applied
    assert.equal(user.token, 'updated-token')
    assert.deepEqual(user.preferences, { refresh: false, updated: true })
    assert.equal(user.email, 'updated@example.com')
  })

  test('should apply transformations when using firstOrCreate', async ({ assert }) => {
    // Create a user using firstOrCreate
    const user = await User.firstOrCreate(
      { username: 'firstorcreate' },
      {
        token: 'new-token',
        preferences: { feature: 'enabled' },
        email: ' First@Create.com '
      }
    )

    // Verify the model has correct values
    assert.equal(user.username, 'firstorcreate')
    assert.equal(user.token, 'new-token')
    assert.deepEqual(user.preferences, { feature: 'enabled' })
    assert.equal(user.email, 'first@create.com')

    // Verify the database has transformed values
    const dbUser = await db.connection()
      .collection(User.collection)
      .findOne({ username: 'firstorcreate' })

    assert.equal(dbUser.token, 'encrypted:new-token')
    assert.equal(dbUser.preferences, '{"feature":"enabled"}')
    assert.equal(dbUser.email, 'first@create.com')

    // Attempt to find or create the same user again with different data
    // The user should be found (not created) and the timestamps should not update
    const updatedToken = 'different-token'

    // Wait a bit to ensure timestamps would be different if updated
    await new Promise(resolve => setTimeout(resolve, 10))

    const existingUser = await User.firstOrCreate(
      { username: 'firstorcreate' },
      {
        token: updatedToken,
        preferences: { feature: 'updated' },
        email: 'updated@example.com'
      }
    )

    // Original values should be preserved
    assert.equal(existingUser.token, 'new-token')
    assert.deepEqual(existingUser.preferences, { feature: 'enabled' })
    assert.equal(existingUser.email, 'first@create.com')

    // Verify in the database that values were not updated
    const unchangedDbUser = await db.connection()
      .collection(User.collection)
      .findOne({ username: 'firstorcreate' })

    assert.equal(unchangedDbUser.token, 'encrypted:new-token')
    assert.equal(unchangedDbUser.preferences, '{"feature":"enabled"}')
    assert.equal(unchangedDbUser.email, 'first@create.com')
  })

  test('should not update timestamps when using firstOrCreate on existing records', async ({ assert }) => {
    // Set up the model
    TimestampModel.boot()
    await TimestampModel.truncate()

    // Create a new record
    const record = await TimestampModel.create({
      name: 'Test Record'
    })

    // Get the initial timestamps
    const initialCreatedAt = record.createdAt.getTime()
    const initialUpdatedAt = record.updatedAt.getTime()

    // Wait to ensure timestamps would be different if updated
    await new Promise(resolve => setTimeout(resolve, 100))

    // Try to find or create the same record
    const existingRecord = await TimestampModel.firstOrCreate(
      { name: 'Test Record' },
      { name: 'Updated Test Record' }
    )

    // Timestamps should not change for existing records
    assert.equal(existingRecord.createdAt.getTime(), initialCreatedAt)
    assert.equal(existingRecord.updatedAt.getTime(), initialUpdatedAt)

    // Verify the name wasn't updated either
    assert.equal(existingRecord.name, 'Test Record')

    // Verify in the database
    const dbRecord = await db.connection()
      .collection(TimestampModel.collection)
      .findOne({ name: 'Test Record' })

    assert.equal(new Date(dbRecord.createdAt).getTime(), initialCreatedAt)
    assert.equal(new Date(dbRecord.updatedAt).getTime(), initialUpdatedAt)

    // Clean up
    await TimestampModel.truncate()
  })

  test('should not update timestamps when using firstOrNew on existing records', async ({ assert }) => {
    // Set up the model
    TimestampModel.boot()
    await TimestampModel.truncate()

    // Create a new record
    const record = await TimestampModel.create({
      name: 'Test FirstOrNew'
    })

    // Get the initial timestamps
    const initialCreatedAt = record.createdAt.getTime()
    const initialUpdatedAt = record.updatedAt.getTime()

    // Wait to ensure timestamps would be different if updated
    await new Promise(resolve => setTimeout(resolve, 100))

    // Try to find or new the same record
    const existingRecord = await TimestampModel.firstOrNew(
      { name: 'Test FirstOrNew' },
      { name: 'Updated FirstOrNew Record' }
    )

    // Timestamps should not change for existing records
    assert.equal(existingRecord.createdAt.getTime(), initialCreatedAt)
    assert.equal(existingRecord.updatedAt.getTime(), initialUpdatedAt)

    // Verify the name wasn't updated either
    assert.equal(existingRecord.name, 'Test FirstOrNew')

    // firstOrNew doesn't save the model, so we don't need to check the database

    // Clean up
    await TimestampModel.truncate()
  })
})