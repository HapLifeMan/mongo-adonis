/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ObjectId } from 'mongodb'
import Macroable from '@poppinss/macroable'
import Hooks from '@poppinss/hooks'
import pluralize from 'pluralize'

import * as errors from '../errors.js'
import { MongoAdapter } from './adapter.js'
import { MongoQueryBuilder } from '../querybuilder/query_builder.js'

/**
 * Shape of the model constructor
 */
export interface MongoModelConstructor {
  new (): MongoModel
  $adapter: MongoAdapter
  boot(): void
  booted: boolean
  primaryKey: string
  collection: string
  connection: string
  query<T extends MongoModel>(): MongoQueryBuilder<T>
  all<T extends MongoModel>(): Promise<T[]>
  find<T extends MongoModel>(id: string): Promise<T | null>
  findBy<T extends MongoModel>(key: string, value: any): Promise<T | null>
  create<T extends MongoModel>(data: Partial<T>): Promise<T>
  createMany<T extends MongoModel>(data: Partial<T>[]): Promise<T[]>
  updateOrCreate<T extends MongoModel>(search: Partial<T>, data: Partial<T>): Promise<T>
  firstOrCreate<T extends MongoModel>(search: Partial<T>, data?: Partial<T>): Promise<T>
  firstOrNew<T extends MongoModel>(search: Partial<T>, data?: Partial<T>): Promise<T>
  truncate(): Promise<void>

  // Lifecycle hooks
  beforeCreate?(model: MongoModel): void | Promise<void>
  afterCreate?(model: MongoModel): void | Promise<void>
  beforeUpdate?(model: MongoModel): void | Promise<void>
  afterUpdate?(model: MongoModel): void | Promise<void>
  beforeDelete?(model: MongoModel): void | Promise<void>
  afterDelete?(model: MongoModel): void | Promise<void>
  beforeFind?(query: MongoQueryBuilder<any>): void | Promise<void>
  afterFind?(model: MongoModel): void | Promise<void>
  beforeSave?(model: MongoModel): void | Promise<void>
  afterSave?(model: MongoModel): void | Promise<void>
}

/**
 * Base model for MongoDB models
 */
export class MongoModel extends Macroable {
  /**
   * Index signature to allow string indexing
   */
  [key: string]: any

  /**
   * Static properties
   */
  public static $adapter: MongoAdapter
  public static booted: boolean = false
  public static primaryKey: string = '_id'
  public static collection: string
  public static connection: string = 'mongodb'
  public static $hooks = new Hooks()

  /**
   * Instance properties
   */
  public $primaryKeyValue?: string | ObjectId
  public $isNew: boolean = true
  public $original: Record<string, any> = {}
  public $attributes: Record<string, any> = {}

  /**
   * Get the constructor of the model
   */
  private get $constructor(): MongoModelConstructor {
    return this.constructor as MongoModelConstructor
  }

  /**
   * Get the primary key name
   */
  public get $primaryKey(): string {
    return this.$constructor.primaryKey
  }

  /**
   * Get the collection name
   */
  public get $collection(): string {
    return this.$constructor.collection
  }

  /**
   * Get the connection name
   */
  public get $connection(): string {
    return this.$constructor.connection
  }

  constructor() {
    super()
    this.$constructor.boot()
  }

  /**
   * Static Methods
   */
  public static boot(): void {
    if (this.booted) return

    if (!this.collection) {
      this.collection = pluralize(this.name).toLowerCase()
    }

    this.booted = true
  }

  public static query<T extends MongoModel>(): MongoQueryBuilder<T> {
    this.boot()
    const queryBuilder = this.$adapter.query(this).as<MongoQueryBuilder<T>>()

    if (queryBuilder instanceof MongoQueryBuilder) {
      queryBuilder['modelConstructor'] = this
    }

    return queryBuilder
  }

  public static async all<T extends MongoModel>(): Promise<T[]> {
    return this.query<T>().all() as Promise<T[]>
  }

