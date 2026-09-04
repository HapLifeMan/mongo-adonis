/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Regression tests for model-layer bugs found during the deep review:
 * hook chaining, subclass column isolation, timestamp overwrites,
 * pivot data purity, detach([]) semantics and createMany hydration.
 */

import { test } from '@japa/runner'
import { ObjectId } from 'mongodb'
import { MongoModel } from '../../src/model/base_model.js'
import { column, beforeSave } from '../../src/model/main.js'
import { BelongsToMany } from '../../src/relations/belongs_to_many.js'
import { setupTest, teardownTest } from '../helpers.js'

test.group('Model Regressions', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
    MongoModel.$adapter = setup.adapter
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('multiple @beforeSave hooks chain instead of replacing each other', async ({ assert }) => {
    const calls: string[] = []

    class ChainedHookModel extends MongoModel {
      static collection = 'chained_hook_models'

      @column({ isPrimary: true })
      declare _id: ObjectId

      @column()
      declare name: string

      @beforeSave()
      static async firstHook(_model: ChainedHookModel) {
        calls.push('first')
      }

      @beforeSave()
      static async secondHook(_model: ChainedHookModel) {
        calls.push('second')
      }
    }

    const model = new ChainedHookModel()
    model.name = 'chained'
    await model.save()

    assert.deepEqual(calls, ['first', 'second'])
    await model.delete()
  })

  test('after hooks run in Lucid order: afterCreate before afterSave', async ({ assert }) => {
    const calls: string[] = []

    class HookOrderModel extends MongoModel {
      static collection = 'hook_order_models'

      @column({ isPrimary: true })
      declare _id: ObjectId

      static async afterCreate(_model: HookOrderModel) {
        calls.push('afterCreate')
      }

      static async afterSave(_model: HookOrderModel) {
        calls.push('afterSave')
      }
    }

    const model = new HookOrderModel()
    model.name = 'ordered'
    await model.save()

    assert.deepEqual(calls, ['afterCreate', 'afterSave'])
    await model.delete()
  })

  test('subclass columns do not leak into the parent model', async ({ assert }) => {
    class ParentColumns extends MongoModel {
      static collection = 'parent_columns'

      @column({ isPrimary: true })
      declare _id: ObjectId

      @column()
      declare shared: string
    }

    class ChildColumns extends ParentColumns {
      @column()
      declare childOnly: string
    }

    const parentDefs = ParentColumns.prototype.$columnsDefinitions
    const childDefs = ChildColumns.prototype.$columnsDefinitions

    assert.isFalse(parentDefs.has('childOnly'))
    assert.isTrue(childDefs.has('childOnly'))
    assert.isTrue(childDefs.has('shared'))
  })

  test('autoCreate timestamps respect user-supplied values', async ({ assert }) => {
    class StampedModel extends MongoModel {
      static collection = 'stamped_models'

      @column({ isPrimary: true })
      declare _id: ObjectId

      @column.dateTime({ autoCreate: true })
      declare createdAt: Date
    }

    const explicitDate = new Date('2020-05-05T00:00:00Z')
    const model = new StampedModel()
    model.createdAt = explicitDate
    await model.save()

    assert.equal(model.createdAt.getTime(), explicitDate.getTime())

    const auto = new StampedModel()
    await auto.save()
    assert.isTrue(auto.createdAt instanceof Date)
    assert.isTrue(Math.abs(auto.createdAt.getTime() - Date.now()) < 5000)

    await model.delete()
    await auto.delete()
  })

  test('createMany returns fully persisted, hydrated models', async ({ assert }) => {
    class BulkModel extends MongoModel {
      static collection = 'bulk_models'

      @column({ isPrimary: true })
      declare _id: ObjectId

      @column()
      declare label: string
    }

    const models = await BulkModel.createMany([
      { label: 'one' },
      { label: 'two' },
      { label: 'three' },
    ])

    assert.equal(models.length, 3)
    for (const model of models) {
      assert.isFalse(model.$isNew)
      assert.isTrue(model.$isPersisted)
      assert.exists(model.$primaryKeyValue)
      assert.isFalse(model.$isDirty)
    }

    const count = await BulkModel.query().count()
    assert.equal(count, 3)

    await BulkModel.truncate()
  })

  test('pivotData returns only pivot fields, never model internals', async ({ assert }) => {
    class LeftModel extends MongoModel {
      static collection = 'left_models'

      @column({ isPrimary: true })
      declare _id: ObjectId
    }
    class RightModel extends MongoModel {
      static collection = 'right_models'

      @column({ isPrimary: true })
      declare _id: ObjectId
    }
    class LeftRightPivot extends MongoModel {
      static collection = 'left_right_pivots'

      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    const left = await LeftModel.create({ name: 'left' })
    const right = await RightModel.create({ name: 'right' })

    const relation = new BelongsToMany(
      RightModel as any,
      left,
      LeftRightPivot as any,
      'left_id',
      'right_id'
    )

    await relation.attachWithPivotData([
      { id: right.$primaryKeyValue, pivotData: { role: 'admin', weight: 5 } },
    ])

    const pivotData = await relation.pivotData(right.$primaryKeyValue)
    assert.exists(pivotData)
    assert.equal(pivotData!.role, 'admin')
    assert.equal(pivotData!.weight, 5)
    assert.notProperty(pivotData, '$attributes')
    assert.notProperty(pivotData, '$original')
    assert.notProperty(pivotData, '$isNew')

    // detach([]) detaches nothing, detach() detaches everything
    await relation.detach([])
    assert.isTrue(await relation.exists(right.$primaryKeyValue))
    await relation.detach()
    assert.isFalse(await relation.exists(right.$primaryKeyValue))

    await LeftModel.truncate()
    await RightModel.truncate()
    await LeftRightPivot.truncate()
  })

  test('refresh() on a deleted row throws instead of silently resurrecting', async ({ assert }) => {
    class RefreshModel extends MongoModel {
      static collection = 'refresh_models'

      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    const model = await RefreshModel.create({ name: 'ghost' })
    await RefreshModel.query().where('_id', model.$primaryKeyValue).delete()

    await assert.rejects(() => model.refresh())
  })

  test('in-place mutation of a nested object is detected as dirty and persisted', async ({ assert }) => {
    class NestedModel extends MongoModel {
      static collection = 'nested_models'

      @column({ isPrimary: true })
      declare _id: ObjectId

      @column()
      declare settings: { theme: string; flags: string[] }
    }

    const model = await NestedModel.create({ settings: { theme: 'light', flags: ['a'] } })

    // Mutate in place — no reassignment
    model.settings.theme = 'dark'
    model.settings.flags.push('b')
    assert.isTrue(model.$isDirty)
    await model.save()

    const doc = await db.connection().collection(NestedModel.collection)
      .findOne({ _id: model.$primaryKeyValue })

    assert.equal(doc.settings.theme, 'dark')
    assert.deepEqual(doc.settings.flags, ['a', 'b'])

    await NestedModel.truncate()
  })

  test('save() only writes dirty fields', async ({ assert }) => {
    class DirtyModel extends MongoModel {
      static collection = 'dirty_models'

      @column({ isPrimary: true })
      declare _id: ObjectId

      @column()
      declare title: string

      @column()
      declare body: string
    }

    const model = await DirtyModel.create({ title: 'original', body: 'text' })

    // Simulate a concurrent update to another field
    await db.connection().collection(DirtyModel.collection).updateOne(
      { _id: model.$primaryKeyValue },
      { $set: { body: 'changed elsewhere' } }
    )

    model.title = 'updated'
    await model.save()

    const doc = await db.connection().collection(DirtyModel.collection)
      .findOne({ _id: model.$primaryKeyValue })

    assert.equal(doc.title, 'updated')
    // The concurrent change survives because save() no longer rewrites the
    // whole document
    assert.equal(doc.body, 'changed elsewhere')

    await DirtyModel.truncate()
  })
})
