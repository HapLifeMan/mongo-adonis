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
 * ------------------------------------------------------
 * Custom Lucid Types
 * ------------------------------------------------------
 */

export interface ModelObject {
  [key: string]: any
}

export interface LucidRow {
  $primaryKeyValue?: any
  $isPersisted: boolean
  $isNew: boolean
  $isLocal: boolean
  $isDeleted: boolean
  $id: any
  $dirty: ModelObject
  $isDirty: boolean
  $original: ModelObject
  $attributes: ModelObject

  $preloaded: { [relation: string]: any }

  $extras: ModelObject
  $columns: any
  $sideloaded: ModelObject

  save(): Promise<this>
  delete(): Promise<void>
  refresh(): Promise<this>
  serialize(attributes?: any): ModelObject
  fill(value: ModelObject): this
  merge(value: ModelObject): this

  $getAttributeFromCache(key: string, callback: (value: any) => any): any

  useTransaction(trx: any): this
  useConnection(connection: string): this
  isDirty(keys?: any): boolean
  toObject(): ModelObject

  $hydrateOriginals(): void

  enableForceUpdate(): this
  lockForUpdate(): Promise<any>

  // Return 'any' to satisfy LazyLoadAggregatesContract compatibility
  loadAggregate(relation: any, callback?: any): any
  loadCount(relation: any, callback?: any): any

  load(relation: any, callback?: any): Promise<void>
  preload(relation: any, callback?: any): Promise<void>
  loadOnce(relation: any, callback?: any): Promise<void>
}

/**
 * Shape of the model constructor
 */
export interface MongoModelConstructor {
  new(): MongoModel
  $adapter: MongoAdapter
  boot(): void
  booted: boolean
  primaryKey: string
  collection: string
  connection: string
  query<T extends MongoModel>(this: new () => T): MongoQueryBuilder<T>
  all<T extends MongoModel>(this: new () => T): Promise<T[]>
  find<T extends MongoModel>(this: new () => T, _id: string | ObjectId): Promise<T | null>
  findBy<T extends MongoModel>(this: new () => T, key: string, value: any): Promise<T | null>
  create<T extends MongoModel>(this: new () => T, data: Partial<T>): Promise<T>
  createMany<T extends MongoModel>(this: new () => T, data: Partial<T>[]): Promise<T[]>
  updateOrCreate<T extends MongoModel>(this: new () => T, search: Partial<T>, data: Partial<T>): Promise<T>
  firstOrCreate<T extends MongoModel>(this: new () => T, search: Partial<T>, data?: Partial<T>): Promise<T>
  firstOrNew<T extends MongoModel>(this: new () => T, search: Partial<T>, data?: Partial<T>): Promise<T>
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
export class MongoModel extends Macroable implements LucidRow {
  /**
   * Index signature
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
   * ------------------------------------------------------
   * LucidRow State & Props
   * ------------------------------------------------------
   */
  public $primaryKeyValue?: any
  public $isNew: boolean = true
  public $isLocal: boolean = true
  public $isPersisted: boolean = false
  public $isDeleted: boolean = false
  public $hydrated: boolean = false

  public $tenant: any
  public $trx: any = undefined
  public $options?: any

  public $original: ModelObject = {}
  public $attributes: ModelObject = {}
  public $preloaded: { [relation: string]: any } = {}
  public $cachedAttributes: ModelObject = {}

  public $extras: ModelObject = {}
  public $sideloaded: ModelObject = {}
  public $columns: any = {}

  /**
   * ------------------------------------------------------
   * Getters
   * ------------------------------------------------------
   */
  public get $id(): any {
    return this.$primaryKeyValue
  }

  public get $dirty(): ModelObject {
    const dirty: ModelObject = {}
    for (const key of Object.keys(this.$attributes)) {
      if (this[key] !== this.$original[key]) {
        dirty[key] = this[key]
      }
    }
    return dirty
  }

  public get $isDirty(): boolean {
    return this.isDirty()
  }

  public get $primaryKey(): string {
    return this.$constructor.primaryKey
  }

  private get $constructor(): MongoModelConstructor {
    return this.constructor as MongoModelConstructor
  }

  public get $collection(): string {
    return this.$constructor.collection
  }

  public get $connection(): string {
    return this.$constructor.connection
  }