  /**
   * Create a model instance from a database result
   * @internal
   */
  private static createModelFromResult<T extends MongoModel>(result: Record<string, any> | null): T | null {
    if (!result) {
      return null
    }

    const model = new this() as T

    // Process the data with consume transformations
    model.processFromDatabase(result)

    // Set the primary key value and mark as not new
    model.$primaryKeyValue = result[this.primaryKey]
    model.$isNew = false

    // Store original data
    model.$original = { ...model.toObject() }

    return model
  }

  public static async find<T extends MongoModel>(id: string): Promise<T | null> {
    const query = this.query<T>()
    const constructor = this as unknown as MongoModelConstructor

    if (typeof constructor.beforeFind === 'function') {
      await constructor.beforeFind(query)
    }

    const result = await query.where(this.primaryKey, new ObjectId(id)).first() as Record<string, any> | null
    const model = this.createModelFromResult<T>(result)

    if (model && typeof constructor.afterFind === 'function') {
      await constructor.afterFind(model)
    }

    return model
  }

  public static async findBy<T extends MongoModel>(key: string, value: any): Promise<T | null> {
    const query = this.query<T>()
    const constructor = this as unknown as MongoModelConstructor

    if (typeof constructor.beforeFind === 'function') {
      await constructor.beforeFind(query)
    }

    const result = await query.where(key, value).first() as Record<string, any> | null
    const model = this.createModelFromResult<T>(result)

    if (model && typeof constructor.afterFind === 'function') {
      await constructor.afterFind(model)
    }

    return model
  }

  public static async create<T extends MongoModel>(data: Partial<T>): Promise<T> {
    const model = new this() as T
    Object.assign(model, data)
    await model.save()
    return model
  }

  public static async createMany<T extends MongoModel>(data: Partial<T>[]): Promise<T[]> {
    const models = data.map((item) => {
      const model = new this() as T
      Object.assign(model, item)
      return model
    })

    await Promise.all(models.map((model) => model.save()))
    return models
  }

  public static async updateOrCreate<T extends MongoModel>(
    search: Partial<T>,
    data: Partial<T>
  ): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const model = await query.first() as T | null

    if (model) {
      Object.assign(model, data)
      await model.save()
      return model
    }

