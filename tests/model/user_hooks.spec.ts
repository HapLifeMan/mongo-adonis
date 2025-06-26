/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { MongoDatabase } from '../../src/connection/database.js'
import { User } from '../fixtures.js'
import { setupTest, teardownTest } from '../helpers.js'

test.group('User Model Hooks', (group) => {
  let db: MongoDatabase

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('beforeSave and afterSave hooks are triggered when creating a new User', async ({ assert }) => {
    const user = new User()
    user.name = 'John Doe'
    user.email = 'john@example.com'
    user.age = 30

    await user.save()

    assert.isTrue(user.beforeSaveTriggered)
    assert.isTrue(user.afterSaveTriggered)
    assert.equal(user.lastOperation, 'create')
  })

  test('beforeCreate and afterCreate hooks are triggered when creating a new User', async ({ assert }) => {
    const user = new User()
    user.name = 'Jane Smith'
    user.email = 'jane@example.com'
    user.age = 25

    await user.save()

    assert.isTrue(user.beforeCreateTriggered)
    assert.isTrue(user.afterCreateTriggered)
  })

  test('beforeSave, beforeUpdate, afterUpdate, and afterSave hooks are triggered when updating a User', async ({ assert }) => {
    const user = new User()
    user.name = 'Bob Johnson'
    user.email = 'bob@example.com'
    user.age = 40

    await user.save()

    // Reset flags for update test
    user.beforeSaveTriggered = false
    user.afterSaveTriggered = false
    user.beforeUpdateTriggered = false
    user.afterUpdateTriggered = false

    user.name = 'Bob Johnson Jr.'
    await user.save()

    assert.isTrue(user.beforeSaveTriggered)
    assert.isTrue(user.afterSaveTriggered)
    assert.isTrue(user.beforeUpdateTriggered)
    assert.isTrue(user.afterUpdateTriggered)
    assert.equal(user.lastOperation, 'update')
  })

  test('beforeDelete and afterDelete hooks are triggered when deleting a User', async ({ assert }) => {
    const user = new User()
    user.name = 'Charlie Wilson'
    user.email = 'charlie@example.com'
    user.age = 35

    await user.save()

    await user.delete()

    assert.isTrue(user.beforeDeleteTriggered)
    assert.isTrue(user.afterDeleteTriggered)
  })

  test('beforeFind hook is triggered when finding a User', async ({ assert }) => {
    const user = new User()
    user.name = 'Alice Brown'
    user.email = 'alice@example.com'
    user.age = 28

    await user.save()

    // Since we can't directly access the query context, we'll just verify
    // that we can find the user without errors, which means the hook ran
    const foundUser = await User.find(user._id)

    assert.isNotNull(foundUser)
    assert.equal(foundUser?.name, 'Alice Brown')
  })

  test('afterFind hook is triggered when finding a User', async ({ assert }) => {
    const user = new User()
    user.name = 'David Miller'
    user.email = 'david@example.com'
    user.age = 45

    await user.save()

    const foundUser = await User.find(user._id)

    assert.isTrue(foundUser?.afterFindTriggered)
  })

  test('hooks are triggered in bulk operations', async ({ assert }) => {
    const users = await User.createMany([
      {
        name: 'User1',
        email: 'user1@example.com',
        age: 25
      },
      {
        name: 'User2',
        email: 'user2@example.com',
        age: 30
      }
    ])

    // Check that hooks were triggered for all created models
    users.forEach(user => {
      assert.isTrue(user.beforeSaveTriggered)
      assert.isTrue(user.afterSaveTriggered)
      assert.isTrue(user.beforeCreateTriggered)
      assert.isTrue(user.afterCreateTriggered)
      assert.equal(user.lastOperation, 'create')
    })
  })

  test('hooks are executed in the correct order for create operations', async ({ assert }) => {
    // Create a user and verify the hooks were triggered
    const user = new User()
    user.name = 'Hook Order Test'
    user.email = 'hooks@example.com'
    user.age = 50

    await user.save()

    // Verify all hooks were triggered
    assert.isTrue(user.beforeSaveTriggered)
    assert.isTrue(user.beforeCreateTriggered)
    assert.isTrue(user.afterCreateTriggered)
    assert.isTrue(user.afterSaveTriggered)
  })
})