  constructor() {
    super()
    this.$constructor.boot()
  }

  /**
   * ------------------------------------------------------
   * Static Methods
   * ------------------------------------------------------
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
    return this.query<T>().all()
  }

  private static createModelFromResult<T extends MongoModel>(result: Record<string, any> | null): T | null {
    if (!result) return null
    const model = new this() as T

    model.processFromDatabase(result)
    model.$primaryKeyValue = result[this.primaryKey]
    model.$isNew = false
    model.$isPersisted = true
    model.$isLocal = false
    model.$hydrated = true
    model.$original = { ...model.toObject() }

    return model
  }

  public static async find<T extends MongoModel>(_id: string | ObjectId): Promise<T | null> {
    const query = this.query<T>()
    const constructor = this as unknown as MongoModelConstructor
    if (typeof constructor.beforeFind === 'function') await constructor.beforeFind(query)

    const objectId = typeof _id === 'string' ? new ObjectId(_id) : _id
    const result = await query.where(this.primaryKey, objectId).first()
    const model = this.createModelFromResult<T>(result as Record<string, any> | null)

    if (model && typeof constructor.afterFind === 'function') await constructor.afterFind(model)
    return model
  }

  public static async findBy<T extends MongoModel>(key: string, value: any): Promise<T | null> {
    const query = this.query<T>()
    const constructor = this as unknown as MongoModelConstructor
    if (typeof constructor.beforeFind === 'function') await constructor.beforeFind(query)

    const result = await query.where(key, value).first()
    const model = this.createModelFromResult<T>(result as Record<string, any> | null)

    if (model && typeof constructor.afterFind === 'function') await constructor.afterFind(model)
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

  public static async updateOrCreate<T extends MongoModel>(search: Partial<T>, data: Partial<T>): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const model = await query.first()

    if (model) {
      Object.assign(model, data)
      await model.save()
      return model
    }
    return this.create<T>({ ...search, ...data })
  }

  public static async firstOrCreate<T extends MongoModel>(search: Partial<T>, data?: Partial<T>): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const result = await query.first()
    const model = this.createModelFromResult<T>(result as Record<string, any> | null)
    if (model) return model
    return this.create<T>({ ...search, ...(data || {}) })
  }

  public static async firstOrNew<T extends MongoModel>(search: Partial<T>, data?: Partial<T>): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const result = await query.first()
    const model = this.createModelFromResult<T>(result as Record<string, any> | null)
    if (model) return model

    const newModel = new this() as T
    Object.assign(newModel, { ...search, ...(data || {}) })
    return newModel
  }

  public static async truncate(): Promise<void> {
    this.boot()
    await this.$adapter.truncate(this)
  }

  /**
   * ------------------------------------------------------
   * Instance Methods (Lucid Compatible)
   * ------------------------------------------------------
   */
  public fill(attributes: Record<string, any>): this {
    this.processFromDatabase(attributes)
    return this
  }

  public merge(attributes: Record<string, any>): this {
    return this.fill(attributes)
  }

  public async save(): Promise<this> {
    const Constructor = this.$constructor
    const query = Constructor.query()

    if (typeof Constructor.beforeSave === 'function') await Constructor.beforeSave(this)

    const isNew = this.$isNew
    if (isNew) {
      if (typeof Constructor.beforeCreate === 'function') await Constructor.beforeCreate(this)
    } else {
      if (typeof Constructor.beforeUpdate === 'function') await Constructor.beforeUpdate(this)
    }

    const attributes = this.toObject()

    if (isNew) {
      const id = await query.insert(attributes as any)
      this.$primaryKeyValue = id
      this.$isNew = false
      this.$isPersisted = true
      this.$isLocal = false
      this.$hydrated = true
      await this.refresh()
    } else {
      if (!this.$primaryKeyValue) {
        throw new errors.ModelPrimaryKeyMissingException(`Missing primary key value when updating model`)
      }
      await query.where(this.$primaryKey, this.$primaryKeyValue).update({ $set: attributes })
      await this.refresh()
    }

    if (typeof Constructor.afterSave === 'function') await Constructor.afterSave(this)
    if (isNew) {
      if (typeof Constructor.afterCreate === 'function') await Constructor.afterCreate(this)
    } else {
      if (typeof Constructor.afterUpdate === 'function') await Constructor.afterUpdate(this)
    }

    return this
  }

