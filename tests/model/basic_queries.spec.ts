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
import { User } from '../fixtures.js'

test.group('MongoModel Basic Queries', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('can create a new document', async ({ assert }) => {
    const user = await User.create({ name: 'John Doe', email: 'john@example.com', age: 30 })

    assert.exists(user.$primaryKeyValue)
    assert.equal(user.name, 'John Doe')
    assert.equal(user.email, 'john@example.com')
    assert.equal(user.age, 30)
    assert.isFalse(user.$isNew)
  })

  test('can create multiple documents', async ({ assert }) => {
    const users = await User.createMany([
      { name: 'Jane Doe', email: 'jane@example.com', age: 28 },
      { name: 'Bob Smith', email: 'bob@example.com', age: 35 }
    ])

    assert.lengthOf(users, 2)
    assert.equal(users[0].name, 'Jane Doe')
    assert.equal(users[1].name, 'Bob Smith')
  })

  test('can find a document by id', async ({ assert }) => {
    const createdUser = await User.create({ name: 'Alice Johnson', email: 'alice@example.com', age: 25 })
    const foundUser = await User.find(createdUser._id)

    assert.exists(foundUser)
    assert.equal(foundUser!.name, 'Alice Johnson')
    assert.equal(foundUser!.email, 'alice@example.com')
  })

  test('can find a document by a specific field', async ({ assert }) => {
    await User.create({ name: 'Charlie Brown', email: 'charlie@example.com', age: 40 })
    const foundUser = await User.findBy('email', 'charlie@example.com')

    assert.exists(foundUser)
    assert.equal(foundUser!.name, 'Charlie Brown')
    assert.equal(foundUser!.age, 40)
  })

  test('can retrieve all documents', async ({ assert }) => {
    // Clear the collection first
    await User.truncate()

    await User.createMany([
      { name: 'User 1', email: 'user1@example.com', age: 20 },
      { name: 'User 2', email: 'user2@example.com', age: 25 },
      { name: 'User 3', email: 'user3@example.com', age: 30 }
    ])

    const allUsers = await User.all()

    assert.lengthOf(allUsers, 3)
  })

  test('can update a document', async ({ assert }) => {
    const user = await User.create({ name: 'David Miller', email: 'david@example.com', age: 33 })

    user.name = 'David Miller Jr.'
    user.age = 34
    await user.save()

    const updatedUser = await User.find(user._id)

    assert.equal(updatedUser!.name, 'David Miller Jr.')
    assert.equal(updatedUser!.age, 34)
    assert.equal(updatedUser!.email, 'david@example.com')
  })

  test('can delete a document', async ({ assert }) => {
    const user = await User.create({ name: 'Eve Wilson', email: 'eve@example.com', age: 27 })
    await user.delete()

    const foundUser = await User.find(user._id)
    assert.isNull(foundUser)
  })

  test('can use firstOrCreate to find existing document', async ({ assert }) => {
    await User.create({ name: 'Frank Thomas', email: 'frank@example.com', age: 45 })

    const user = await User.firstOrCreate(
      { email: 'frank@example.com' },
      { name: 'This should not be used', age: 0 }
    )

    assert.equal(user.name, 'Frank Thomas')
    assert.equal(user.age, 45)
  })

  test('can use firstOrCreate to create new document', async ({ assert }) => {
    const user = await User.firstOrCreate(
      { email: 'grace@example.com' },
      { name: 'Grace Hopper', age: 52 }
    )

    assert.equal(user.name, 'Grace Hopper')
    assert.equal(user.email, 'grace@example.com')
    assert.equal(user.age, 52)
  })

  test('can use updateOrCreate to update existing document', async ({ assert }) => {
    await User.create({ name: 'Harry Potter', email: 'harry@example.com', age: 17 })

    const user = await User.updateOrCreate(
      { email: 'harry@example.com' },
      { name: 'Harry Potter', age: 18 }
    )

    assert.equal(user.name, 'Harry Potter')
    assert.equal(user.age, 18)
  })

  test('can use updateOrCreate to create new document', async ({ assert }) => {
    const user = await User.updateOrCreate(
      { email: 'ian@example.com' },
      { name: 'Ian Malcolm', age: 38 }
    )

    assert.equal(user.name, 'Ian Malcolm')
    assert.equal(user.email, 'ian@example.com')
    assert.equal(user.age, 38)
  })
})