    return this.create<T>({ ...search, ...data })
  }

  public static async firstOrCreate<T extends MongoModel>(
    search: Partial<T>,
    data?: Partial<T>
  ): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const result = await query.first() as Record<string, any> | null
    const model = this.createModelFromResult<T>(result)

    if (model) {
      return model
    }

    return this.create<T>({ ...search, ...(data || {}) })
  }

  public static async firstOrNew<T extends MongoModel>(
    search: Partial<T>,
    data?: Partial<T>
  ): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const result = await query.first() as Record<string, any> | null
    const model = this.createModelFromResult<T>(result)

    if (model) {
      return model
    }

    const newModel = new this() as T
    Object.assign(newModel, { ...search, ...(data || {}) })
    return newModel
  }

  public static async truncate(): Promise<void> {
    this.boot()
    await this.$adapter.truncate(this)
  }

  /**
   * Instance Methods
   */
  public fill(attributes: Record<string, any>): this {
    // Process the data with consume transformations
    this.processFromDatabase(attributes)
    return this
  }

  public getAttribute(key: string): any {
    return this[key]
  }

  public setAttribute(key: string, value: any): void {
    this[key] = value
  }

  public isDirty(key?: string): boolean {
    if (this.$isNew) return true

    if (key) {
      return this[key] !== this.$original[key]
    }

    return Object.keys(this.$attributes).some((key) => this[key] !== this.$original[key])
  }

  public async save(): Promise<this> {
    const Constructor = this.$constructor
    const query = Constructor.query()

    if (typeof Constructor.beforeSave === 'function') {
      await Constructor.beforeSave(this)
    }

    if (this.$isNew) {
      if (typeof Constructor.beforeCreate === 'function') {
        await Constructor.beforeCreate(this)
      }
    } else {
      if (typeof Constructor.beforeUpdate === 'function') {
        await Constructor.beforeUpdate(this)
      }
    }

    const attributes = this.toObject()
    const isNew = this.$isNew

    if (isNew) {
      const id = await query.insert(attributes as any)
      this.$primaryKeyValue = id
      this.$isNew = false
    } else {
      if (!this.$primaryKeyValue) {
        throw new errors.ModelPrimaryKeyMissingException(
          `Missing primary key value when updating model`
        )
      }

      await query
        .where(this.$primaryKey, this.$primaryKeyValue)
        .update({ $set: attributes })
    }

    await this.refresh().catch(() => {
      // If refresh fails, just continue
    })

    if (typeof Constructor.afterSave === 'function') {
      await Constructor.afterSave(this)
    }

    if (isNew) {
      if (typeof Constructor.afterCreate === 'function') {
        await Constructor.afterCreate(this)
      }
    } else {
      if (typeof Constructor.afterUpdate === 'function') {
        await Constructor.afterUpdate(this)
      }
    }

    this.$original = { ...this.toObject() }

    return this
  }

  public async delete(): Promise<void> {
    if (this.$isNew || !this.$primaryKeyValue) {
      throw new errors.ModelPrimaryKeyMissingException(
        `Missing primary key value when deleting model`
      )
    }

    const Constructor = this.$constructor

    if (typeof Constructor.beforeDelete === 'function') {
      await Constructor.beforeDelete(this)
    }

    await Constructor.query()
      .where(this.$primaryKey, this.$primaryKeyValue)
      .delete()

    if (typeof Constructor.afterDelete === 'function') {
      await Constructor.afterDelete(this)
    }
  }

  public async refresh(): Promise<this> {
    if (this.$isNew || !this.$primaryKeyValue) {
      throw new errors.ModelPrimaryKeyMissingException(
        `Missing primary key value when refreshing model`
      )
    }

    const Constructor = this.$constructor
    const model = await Constructor.find(this.$primaryKeyValue.toString())

    if (!model) {
      this.$isNew = true
      this.$primaryKeyValue = undefined
      return this
    }

    // Process the data with consume transformations
    this.processFromDatabase(model)
    this.$original = { ...this.toObject() }

    return this
  }

  public toObject(): Record<string, any> {
    const obj: Record<string, any> = {}

    // Get column definitions from prototype
    const columnsDefinitions = this.constructor.prototype?.$columnsDefinitions

    for (const key in this) {
      if (Object.prototype.hasOwnProperty.call(this, key) && !key.startsWith('$')) {
        const value = this[key]

        // Apply prepare transformations if saving to database
        if (columnsDefinitions && columnsDefinitions.has(key)) {
          const columnDef = columnsDefinitions.get(key)
          const columnName = columnDef.columnName || key

          // Apply prepare transformation if it's a function
          if (typeof columnDef.prepare === 'function') {
            obj[columnName] = columnDef.prepare(value)
          } else {
            obj[columnName] = value
          }
        } else {
          obj[key] = value
        }
      }
    }
    return obj
  }

  /**
   * Process data when loading from database, applying consume transformations
   */
  private processFromDatabase(data: Record<string, any>): void {
    // Get column definitions from prototype
    const columnsDefinitions = this.constructor.prototype?.$columnsDefinitions

    if (!columnsDefinitions) {
      // If no column definitions, just copy all data
      Object.assign(this, data)
      return
    }

    // Process each property from the database
    Object.entries(data).forEach(([key, value]) => {
      // Find the property name associated with this column name
      let propertyName = key
      let foundColumnDef = null

      // Look through definitions to find matching column
      for (const [propName, def] of columnsDefinitions.entries()) {
        if (def.columnName === key) {
          propertyName = propName
          foundColumnDef = def
          break
        }
      }

      // Apply consume transformation if it's a function
      if (foundColumnDef && typeof foundColumnDef.consume === 'function') {
        this[propertyName] = foundColumnDef.consume(value)
      } else {
        this[propertyName] = value
      }
    })
  }

  public toJSON(): Record<string, any> {
    return this.toObject()
  }
}