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

import { MongoDatabase } from '../../src/connection/database.js'
import { MongoModel } from '../../src/model/base_model.js'
import { column } from '../../src/model/main.js'
import { setupTest, teardownTest } from '../helpers.js'

/**
 * A post as the sync pipeline sees it: identity is the (platform, remote id)
 * pair, and `status` is owned by the application, never by the payload.
 */
class Submission extends MongoModel {
  static collection = 'submissions'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare platform: string

  @column({ columnName: 'remote_id' })
  declare remoteId: string

  @column()
  declare caption: string

  @column()
  declare status: string

  @column()
  declare creatorId: ObjectId

  @column({
    prepare: (value: string) => (value ? `encrypted:${value}` : value),
    consume: (value: string) => (value?.startsWith('encrypted:') ? value.slice(10) : value),
  })
  declare token: string
}

const hooks: string[] = []

/**
 * Hooks recorded in call order, so a batch's shape is visible: all the
 * `before*` hooks, then the write, then all the `after*` hooks.
 */
class Tracked extends MongoModel {
  static collection = 'tracked'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare email: string

  @column()
  declare name: string

  static beforeSave(model: Tracked) {
    hooks.push(`beforeSave:${model.email}`)
  }

  static beforeCreate(model: Tracked) {
    hooks.push(`beforeCreate:${model.email}`)
  }

  static afterCreate(model: Tracked) {
    hooks.push(`afterCreate:${model.email}`)
  }

  static beforeUpdate(model: Tracked) {
    hooks.push(`beforeUpdate:${model.email}`)
  }

  static afterUpdate(model: Tracked) {
    hooks.push(`afterUpdate:${model.email}`)
  }

  static afterSave(model: Tracked) {
    hooks.push(`afterSave:${model.email}`)
  }
}

