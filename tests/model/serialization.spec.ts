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
import { column, computed } from '../../src/model/main.js'
import { setupTest, teardownTest } from '../helpers.js'

/**
 * Test model with various serialization options
 */
class SerializationModel extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare normalField: string

  @column({ serialize: false })
  declare hiddenField: string

  @column({ serializeAs: null })
  declare excludedField: string

  @column({ serializeAs: 'renamedField' })
  declare originalField: string

  @column({
    prepare: (value: string) => value.toUpperCase(),
    consume: (value: string) => value.toLowerCase(),
  })
  declare transformedField: string

  @column({
    serializeAs: 'custom_password',
    prepare: (value: string) => `hashed_${value}`
  })
  declare password: string

  nonDecoratedField: string = 'non-decorated'

  @computed()
  get computedNormal(): string {
    return `Computed: ${this.normalField}`
  }

  @computed({ serialize: false })
  get computedHidden(): string {
    return `Hidden: ${this.normalField}`
  }

  @computed({ serializeAs: null })
  get computedExcluded(): string {
    return `Excluded: ${this.normalField}`
  }

  @computed({ serializeAs: 'renamed_computed' })
  get computedRenamed(): string {
    return `Renamed: ${this.normalField}`
  }
}

test.group('Model Serialization', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
    SerializationModel.boot()
  })

  group.teardown(async () => {
    await SerializationModel.truncate()
    await teardownTest(db)
  })

  group.each.setup(async () => {
    await SerializationModel.truncate()
  })

  test('basic serialization options work correctly', async ({ assert }) => {
    // Create a model
    const model = new SerializationModel()
    model.normalField = 'normal value'
    model.hiddenField = 'hidden value'
    model.excludedField = 'excluded value'
    model.originalField = 'original value'
    model.transformedField = 'transformed value'
    model.password = 'password123'

    // Get serialized representation
    const serialized = model.serialize()

    // Test normal serialization
    assert.equal(serialized.normalField, 'normal value')

    // Test hidden fields (serialize: false)
    assert.notProperty(serialized, 'hiddenField')

    // Test excluded fields (serializeAs: null)
    assert.notProperty(serialized, 'excludedField')

    // Test renamed fields (serializeAs: 'name')
    assert.notProperty(serialized, 'originalField')
    assert.equal(serialized.renamedField, 'original value')

    // Test fields with transformations
    assert.equal(serialized.transformedField, 'transformed value')

    // Test fields with both serializeAs and transformations
    assert.notProperty(serialized, 'password')
    assert.equal(serialized.custom_password, 'password123')

    // Test non-decorated fields
    assert.equal(serialized.nonDecoratedField, 'non-decorated')
  })

  test('computed properties are correctly serialized', async ({ assert }) => {
    // Create a model
    const model = new SerializationModel()
    model.normalField = 'test'

    // Get serialized representation
    const serialized = model.serialize()

    // Test normal computed property
    assert.equal(serialized.computedNormal, 'Computed: test')

    // Test hidden computed property
    assert.notProperty(serialized, 'computedHidden')

    // Test excluded computed property
    assert.notProperty(serialized, 'computedExcluded')

    // Test renamed computed property
    assert.notProperty(serialized, 'computedRenamed')
    assert.equal(serialized.renamed_computed, 'Renamed: test')
  })

  test('toJSON method uses serialize for JSON.stringify', async ({ assert }) => {
    // Create a model
    const model = new SerializationModel()
    model.normalField = 'json test'
    model.hiddenField = 'hidden json'
    model.excludedField = 'excluded json'
    model.originalField = 'original json'

    // Convert to JSON string and back to object
    const jsonString = JSON.stringify(model)
    const parsed = JSON.parse(jsonString)

    // Verify serialization rules were applied
    assert.equal(parsed.normalField, 'json test')
    assert.notProperty(parsed, 'hiddenField')
    assert.notProperty(parsed, 'excludedField')
    assert.notProperty(parsed, 'originalField')
    assert.equal(parsed.renamedField, 'original json')
  })

  test('serialization works correctly after saving to database', async ({ assert }) => {
    // Create and save a model
    const model = await SerializationModel.create({
      normalField: 'database test',
      hiddenField: 'hidden database',
      excludedField: 'excluded database',
      originalField: 'original database',
      transformedField: 'transformed database',
      password: 'secure123'
    })

    // Get it back from the database
    const retrieved = await SerializationModel.find(model._id)

    // Serialize the retrieved model
    const serialized = retrieved!.serialize()

    // Check serialization rules
    assert.equal(serialized.normalField, 'database test')
    assert.notProperty(serialized, 'hiddenField')
    assert.notProperty(serialized, 'excludedField')
    assert.notProperty(serialized, 'originalField')
    assert.equal(serialized.renamedField, 'original database')
    assert.equal(serialized.transformedField, 'transformed database')
    assert.equal(serialized.custom_password, 'hashed_secure123')

    // Check computed properties
    assert.equal(serialized.computedNormal, 'Computed: database test')
    assert.notProperty(serialized, 'computedHidden')
  })

  test('toObject returns raw data with transformations applied', async ({ assert }) => {
    // Create a model
    const model = new SerializationModel()
    model.normalField = 'object test'
    model.hiddenField = 'hidden object'
    model.excludedField = 'excluded object'
    model.originalField = 'original object'
    model.transformedField = 'transformed object'
    model.password = 'object123'

    // Get raw object representation (for saving to database)
    const obj = model.toObject()

    // Regular fields should be included
    assert.equal(obj.normalField, 'object test')
    assert.equal(obj.hiddenField, 'hidden object')
    assert.equal(obj.excludedField, 'excluded object')
    assert.equal(obj.originalField, 'original object')

    // Check that prepare transformations are applied
    assert.equal(obj.transformedField, 'TRANSFORMED OBJECT')
    assert.equal(obj.password, 'hashed_object123')

    // Non-decorated fields should also be included
    assert.equal(obj.nonDecoratedField, 'non-decorated')

    // Computed properties should not be in toObject()
    assert.notProperty(obj, 'computedNormal')
    assert.notProperty(obj, 'computedHidden')
    assert.notProperty(obj, 'computedExcluded')
    assert.notProperty(obj, 'computedRenamed')
  })

  test('comparison between toObject, serialize and toJSON', async ({ assert }) => {
    // Create a model
    const model = new SerializationModel()
    model.normalField = 'compare test'
    model.hiddenField = 'hidden compare'
    model.excludedField = 'excluded compare'
    model.originalField = 'original compare'
    model.transformedField = 'transformed compare'
    model.password = 'compare123'

    // Get different representations
    const obj = model.toObject()
    const serialized = model.serialize()
    const jsonObj = model.toJSON()
    const stringified = JSON.parse(JSON.stringify(model))

    // toObject should include all properties with transformations for database
    assert.equal(obj.password, 'hashed_compare123')
    assert.property(obj, 'hiddenField')
    assert.property(obj, 'excludedField')

    // Verify serialize and toJSON return the same result
    assert.deepEqual(serialized, jsonObj)

    // Verify JSON.stringify uses toJSON
    assert.deepEqual(jsonObj, stringified)

    // Serialized should apply all serialization rules
    assert.notProperty(serialized, 'hiddenField')
    assert.notProperty(serialized, 'excludedField')
    assert.equal(serialized.custom_password, 'compare123')
    assert.equal(serialized.renamedField, 'original compare')
    assert.equal(serialized.computedNormal, 'Computed: compare test')
  })

  test('different serialization between database save and JSON response', async ({ assert }) => {
    // Create a model with password field
    const model = await SerializationModel.create({
      normalField: 'api test',
      password: 'secret123'
    })

    // For the database save, the password should be hashed
    const fromDb = await SerializationModel.query()
      .where('_id', model._id)
      .first() as Record<string, any>

    // Direct DB data should have hashed password
    assert.equal(fromDb.password, 'hashed_secret123')

    // But when serialized through toJSON on a new model (before saving), it uses the model value
    const newModel = new SerializationModel()
    newModel.password = 'secret123'
    const newModelSerialized = newModel.toJSON()
    assert.equal(newModelSerialized.custom_password, 'secret123')

    // After fetching from database
    const fetched = await SerializationModel.find(model._id)
    const fetchedSerialized = fetched!.toJSON()

    // The serialized version should maintain the custom name and have the hashed password since that's what's stored
    assert.equal(fetchedSerialized.custom_password, 'hashed_secret123')
  })

  test('consume transformations are applied when fetching from database', async ({ assert }) => {
    // Create a model with transformed field
    const model = await SerializationModel.create({
      normalField: 'transform test',
      transformedField: 'TRANSFORMED VALUE'
    })

    // Direct DB data should have uppercase value (no consume transformation)
    const fromDb = await SerializationModel.query()
      .where('_id', model._id)
      .first() as Record<string, any>
    assert.equal(fromDb.transformedField, 'transformed value')

    // When fetching through the model, consume transformation should be applied
    const fetched = await SerializationModel.find(model._id)
    assert.equal(fetched!.transformedField, 'transformed value')

    // When using query().first(), consume transformation should also be applied now
    const queried = await SerializationModel.query()
      .where('_id', model._id)
      .first()
    assert.equal(queried!.transformedField, 'transformed value')
  })
})