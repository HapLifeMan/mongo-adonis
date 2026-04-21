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
import { MongoModel } from '../../src/model/base_model.js'
import { ObjectId } from 'mongodb'
import { column } from '../../src/model/main.js'

test.group('MongoModel tableName', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('returns collection name when explicitly set', async ({ assert }) => {
    class TestModel extends MongoModel {
      static collection = 'custom_collection'
    }

    assert.equal(TestModel.tableName(), 'custom_collection')
  })

  test('returns pluralized and lowercased model name when collection is not set', async ({ assert }) => {
    class Product extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(Product.tableName(), 'products')
  })

  test('handles singular model names correctly', async ({ assert }) => {
    class User extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(User.tableName(), 'users')
  })

  test('handles plural model names correctly', async ({ assert }) => {
    class Categories extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(Categories.tableName(), 'categories')
  })

  test('handles PascalCase model names correctly', async ({ assert }) => {
    class BlogPost extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(BlogPost.tableName(), 'blog_posts')
  })

  test('handles camelCase model names correctly', async ({ assert }) => {
    class BlogPost extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(BlogPost.tableName(), 'blog_posts')
  })

  test('returns same value on multiple calls', async ({ assert }) => {
    class TestModel extends MongoModel {
      static collection = 'test_collection'
    }

    const first_call = TestModel.tableName()
    const second_call = TestModel.tableName()
    const third_call = TestModel.tableName()

    assert.equal(first_call, 'test_collection')
    assert.equal(second_call, 'test_collection')
    assert.equal(third_call, 'test_collection')
    assert.equal(first_call, second_call)
    assert.equal(second_call, third_call)
  })

  test('boots model before returning table name', async ({ assert }) => {
    class UnbootedModel extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.isFalse(UnbootedModel.booted)
    const table_name = UnbootedModel.tableName()
    assert.isTrue(UnbootedModel.booted)
    assert.equal(table_name, 'unbooted_models')
  })

  test('can be overridden in subclass', async ({ assert }) => {
    class BaseModel extends MongoModel {
      static collection = 'base_collection'
    }

    class ExtendedModel extends BaseModel {
      static tableName(): string {
        return 'extended_collection'
      }
    }

    assert.equal(BaseModel.tableName(), 'base_collection')
    assert.equal(ExtendedModel.tableName(), 'extended_collection')
  })

  test('empty collection name falls back to pluralized model name', async ({ assert }) => {
    class EmptyCollectionModel extends MongoModel {
      static collection = ''
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    const table_name = EmptyCollectionModel.tableName()
    assert.equal(table_name, 'empty_collection_models')
  })

  test('works with special characters in collection name', async ({ assert }) => {
    class SpecialModel extends MongoModel {
      static collection = 'test-collection_name.123'
    }

    assert.equal(SpecialModel.tableName(), 'test-collection_name.123')
  })

  test('works with numeric collection names', async ({ assert }) => {
    class NumericModel extends MongoModel {
      static collection = '123collection'
    }

    assert.equal(NumericModel.tableName(), '123collection')
  })

  test('handles model name with numbers', async ({ assert }) => {
    class Model2 extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(Model2.tableName(), 'model2s')
  })

  test('handles model name with underscores', async ({ assert }) => {
    class Model_Name extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(Model_Name.tableName(), 'model_names')
  })

  test('collection property matches tableName return value', async ({ assert }) => {
    class TestModel extends MongoModel {
      static collection = 'matching_collection'
    }

    TestModel.boot()
    assert.equal(TestModel.collection, TestModel.tableName())
  })

  test('tableName reflects collection changes after boot', async ({ assert }) => {
    class DynamicModel extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    const initial_name = DynamicModel.tableName()
    DynamicModel.collection = 'changed_collection'
    const changed_name = DynamicModel.tableName()

    assert.equal(initial_name, 'dynamic_models')
    assert.equal(changed_name, 'changed_collection')
  })

  test('works with existing fixture models', async ({ assert }) => {
    const { User, Post, Category } = await import('../fixtures.js')

    assert.equal(User.tableName(), 'users')
    assert.equal(Post.tableName(), 'posts')
    assert.equal(Category.tableName(), 'categories')
  })

  test('tableName is idempotent', async ({ assert }) => {
    class IdempotentModel extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    IdempotentModel.tableName()
    const first_boot_state = IdempotentModel.booted
    IdempotentModel.tableName()
    const second_boot_state = IdempotentModel.booted

    assert.isTrue(first_boot_state)
    assert.isTrue(second_boot_state)
    assert.equal(first_boot_state, second_boot_state)
  })

  test('handles complex model names with multiple words', async ({ assert }) => {
    class VeryLongModelName extends MongoModel {
      @column({ isPrimary: true })
      declare _id: ObjectId
    }

    assert.equal(VeryLongModelName.tableName(), 'very_long_model_names')
  })

  test('works correctly with inheritance chain', async ({ assert }) => {
    class GrandParent extends MongoModel {
      static collection = 'grandparent'
    }

    class Parent extends GrandParent {
    }

    class Child extends Parent {
    }

    assert.equal(GrandParent.tableName(), 'grandparent')
    assert.equal(Parent.tableName(), 'grandparent')
    assert.equal(Child.tableName(), 'grandparent')
  })

  test('overridden tableName in child class does not affect parent', async ({ assert }) => {
    class ParentModel extends MongoModel {
      static collection = 'parent_collection'
    }

    class ChildModel extends ParentModel {
      static tableName(): string {
        return 'child_collection'
      }
    }

    assert.equal(ParentModel.tableName(), 'parent_collection')
    assert.equal(ChildModel.tableName(), 'child_collection')
    assert.equal(ParentModel.tableName(), 'parent_collection')
  })
})