test.group('fetchOrCreateMany / updateOrCreateMany', (group) => {
  let db: MongoDatabase

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
  })

  group.each.setup(() => {
    hooks.length = 0
  })

  group.each.teardown(async () => {
    await Submission.truncate()
    await Tracked.truncate()
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('creates every row when the collection is empty', async ({ assert }) => {
    const rows = await Submission.fetchOrCreateMany('remoteId', [
      { platform: 'instagram', remoteId: 'a', caption: 'first' },
      { platform: 'instagram', remoteId: 'b', caption: 'second' },
    ])

    assert.lengthOf(rows, 2)
    assert.deepEqual(
      rows.map((row) => row.remoteId),
      ['a', 'b']
    )
    rows.forEach((row) => {
      assert.isTrue(row.$isPersisted)
      assert.instanceOf(row._id, ObjectId)
    })
    assert.equal(await Submission.query().count(), 2)
  })

  test('returns existing rows untouched and only creates the missing ones', async ({ assert }) => {
    const [existing] = await Submission.createMany([
      { platform: 'instagram', remoteId: 'a', caption: 'as stored', status: 'accepted' },
    ])

    const rows = await Submission.fetchOrCreateMany('remoteId', [
      { platform: 'instagram', remoteId: 'a', caption: 'from the payload' },
      { platform: 'instagram', remoteId: 'b', caption: 'new one' },
    ])

    assert.lengthOf(rows, 2)
    assert.equal(rows[0]._id.toString(), existing._id.toString())

    // The whole point: a row that already exists keeps its own values, so a
    // re-import cannot overwrite a moderation decision.
    assert.equal(rows[0].caption, 'as stored')
    assert.equal(rows[0].status, 'accepted')
    assert.equal(rows[1].caption, 'new one')
    assert.equal(await Submission.query().count(), 2)

    const reloaded = await Submission.findBy('remote_id', 'a')
    assert.equal(reloaded!.caption, 'as stored')
  })

  test('$isLocal tells the created rows from the fetched ones', async ({ assert }) => {
    await Submission.createMany([{ platform: 'instagram', remoteId: 'a', caption: 'stored' }])

    const rows = await Submission.fetchOrCreateMany('remoteId', [
      { platform: 'instagram', remoteId: 'a', caption: 'stored' },
      { platform: 'instagram', remoteId: 'b', caption: 'new' },
    ])

    assert.isFalse(rows[0].$isLocal)
    assert.isTrue(rows[1].$isLocal)
    assert.equal(rows.filter((row) => row.$isLocal).length, 1)
  })

  test('is idempotent: a second identical call inserts nothing', async ({ assert }) => {
    const payload = [
      { platform: 'instagram', remoteId: 'a', caption: 'first' },
      { platform: 'tiktok', remoteId: 'b', caption: 'second' },
    ]

    const first = await Submission.fetchOrCreateMany('remoteId', payload)
    const second = await Submission.fetchOrCreateMany('remoteId', payload)

    assert.equal(await Submission.query().count(), 2)
    assert.deepEqual(
      first.map((row) => row._id.toString()),
      second.map((row) => row._id.toString())
    )
    assert.isTrue(second.every((row) => !row.$isLocal))
  })

  test('matches on a composite key rather than on either key alone', async ({ assert }) => {
    await Submission.createMany([
      { platform: 'instagram', remoteId: 'shared', caption: 'the instagram one' },
    ])

    const rows = await Submission.fetchOrCreateMany(
      ['platform', 'remoteId'],
      [
        { platform: 'instagram', remoteId: 'shared', caption: 'ignored' },
        // Same remote id, different platform — a distinct submission.
        { platform: 'tiktok', remoteId: 'shared', caption: 'the tiktok one' },
      ]
    )

    assert.lengthOf(rows, 2)
    assert.isFalse(rows[0].$isLocal)
    assert.isTrue(rows[1].$isLocal)
    assert.equal(rows[0].caption, 'the instagram one')
    assert.equal(await Submission.query().count(), 2)
  })

  test('does not match a cross-product of the composite key values', async ({ assert }) => {
    await Submission.createMany([
      { platform: 'instagram', remoteId: 'a', caption: 'instagram a' },
      { platform: 'tiktok', remoteId: 'b', caption: 'tiktok b' },
    ])

    // ('instagram','b') and ('tiktok','a') exist as values but not as pairs,
    // so both are missing and must be created.
    const rows = await Submission.fetchOrCreateMany(
      ['platform', 'remoteId'],
      [
        { platform: 'instagram', remoteId: 'b', caption: 'instagram b' },
        { platform: 'tiktok', remoteId: 'a', caption: 'tiktok a' },
      ]
    )

    assert.isTrue(rows.every((row) => row.$isLocal))
    assert.equal(await Submission.query().count(), 4)
  })

  test('resolves a repeated unique key to a single row', async ({ assert }) => {
    const rows = await Submission.fetchOrCreateMany('remoteId', [
      { platform: 'instagram', remoteId: 'a', caption: 'first' },
      { platform: 'instagram', remoteId: 'a', caption: 'duplicate' },
    ])

    assert.lengthOf(rows, 2)
    assert.strictEqual(rows[0], rows[1])
    assert.equal(rows[0].caption, 'first')
    assert.equal(await Submission.query().count(), 1)
  })

  test('matches on an ObjectId key', async ({ assert }) => {
    const creatorId = new ObjectId()
    await Submission.createMany([
      { platform: 'instagram', remoteId: 'a', creatorId, caption: 'stored' },
    ])

    const rows = await Submission.fetchOrCreateMany('creatorId', [
      { platform: 'instagram', remoteId: 'a', creatorId, caption: 'ignored' },
      { platform: 'instagram', remoteId: 'b', creatorId: new ObjectId(), caption: 'new' },
    ])

    assert.isFalse(rows[0].$isLocal)
    assert.equal(rows[0].caption, 'stored')
    assert.isTrue(rows[1].$isLocal)
  })

  test('compares a transformed column in its stored form', async ({ assert }) => {
    await Submission.createMany([{ platform: 'instagram', remoteId: 'a', token: 'secret' }])

    const stored = await Submission.query().first()
    assert.equal(stored!.$attributes.token, 'encrypted:secret')

    // The payload carries the plain value; the row is found anyway because
    // the key is compared after `prepare` ran.
    const rows = await Submission.fetchOrCreateMany('token', [
      { platform: 'instagram', remoteId: 'a', token: 'secret' },
      { platform: 'instagram', remoteId: 'b', token: 'other' },
    ])

    assert.isFalse(rows[0].$isLocal)
    assert.isTrue(rows[1].$isLocal)
    assert.equal(await Submission.query().count(), 2)
  })

  test('accepts an empty payload without touching the database', async ({ assert }) => {
    assert.deepEqual(await Submission.fetchOrCreateMany('remoteId', []), [])
    assert.deepEqual(await Submission.updateOrCreateMany('remoteId', []), [])
    assert.equal(await Submission.query().count(), 0)
  })

  test('rejects an empty set of unique keys', async ({ assert }) => {
    await assert.rejects(
      () => Submission.fetchOrCreateMany([], [{ platform: 'instagram', remoteId: 'a' }]),
      '"fetchOrCreateMany" needs at least one unique key'
    )
  })

  test('rejects a payload row missing a unique key value', async ({ assert }) => {
    await assert.rejects(
      () =>
        Submission.fetchOrCreateMany('remoteId', [
          { platform: 'instagram', remoteId: 'a' },
          { platform: 'instagram' },
        ]),
      'Value for "remoteId" is null or undefined in the "fetchOrCreateMany" payload at index 1'
    )

    assert.equal(await Submission.query().count(), 0)
  })

  test('runs the create hooks per row, around one shared write', async ({ assert }) => {
    await Tracked.fetchOrCreateMany('email', [
      { name: 'John', email: 'john@example.com' },
      { name: 'Jane', email: 'jane@example.com' },
    ])

    assert.deepEqual(hooks, [
      'beforeSave:john@example.com',
      'beforeCreate:john@example.com',
      'beforeSave:jane@example.com',
      'beforeCreate:jane@example.com',
      'afterCreate:john@example.com',
      'afterSave:john@example.com',
      'afterCreate:jane@example.com',
      'afterSave:jane@example.com',
    ])
  })

  test('does not run any hook on a fetched row', async ({ assert }) => {
    await Tracked.create({ name: 'John', email: 'john@example.com' })
    hooks.length = 0

    const [fetched] = await Tracked.fetchOrCreateMany('email', [
      { name: 'Ignored', email: 'john@example.com' },
    ])

    assert.deepEqual(hooks, [])
    assert.equal(fetched.name, 'John')
  })

  /**
   * The property the whole implementation exists for. Lucid issues one write
   * per row; a loop reintroduced here would fail this test rather than just
   * quietly cost 100 round trips.
   */
  test('takes a fixed number of round trips, whatever the payload size', async ({ assert }) => {
    const row = (index: number) => ({
      platform: 'instagram',
      remoteId: `id-${index}`,
      caption: `caption ${index}`,
    })

    await Submission.createMany(Array.from({ length: 50 }, (_, index) => row(index)))

    const payload = Array.from({ length: 100 }, (_, index) => row(index))
    const queries: Record<string, any>[] = []
    const listen = (event: { query: Record<string, any> }) => queries.push(event.query)

    db.emitter.on('mongodb:query', listen)

    try {
      const fetched = await Submission.fetchOrCreateMany('remoteId', payload)
      assert.lengthOf(fetched, 100)
      assert.equal(fetched.filter((item) => item.$isLocal).length, 50)

      // One find, one insertMany for the 50 that were missing.
      assert.lengthOf(queries, 2)
      assert.isTrue(queries[1].insertMany)

      queries.length = 0

      const merged = await Submission.updateOrCreateMany(
        'remoteId',
        payload.map((item) => ({ ...item, caption: `${item.caption} v2` }))
      )
      assert.lengthOf(merged, 100)

      // One find, and one bulkWrite for the 100 rows that changed. Nothing
      // was missing this time, so no insert.
      assert.lengthOf(queries, 2)
      assert.isTrue(queries[1].bulkWrite)
      assert.lengthOf(queries[1].operations, 100)
    } finally {
      db.emitter.off('mongodb:query', listen)
    }

    assert.equal(await Submission.query().count(), 100)
    const reloaded = await Submission.findBy('remote_id', 'id-0')
    assert.equal(reloaded!.caption, 'caption 0 v2')
  })

  test('updateOrCreateMany merges into existing rows and creates the rest', async ({ assert }) => {
    const [existing] = await Submission.createMany([
      { platform: 'instagram', remoteId: 'a', caption: 'old', status: 'pending' },
    ])

    const rows = await Submission.updateOrCreateMany('remoteId', [
      { platform: 'instagram', remoteId: 'a', caption: 'new caption' },
      { platform: 'instagram', remoteId: 'b', caption: 'created' },
    ])

    assert.lengthOf(rows, 2)
    assert.equal(rows[0]._id.toString(), existing._id.toString())
    assert.equal(rows[0].caption, 'new caption')

    // Untouched by the payload, so untouched in the database.
    assert.equal(rows[0].status, 'pending')

    const reloaded = await Submission.findBy('remote_id', 'a')
    assert.equal(reloaded!.caption, 'new caption')
    assert.equal(reloaded!.status, 'pending')
    assert.equal(await Submission.query().count(), 2)
  })

  test('updateOrCreateMany persists every merged row in one pass', async ({ assert }) => {
    await Submission.createMany([
      { platform: 'instagram', remoteId: 'a', caption: 'old a' },
      { platform: 'instagram', remoteId: 'b', caption: 'old b' },
      { platform: 'instagram', remoteId: 'c', caption: 'old c' },
    ])

    await Submission.updateOrCreateMany('remoteId', [
      { platform: 'instagram', remoteId: 'a', caption: 'new a' },
      { platform: 'instagram', remoteId: 'b', caption: 'new b' },
      { platform: 'instagram', remoteId: 'c', caption: 'new c' },
    ])

    const reloaded = await Submission.query().orderBy('remote_id', 'asc').exec()
    assert.deepEqual(
      reloaded.map((row) => row.caption),
      ['new a', 'new b', 'new c']
    )
  })

  test('updateOrCreateMany lets the last of a repeated key win', async ({ assert }) => {
    await Submission.createMany([{ platform: 'instagram', remoteId: 'a', caption: 'old' }])

    const rows = await Submission.updateOrCreateMany('remoteId', [
      { platform: 'instagram', remoteId: 'a', caption: 'first' },
      { platform: 'instagram', remoteId: 'a', caption: 'second' },
    ])

    assert.strictEqual(rows[0], rows[1])

    const reloaded = await Submission.findBy('remote_id', 'a')
    assert.equal(reloaded!.caption, 'second')
    assert.equal(await Submission.query().count(), 1)
  })

  test('updateOrCreateMany runs the update hooks on merged rows only', async ({ assert }) => {
    await Tracked.create({ name: 'John', email: 'john@example.com' })
    hooks.length = 0

    const [merged, created] = await Tracked.updateOrCreateMany('email', [
      { name: 'John Jr.', email: 'john@example.com' },
      { name: 'Jane', email: 'jane@example.com' },
    ])

    assert.equal(merged.name, 'John Jr.')
    assert.equal(created.name, 'Jane')

    assert.deepEqual(hooks, [
      'beforeSave:jane@example.com',
      'beforeCreate:jane@example.com',
      'afterCreate:jane@example.com',
      'afterSave:jane@example.com',
      'beforeSave:john@example.com',
      'beforeUpdate:john@example.com',
      'afterUpdate:john@example.com',
      'afterSave:john@example.com',
    ])
  })
})