  public async delete(): Promise<void> {
    if (this.$isNew || !this.$primaryKeyValue) {
      throw new errors.ModelPrimaryKeyMissingException(`Missing primary key value when deleting model`)
    }
    const Constructor = this.$constructor
    if (typeof Constructor.beforeDelete === 'function') await Constructor.beforeDelete(this)

    await Constructor.query().where(this.$primaryKey, this.$primaryKeyValue).delete()
    this.$isDeleted = true
    this.$isPersisted = false

    if (typeof Constructor.afterDelete === 'function') await Constructor.afterDelete(this)
  }

  public async refresh(): Promise<this> {
    if (this.$isNew || !this.$primaryKeyValue) {
      throw new errors.ModelPrimaryKeyMissingException(`Missing primary key value when refreshing model`)
    }

    const Constructor = this.$constructor
    const result = await Constructor.query().where(this.$primaryKey, this.$primaryKeyValue).first()

    if (!result) {
      this.$isNew = true
      this.$isPersisted = false
      this.$primaryKeyValue = undefined
      return this
    }

    this.processFromDatabase(result as Record<string, any>)
    this.$original = { ...this.toObject() }
    this.$isNew = false
    this.$isPersisted = true
    this.$isDeleted = false
    this.$hydrated = true

    return this
  }

