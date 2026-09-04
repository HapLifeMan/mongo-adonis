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
import pluralize from 'pluralize'

import * as errors from '../errors.js'
import { MongoAdapter } from './adapter.js'
import { MongoQueryBuilder } from '../querybuilder/query_builder.js'

/**
 * Convert a string to snake_case
 * Matches Lucid's default naming strategy behavior
 */
export function snakeCase(str: string): string {
  return str
    .split('_')
    .map((part) => part.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase())
    .join('_')
    .replace(/_+/g, '_')
}

const hasOwn = (target: any, key: string) => Object.prototype.hasOwnProperty.call(target, key)

function isPlainObjectValue(value: any): boolean {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Copy plain objects/arrays so `$original` is an independent snapshot —
 * otherwise in-place mutation of a nested value would mutate the baseline
 * too and never register as dirty. Driver types (ObjectId, Date, ...) are
 * kept by reference and compared by value in `isEqualValue`.
 */
function deepSnapshot(value: any): any {
  if (Array.isArray(value)) return value.map(deepSnapshot)
  if (isPlainObjectValue(value)) {
    const out: Record<string, any> = {}
    for (const [key, item] of Object.entries(value)) {
      out[key] = deepSnapshot(item)
    }
    return out
  }
  return value
}

/**
 * Structural equality for dirty checking: plain objects/arrays compare
 * deeply, Dates by timestamp, ObjectIds by value, everything else strictly.
 */
function isEqualValue(a: any, b: any): boolean {
  if (a === b) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (a instanceof ObjectId && b instanceof ObjectId) return a.equals(b)
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isEqualValue(item, b[i]))
  }
  if (isPlainObjectValue(a) && isPlainObjectValue(b)) {
    const keysA = Object.keys(a)
    return keysA.length === Object.keys(b).length && keysA.every((key) => isEqualValue(a[key], b[key]))
  }
  return false
}

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
  tableName(): string
  $hydrateRow(row: Record<string, any>): MongoModel
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
  $runHook(name: string, payload: any): Promise<void>

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

  public $trx: any = undefined

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

  /**
   * Property-keyed map of attributes whose prepared (database) value differs
   * from the last known database state.
   */
  public get $dirty(): ModelObject {
    const dirty: ModelObject = {}
    const defs = this.$columnDefinitions()

    for (const key in this) {
      if (!hasOwn(this, key) || key.startsWith('$')) continue
      const def = defs?.get(key)
      const columnName = def?.columnName || key
      const prepared = def && typeof def.prepare === 'function' ? def.prepare(this[key]) : this[key]
      if (!isEqualValue(prepared, this.$original[columnName])) {
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
    // `booted` is static: without the own-property check a subclass would
    // inherit the parent's `true` and never boot itself.
    if (hasOwn(this, 'booted') && this.booted) return
    this.booted = true

    // An explicitly assigned collection is inherited by subclasses, but a
    // name that was auto-derived from a parent's class name is re-derived
    // for each subclass.
    const inheritedAutoDerived = (this as any).$collectionAutoDerived === true && !hasOwn(this, 'collection')
    if (!this.collection || inheritedAutoDerived) {
      this.collection = pluralize(snakeCase(this.name))
      ;(this as any).$collectionAutoDerived = true
    }
  }

  public static tableName(): string {
    this.boot()
    return this.collection
  }

  public static query<T extends MongoModel>(this: MongoModelConstructor & (new () => T)): MongoQueryBuilder<T> {
    this.boot()
    return this.$adapter.query<T>(this)
  }

  public static async all<T extends MongoModel>(this: MongoModelConstructor & (new () => T)): Promise<T[]> {
    return this.query<T>().all()
  }

  /**
   * Build a fully-hydrated model instance from a raw database row.
   * The single hydration path used by the query builder, refresh and finders.
   */
  public static $hydrateRow<T extends MongoModel>(this: any, row: Record<string, any>): T {
    const model = new this() as T
    model.$consumeAdapterResult(row)
    return model
  }

  public static async find<T extends MongoModel>(this: MongoModelConstructor & (new () => T), _id: string | ObjectId): Promise<T | null> {
    const query = this.query<T>()
    await this.$runHook('beforeFind', query)

    // Coerce only valid ObjectId strings so custom (non-ObjectId) primary
    // keys keep working.
    const idValue = typeof _id === 'string' && ObjectId.isValid(_id) ? new ObjectId(_id) : _id
    const model = await query.where(this.primaryKey, idValue).first()

    if (model) await this.$runHook('afterFind', model)
    return model
  }

  public static async findBy<T extends MongoModel>(this: MongoModelConstructor & (new () => T), key: string, value: any): Promise<T | null> {
    const query = this.query<T>()
    await this.$runHook('beforeFind', query)

    const model = await query.where(key, value).first()

    if (model) await this.$runHook('afterFind', model)
    return model
  }

  public static async create<T extends MongoModel>(this: MongoModelConstructor & (new () => T), data: Partial<T>): Promise<T> {
    const model = new this() as T
    Object.assign(model, data)
    await model.save()
    return model
  }

  public static async createMany<T extends MongoModel>(this: MongoModelConstructor & (new () => T), data: Partial<T>[]): Promise<T[]> {
    if (data.length === 0) return []

    const models = data.map((item) => {
      const model = new this() as T
      Object.assign(model, item)
      return model
    })

    // Run per-model before hooks, then persist everything in one insertMany
    // round trip, then run per-model after hooks.
    const payloads: Record<string, any>[] = []
    for (const model of models) {
      payloads.push(await model.$prepareForInsert())
    }

    const ids = await this.query<T>().insertMany(payloads)

    for (let i = 0; i < models.length; i++) {
      await models[i].$finalizeInsert(ids[i], payloads[i])
    }

    return models
  }

  public static async updateOrCreate<T extends MongoModel>(this: MongoModelConstructor & (new () => T), search: Partial<T>, data: Partial<T>): Promise<T> {
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

  public static async firstOrCreate<T extends MongoModel>(this: MongoModelConstructor & (new () => T), search: Partial<T>, data?: Partial<T>): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const model = await query.first()
    if (model) {
      return model
    }
    return this.create<T>({ ...search, ...(data || {}) })
  }

  public static async firstOrNew<T extends MongoModel>(this: MongoModelConstructor & (new () => T), search: Partial<T>, data?: Partial<T>): Promise<T> {
    const query = this.query<T>()
    Object.entries(search).forEach(([key, value]) => query.where(key, value))
    const model = await query.first()
    if (model) {
      return model
    }

    const newModel = new this() as T
    Object.assign(newModel, { ...search, ...(data || {}) })
    return newModel
  }

  public static async truncate(): Promise<void> {
    this.boot()
    await this.$adapter.truncate(this as unknown as MongoModelConstructor)
  }

  /**
   * Run a static lifecycle hook when defined
   */
  public static async $runHook(name: string, payload: any): Promise<void> {
    const fn = (this as any)[name]
    if (typeof fn === 'function') {
      await fn.call(this, payload)
    }
  }

  /**
   * ------------------------------------------------------
   * Instance Methods (Lucid Compatible)
   * ------------------------------------------------------
   */

  /**
   * Replace the model attributes with the given ones (mass assignment).
   * Values are set as-is; `consume` transformations only apply to data
   * loaded from the database.
   */
  public fill(attributes: Record<string, any>): this {
    for (const key in this) {
      if (hasOwn(this, key) && !key.startsWith('$')) {
        delete this[key]
      }
    }
    return this.merge(attributes)
  }

  /**
   * Merge the given attributes into the existing ones
   */
  public merge(attributes: Record<string, any>): this {
    for (const [key, value] of Object.entries(attributes)) {
      if (!key.startsWith('$')) {
        this[key] = value
      }
    }
    return this
  }

  /**
   * Run a lifecycle hook defined on this model's constructor
   */
  private async $emitHook(name: string): Promise<void> {
    const fn = (this.$constructor as any)[name]
    if (typeof fn === 'function') {
      await fn.call(this.$constructor, this)
    }
  }

  /**
   * Apply autoCreate/autoUpdate timestamps registered via @column.dateTime
   */
  private $applyTimestamps(): void {
    const timestampColumns = this.constructor.prototype?.$timestampColumns
    if (!timestampColumns) return

    const now = new Date()
    timestampColumns.forEach((config: { autoCreate: boolean; autoUpdate: boolean }, key: string) => {
      // Respect user-supplied values on creation
      if (this.$isNew && config.autoCreate && (this[key] === undefined || this[key] === null)) {
        this[key] = now
      }
      if (!this.$isNew && config.autoUpdate) {
        this[key] = now
      }
    })
  }

  /**
   * Timestamps + before hooks, returns the prepared insert payload
   */
  public async $prepareForInsert(): Promise<Record<string, any>> {
    this.$applyTimestamps()
    await this.$emitHook('beforeSave')
    await this.$emitHook('beforeCreate')
    return this.toObject()
  }

  /**
   * State sync + after hooks once the insert round trip completed
   */
  public async $finalizeInsert(id: any, attributes: Record<string, any>): Promise<void> {
    const primaryKey = this.$primaryKey
    attributes[primaryKey] = id
    this.$primaryKeyValue = id
    this.$isNew = false
    this.$isPersisted = true
    this.$isLocal = false
    this.$hydrated = true

    // Reflect the persisted state on the instance: attribute values become
    // consume(prepare(value)) — exactly what a fresh fetch would produce.
    this.processFromDatabase(attributes)
    this.$original = deepSnapshot(attributes)

    await this.$emitHook('afterCreate')
    await this.$emitHook('afterSave')
  }

  public async save(options: { refresh?: boolean } = {}): Promise<this> {
    if (this.$isNew) {
      const attributes = await this.$prepareForInsert()
      const id = await this.$constructor.query().insert(attributes)
      await this.$finalizeInsert(id, attributes)

      if (options.refresh) {
        await this.refresh()
      }
      return this
    }

    this.$applyTimestamps()
    await this.$emitHook('beforeSave')
    await this.$emitHook('beforeUpdate')

    if (!this.$primaryKeyValue) {
      throw new errors.ModelPrimaryKeyMissingException(`Missing primary key value when updating model`)
    }

    // Write only the fields that changed since the last database sync
    const primaryKey = this.$primaryKey
    const dirtyColumns = this.$dirtyColumns()
    delete dirtyColumns[primaryKey]

    if (Object.keys(dirtyColumns).length > 0) {
      await this.$constructor.query().where(primaryKey, this.$primaryKeyValue).update({ $set: dirtyColumns })
    }

    if (options.refresh) {
      await this.refresh()
    } else {
      // Sync the dirty baseline without a second round trip. Callers that need
      // server-side values (e.g. after $inc, triggers, or schema defaults) can
      // opt in with { refresh: true } or call refresh() explicitly.
      const attributes = this.toObject()
      this.processFromDatabase(attributes)
      this.$original = deepSnapshot(attributes)
    }

    await this.$emitHook('afterUpdate')
    await this.$emitHook('afterSave')

    return this
  }

  public async delete(): Promise<void> {
    if (this.$isNew || !this.$primaryKeyValue) {
      throw new errors.ModelPrimaryKeyMissingException(`Missing primary key value when deleting model`)
    }
    await this.$emitHook('beforeDelete')

    await this.$constructor.query().where(this.$primaryKey, this.$primaryKeyValue).delete()
    this.$isDeleted = true
    this.$isPersisted = false

    await this.$emitHook('afterDelete')
  }

  public async refresh(): Promise<this> {
    if (this.$isNew || !this.$primaryKeyValue) {
      throw new errors.ModelPrimaryKeyMissingException(`Missing primary key value when refreshing model`)
    }

    const result = await this.$constructor.query().where(this.$primaryKey, this.$primaryKeyValue).first()

    if (!result) {
      throw new errors.ModelQueryException(
        `Cannot refresh model "${this.constructor.name}". The row for primary key "${this.$primaryKeyValue}" no longer exists`
      )
    }

    // `result.$attributes` holds the raw database row — re-consume it here
    // instead of round-tripping through the fetched instance's transforms.
    this.$consumeAdapterResult((result as MongoModel).$attributes)
    this.$isDeleted = false

    return this
  }

  /**
   * Serialize instance values into their database representation,
   * applying column name mappings and `prepare` transformations.
   */
  public toObject(): ModelObject {
    const obj: Record<string, any> = {}
    const defs = this.$columnDefinitions()

    for (const key in this) {
      if (hasOwn(this, key) && !key.startsWith('$')) {
        const value = this[key]
        const def = defs?.get(key)
        if (def) {
          const columnName = def.columnName || key
          obj[columnName] = typeof def.prepare === 'function' ? def.prepare(value) : value
        } else {
          obj[key] = value
        }
      }
    }
    return obj
  }

  public serialize(_attributes?: any): ModelObject {
    const obj: Record<string, any> = {}
    const defs = this.$columnDefinitions()
    const computedDefinitions = this.constructor.prototype?.$computedDefinitions

    for (const key in this) {
      if (hasOwn(this, key) && !key.startsWith('$')) {
        const value = this[key]
        const def = defs?.get(key)
        if (def) {
          if (def.serialize === false) continue
          if (def.serializeAs === null) {
            continue
          } else if (typeof def.serializeAs === 'string') {
            obj[def.serializeAs] = value
          } else {
            obj[key] = value
          }
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
          if (def.serializeAs === null) {
            continue
          } else if (typeof def.serializeAs === 'string') {
            obj[def.serializeAs] = value
          } else {
            obj[key] = value
          }
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
    this.$original = deepSnapshot(this.$attributes)
  }

  public enableForceUpdate(): this {
    return this
  }

  public async lockForUpdate(): Promise<any> {
    return this
  }

  public loadAggregate(_relation: any, _callback?: any): any {
    throw new errors.NotImplementedException(
      'loadAggregate() is not implemented. Use .aggregate() on the query builder directly.'
    )
  }

  public loadCount(_relation: any, _callback?: any): any {
    throw new errors.NotImplementedException(
      'loadCount() is not implemented. Run a count query via the related query builder directly.'
    )
  }

  public async load(relation: any, _callback?: any): Promise<void> {
    throw new errors.NotImplementedException(
      `load("${relation}") is not implemented. Access the relation directly (e.g. "await model.${relation}.exec()") until eager loading lands.`
    )
  }

  public async preload(relation: any, _callback?: any): Promise<void> {
    throw new errors.NotImplementedException(
      `preload("${relation}") is not implemented. Access the relation directly (e.g. "await model.${relation}.exec()") until eager loading lands.`
    )
  }

  public async loadOnce(relation: any, _callback?: any): Promise<void> {
    throw new errors.NotImplementedException(
      `loadOnce("${relation}") is not implemented. Access the relation directly (e.g. "await model.${relation}.exec()") until eager loading lands.`
    )
  }

  public related(name: any): any {
    throw new errors.NotImplementedException(
      `related("${name}") is not implemented. Access the relation property directly (e.g. "model.${name}.create()").`
    )
  }

  public $getAttributeFromCache(key: string, callback: (value: any) => any): any {
    if (key in this.$cachedAttributes) {
      return this.$cachedAttributes[key]
    }
    const value = callback(this.$attributes[key])
    this.$cachedAttributes[key] = value
    return value
  }

  public getAttribute(key: string): any {
    return this[key]
  }

  public setAttribute(key: string, value: any): void {
    this[key] = value
  }

  public isDirty(keys?: string | string[]): boolean {
    if (this.$isNew) return true

    const dirty = this.$dirty
    if (!keys) {
      return Object.keys(dirty).length > 0
    }

    const list = Array.isArray(keys) ? keys : [keys]
    return list.some((key) => key in dirty)
  }

  public useTransaction(trx: any): this {
    this.$trx = trx
    return this
  }

  public useConnection(_connection: string): this {
    return this
  }

  public $getRelation(name: string): any {
    return this.$preloaded[name]
  }

  public $setRelation(name: string, value: any): void {
    this.$preloaded[name] = value
  }

  public $pushRelation(name: string, value: any): void {
    if (!Array.isArray(this.$preloaded[name])) {
      this.$preloaded[name] = []
    }
    (this.$preloaded[name] as any[]).push(value)
  }

  public $hasRelation(name: string): boolean {
    return this.$preloaded.hasOwnProperty(name)
  }

  /**
   * Hydrate this instance from a raw database row
   */
  public $consumeAdapterResult(row: Record<string, any>): void {
    this.processFromDatabase(row)
    this.$primaryKeyValue = row[this.$primaryKey] ?? this.$primaryKeyValue
    this.$isNew = false
    this.$isPersisted = true
    this.$isLocal = false
    this.$hydrated = true
    this.$original = deepSnapshot(row)
  }

  public clone(): this {
    const Constructor = this.constructor as any
    const instance = new Constructor()
    // Round-trip through the database representation so prepare/consume
    // transformations produce the same values a fresh fetch would.
    instance.processFromDatabase(this.toObject())
    return instance
  }

  /**
   * ------------------------------------------------------
   * Column metadata helpers
   * ------------------------------------------------------
   */

  private $columnDefinitions(): Map<string, any> | undefined {
    return this.constructor.prototype?.$columnsDefinitions
  }

  /**
   * Cached columnName -> propertyName map, built once per model class
   */
  private $reverseColumnMap(): Map<string, string> | undefined {
    const defs = this.$columnDefinitions()
    if (!defs) return undefined

    const proto = this.constructor.prototype
    if (!hasOwn(proto, '$columnNameToProp') || proto.$columnNameToProp.size < defs.size) {
      const map = new Map<string, string>()
      for (const [prop, def] of defs.entries()) {
        map.set(def.columnName || prop, prop)
      }
      proto.$columnNameToProp = map
    }
    return proto.$columnNameToProp
  }

  /**
   * Column-name-keyed map of prepared values that differ from `$original`.
   * This is exactly the `$set` payload for an update.
   */
  private $dirtyColumns(): Record<string, any> {
    const dirty: Record<string, any> = {}
    const defs = this.$columnDefinitions()

    for (const key in this) {
      if (!hasOwn(this, key) || key.startsWith('$')) continue
      const def = defs?.get(key)
      const columnName = def?.columnName || key
      const value = def && typeof def.prepare === 'function' ? def.prepare(this[key]) : this[key]
      if (!isEqualValue(value, this.$original[columnName])) {
        dirty[columnName] = value
      }
    }

    return dirty
  }

  /**
   * Process data from DB and apply consume transformations
   */
  public processFromDatabase(data: Record<string, any>): void {
    this.$attributes = { ...data }
    const defs = this.$columnDefinitions()

    if (!defs) {
      Object.assign(this, data)
      return
    }

    const reverse = this.$reverseColumnMap()!
    for (const [key, value] of Object.entries(data)) {
      const propertyName = reverse.get(key) || key
      const def = defs.get(propertyName)
      this[propertyName] = def && typeof def.consume === 'function' ? def.consume(value) : value
    }
  }
}