  public toObject(): ModelObject {
    const obj: Record<string, any> = {}
    const columnsDefinitions = this.constructor.prototype?.$columnsDefinitions

    for (const key in this) {
      if (Object.prototype.hasOwnProperty.call(this, key) && !key.startsWith('$')) {
        const value = this[key]
        if (columnsDefinitions && columnsDefinitions.has(key)) {
          const columnDef = columnsDefinitions.get(key)
          const columnName = columnDef.columnName || key
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

  public serialize(_attributes?: any): ModelObject {
    const obj: Record<string, any> = {}
    const columnsDefinitions = this.constructor.prototype?.$columnsDefinitions
    const computedDefinitions = this.constructor.prototype?.$computedDefinitions

    for (const key in this) {
      if (Object.prototype.hasOwnProperty.call(this, key) && !key.startsWith('$')) {
        const value = this[key]
        if (columnsDefinitions && columnsDefinitions.has(key)) {
          const columnDef = columnsDefinitions.get(key)
          if (columnDef.serialize === false) continue
          if (columnDef.serializeAs === null) continue
          else if (typeof columnDef.serializeAs === 'string') obj[columnDef.serializeAs] = value
          else obj[key] = value
        } else {
          obj[key] = value
        }
      }
    }

    if (computedDefinitions) {
      for (const [key, def] of computedDefinitions.entries()) {
        if (def.serialize === false) continue
        try {
          const value = this[key]
          if (def.serializeAs === null) continue
          else if (typeof def.serializeAs === 'string') obj[def.serializeAs] = value
          else obj[key] = value
        } catch (error) { }
      }
    }
    return obj
  }

  public toJSON(): ModelObject {
    return this.serialize()
  }

  /**
   * ------------------------------------------------------
   * Compatibility Helpers (Stubs & Implementations)
   * ------------------------------------------------------
   */

  public $hydrateOriginals(): void {
    this.$original = { ...this.$attributes }
  }

  public enableForceUpdate(): this {
    return this
  }

  public async lockForUpdate(): Promise<any> {
    return this
  }

  // FIXED: Return 'any' to satisfy LazyLoadAggregatesContract requirements from Auth package
  public loadAggregate(_relation: any, _callback?: any): any {
    return {
      loadAggregate: () => this,
      loadCount: () => this,
      exec: async () => { }
    }
  }

  public loadCount(_relation: any, _callback?: any): any {
    return {
      loadAggregate: () => this,
      loadCount: () => this,
      exec: async () => { }
    }
  }

  public async load(_relation: any, _callback?: any): Promise<void> {
    return
  }

  public async preload(_relation: any, _callback?: any): Promise<void> {
    return
  }

  public async loadOnce(_relation: any, _callback?: any): Promise<void> {
    return
  }

  public $setAttribute(key: string, value: any): void {
    this.$attributes[key] = value
    this[key] = value
  }

  public $getAttribute(key: string): any {
    return this.$attributes[key]
  }

  public $getAttributeFromCache(key: string, callback: (value: any) => any): any {
    if (this.$cachedAttributes[key]) {
      return this.$cachedAttributes[key]
    }
    const value = callback(this.$attributes[key])
    this.$cachedAttributes[key] = value
    return value
  }

  public $hasAttribute(key: string): boolean {
    return this.$attributes.hasOwnProperty(key)
  }

  public $removeAttribute(key: string): void {
    delete this.$attributes[key]
    delete this[key]
  }

  public getAttribute(key: string): any {
    return this[key]
  }

  public setAttribute(key: string, value: any): void {
    this[key] = value
  }

  public isDirty(keys?: any): boolean {
    if (this.$isNew) return true

    if (keys) {
      if (Array.isArray(keys)) {
        return keys.some(key => this[key] !== this.$original[key])
      }
      return this[keys] !== this.$original[keys]
    }

    return Object.keys(this.$attributes).some((key) => this[key] !== this.$original[key])
  }

  public useTransaction(trx: any): this {
    this.$trx = trx
    return this
  }

  public useConnection(_connection: string): this {
    return this
  }

  public $setOptionsAndTrx(options?: any): void {
    this.$options = options
    if (options && options.client) {
      this.$trx = options.client
    }
  }

  public $getQueryFor(_action: 'insert' | 'update' | 'delete' | 'refresh'): any {
    const Model = this.constructor as MongoModelConstructor
    return Model.query()
  }

  public related(_name: any): any {
    const Model = this.constructor as MongoModelConstructor
    return {
      query: () => Model.query(),
      client: null
    }
  }

  public $getRelation(name: string): any {
    return this.$preloaded[name]
  }

  public $getRelated(name: string): any {
    return this.$getRelation(name)
  }

  public $setRelation(name: string, value: any): void {
    this.$preloaded[name] = value
  }

  public $setRelated(name: string, value: any): void {
    this.$setRelation(name, value)
  }

  public $pushRelation(name: string, value: any): void {
    if (!Array.isArray(this.$preloaded[name])) {
      this.$preloaded[name] = []
    }
    (this.$preloaded[name] as any[]).push(value)
  }

  public $pushRelated(name: string, value: any): void {
    this.$pushRelation(name, value)
  }

  public $hasRelation(name: string): boolean {
    return this.$preloaded.hasOwnProperty(name)
  }

  public $hasRelated(name: string): boolean {
    return this.$hasRelation(name)
  }

  public $consumeAdapterResult(adapterResult: any): void {
    this.processFromDatabase(adapterResult)
    this.$isNew = false
    this.$isPersisted = true
    this.$isLocal = false
    this.$hydrated = true
    this.$original = { ...this.toObject() }
  }

  public $hydrate(row: any): void {
    this.$consumeAdapterResult(row)
  }

  public $map(row: any): void {
    this.processFromDatabase(row)
  }

  public clone(): this {
    const Constructor = this.constructor as any
    const instance = new Constructor()
    instance.fill(this.toObject())
    return instance
  }

  public serializeAttributes(fields?: any, _strategy?: any): ModelObject {
    return this.serialize(fields)
  }

  public serializeComputed(_fields?: any): ModelObject {
    return {}
  }

  public serializeRelations(_fields?: any, _strategy?: any): ModelObject {
    return {}
  }

  /**
   * Process data from DB and apply consume transformations
   */
  public processFromDatabase(data: Record<string, any>): void {
    const columnsDefinitions = this.constructor.prototype?.$columnsDefinitions

    // Sync attributes
    this.$attributes = { ...data }

    if (!columnsDefinitions) {
      Object.assign(this, data)
      return
    }

    Object.entries(data).forEach(([key, value]) => {
      let propertyName = key
      let foundColumnDef = null

      for (const [propName, def] of columnsDefinitions.entries()) {
        if (def.columnName === key || propName === key) {
          propertyName = propName
          foundColumnDef = def
          break
        }
      }

      if (foundColumnDef && typeof foundColumnDef.consume === 'function') {
        this[propertyName] = foundColumnDef.consume(value)
      } else {
        this[propertyName] = value
      }
    })
  }
}