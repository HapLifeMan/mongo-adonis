/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type {
  AnyBulkWriteOperation,
  BulkWriteResult,
  Collection,
  Filter,
  Sort,
  UpdateFilter,
} from 'mongodb'
import { EventEmitter } from 'node:events'
import { MongoModel } from '../model/base_model.js'
import { ObjectId } from 'mongodb'

/**
 * Returns true for plain objects only ({} or Object.create(null)).
 * Class instances (ObjectId, Date, Buffer, Decimal128, ...) must be handed
 * to the driver untouched — recursing into them destroys the value.
 */
function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Run a database operation and emit the `mongodb:query` event with its
 * duration (and error, if any). Shared by the query builder and query client.
 */
export async function executeWithQueryEvent<T>(
  emitter: EventEmitter,
  connection: string,
  query: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = process.hrtime()

  try {
    const result = await fn()
    emitter.emit('mongodb:query', { connection, query, duration: process.hrtime(startTime) })
    return result
  } catch (error) {
    emitter.emit('mongodb:query', { connection, query, duration: process.hrtime(startTime), error })
    throw error
  }
}

/**
 * Maps fluent operators to their MongoDB counterparts
 */
const OPERATOR_MAP: Record<string, string> = {
  '=': '$eq',
  '>': '$gt',
  '>=': '$gte',
  '<': '$lt',
  '<=': '$lte',
  '!=': '$ne',
  'in': '$in',
  'not in': '$nin',
}

/**
 * MongoDB query builder class provides a fluent API to build
 * MongoDB queries.
 */
export class MongoQueryBuilder<Model extends MongoModel = MongoModel> {
  /**
   * Filter for the query
   */
  private filter: Record<string, any> = {}

  /**
   * Sort options for the query
   */
  private sortOptions: Record<string, number> = {}

  /**
   * Projection for the query
   */
  private projection: Record<string, number> = {}

  /**
   * Limit for the query
   */
  private limitValue: number | null = null

  /**
   * Skip for the query
   */
  private skipValue: number | null = null

  /**
   * Model constructor
   */
  private modelConstructor?: typeof MongoModel

  constructor(
    private collectionSource: Collection<any> | (() => Collection<any>),
    private collectionName: string,
    private connectionName: string,
    private emitter: EventEmitter,
    modelConstructor?: typeof MongoModel,
    private ensureReady?: () => Promise<void>
  ) {
    this.modelConstructor = modelConstructor
  }

  /**
   * Resolve the collection, awaiting connection readiness first when the
   * builder was created before the connection finished its handshake.
   */
  private async resolveCollection(): Promise<Collection<any>> {
    if (this.ensureReady) {
      await this.ensureReady()
      this.ensureReady = undefined
    }
    return typeof this.collectionSource === 'function' ? this.collectionSource() : this.collectionSource
  }

  /**
   * Emit-wrapped execution against the resolved collection
   */
  private execute<T>(query: Record<string, any>, fn: (collection: Collection<any>) => Promise<T>): Promise<T> {
    return executeWithQueryEvent(this.emitter, this.connectionName, query, async () => {
      return fn(await this.resolveCollection())
    })
  }

  /**
   * Deep-clone a filter: plain objects and arrays are copied, everything
   * else (ObjectId, Date, RegExp, ...) is shared by reference — those values
   * are treated as immutable by the builder.
   */
  private static cloneFilterValue(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => MongoQueryBuilder.cloneFilterValue(item))
    }
    if (isPlainObject(value)) {
      const out: Record<string, any> = {}
      for (const [key, item] of Object.entries(value)) {
        out[key] = MongoQueryBuilder.cloneFilterValue(item)
      }
      return out
    }
    return value
  }

  /**
   * Clone the query builder
   */
  clone(): MongoQueryBuilder<Model> {
    const clone = new MongoQueryBuilder<Model>(
      this.collectionSource,
      this.collectionName,
      this.connectionName,
      this.emitter,
      this.modelConstructor,
      this.ensureReady
    )

    clone.filter = MongoQueryBuilder.cloneFilterValue(this.filter)
    clone.sortOptions = { ...this.sortOptions }
    clone.projection = { ...this.projection }
    clone.limitValue = this.limitValue
    clone.skipValue = this.skipValue

    return clone
  }

  /**
   * AND a condition into the filter without losing existing conditions on
   * the same field.
   */
  private mergeCondition(key: string, condition: any): void {
    const existing = this.filter[key]

    if (existing === undefined && !(key in this.filter)) {
      this.filter[key] = condition
      return
    }

    if (isPlainObject(existing) && isPlainObject(condition)) {
      Object.assign(existing, condition)
      return
    }

    // Conflicting shapes on the same field (e.g. two equality values, or a
    // scalar plus an operator object) — AND them explicitly.
    if (!Array.isArray(this.filter.$and)) {
      this.filter.$and = []
    }
    this.filter.$and.push({ [key]: condition })
  }

  /**
   * Add a where clause to the query
   */
  where(key: string, value: any): this
  where(key: string, operator: string, value: any): this
  where(key: Record<string, any>): this
  where(keyOrObject: string | Record<string, any>, operatorOrValue?: any, value?: any): this {
    // If first argument is an object, use it directly as a MongoDB query filter
    if (typeof keyOrObject === 'object') {
      const processedQuery = this.processMongoQuery(keyOrObject)

      for (const [key, condition] of Object.entries(processedQuery)) {
        if (key === '$and' && Array.isArray(this.filter.$and) && Array.isArray(condition)) {
          this.filter.$and.push(...condition)
        } else {
          this.mergeCondition(key, condition)
        }
      }
      return this
    }

    const key = keyOrObject as string

    const isOperatorObj = (v: any) => {
      if (!isPlainObject(v)) return false
      const keys = Object.keys(v)
      return keys.length > 0 && keys.every((k) => k.startsWith('$'))
    }

    if (value === undefined) {
      // Two-arg form: either a raw operator object like `{ $exists: true }`
      // or a plain value (equality). Merged so prior operators on the same
      // field (like `{ $gt: … }`) are preserved.
      const val = operatorOrValue
      if (isOperatorObj(val)) {
        this.mergeCondition(key, { ...val })
      } else if (isPlainObject(this.filter[key])) {
        this.filter[key].$eq = val
      } else {
        this.mergeCondition(key, val)
      }
      return this
    }

    const operator = operatorOrValue as string
    const condition =
      operator === 'like'
        ? { $regex: value, $options: 'i' }
        : { [OPERATOR_MAP[operator] ?? operator]: value }

    if (operator === '=' && !(key in this.filter)) {
      this.filter[key] = value
    } else {
      this.mergeCondition(key, condition)
    }

    return this
  }

  /**
   * Process a MongoDB query object: converts RegExp values to
   * $regex/$options form and recurses into plain objects only, so driver
   * types (ObjectId, Date, Buffer, ...) pass through untouched.
   */
  private processMongoQuery(query: Record<string, any>): Record<string, any> {
    if (query === null || query === undefined) {
      return {}
    }

    const result: Record<string, any> = {}

    for (const [key, value] of Object.entries(query)) {
      if (key === '$and' || key === '$or') {
        result[key] = value.map((item: Record<string, any>) => this.processMongoQuery(item))
      } else if (value instanceof RegExp) {
        result[key] = { $regex: value.source, $options: value.flags || '' }
      } else if (isPlainObject(value)) {
        if (value.$regex instanceof RegExp) {
          const regex = value.$regex
          result[key] = { ...value, $regex: regex.source, $options: regex.flags || value.$options || '' }
        } else {
          result[key] = this.processMongoQuery(value)
        }
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Add a whereIn clause to the query
   */
  whereIn(key: string, values: any[]): this {
    return this.where(key, 'in', values)
  }

  /**
   * Add a whereNotIn clause to the query
   */
  whereNotIn(key: string, values: any[]): this {
    return this.where(key, 'not in', values)
  }

  /**
   * Add a whereLike clause to the query
   */
  whereLike(key: string, value: string): this {
    return this.where(key, 'like', value)
  }

  /**
   * Add a whereExists clause to the query
   */
  whereExists(key: string, exists: boolean = true): this {
    return this.where(key, { $exists: exists })
  }

  /**
   * Add a whereNull clause to the query
   */
  whereNull(key: string): this {
    return this.where(key, null)
  }

  /**
   * Add a whereNotNull clause to the query
   */
  whereNotNull(key: string): this {
    return this.where(key, '!=', null)
  }

  /**
   * Add an orWhere clause to the query
   */
  orWhere(key: string, value: any): this
  orWhere(key: string, operator: string, value: any): this
  orWhere(key: string, operatorOrValue: any, value?: any): this {
    // Build the new condition in isolation
    const newCondition: Record<string, any> = {}

    if (value === undefined) {
      newCondition[key] = operatorOrValue
    } else {
      const tempBuilder = new MongoQueryBuilder(
        this.collectionSource,
        this.collectionName,
        this.connectionName,
        this.emitter
      )
      tempBuilder.where(key, operatorOrValue, value)
      Object.assign(newCondition, tempBuilder.filter)
    }

    // If this is the first orWhere call and there are existing filters
    if (!this.filter.$or) {
      if (Object.keys(this.filter).length > 0) {
        // Convert existing filters to $or structure
        const existingConditions = { ...this.filter }
        this.filter = {
          $or: [existingConditions, newCondition]
        }
      } else {
        // No existing conditions, just add the new condition normally
        Object.assign(this.filter, newCondition)
      }
    } else {
      // $or already exists, just add the new condition
      this.filter.$or.push(newCondition)
    }

    return this
  }

  /**
   * Add a select clause to the query
   */
  select(...fields: string[]): this {
    fields.forEach((field) => {
      this.projection[field] = 1
    })
    return this
  }

  /**
   * Add an orderBy clause to the query
   */
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.sortOptions[field] = String(direction).toLowerCase() === 'desc' ? -1 : 1
    return this
  }

  /**
   * Add a limit clause to the query
   */
  limit(value: number): this {
    this.limitValue = value
    return this
  }

  /**
   * Add a skip clause to the query
   */
  offset(value: number): this {
    this.skipValue = value
    return this
  }

  /**
   * Execute the query and return the first result. Runs on a clone, so the
   * builder itself keeps its limit untouched and can be reused.
   */
  async first(): Promise<Model | null> {
    const results = await this.clone().limit(1).exec()
    return results[0] || null
  }

  /**
   * Execute the query and return all results
   */
  async all(): Promise<Model[]> {
    return this.exec()
  }

  /**
   * Execute the query and return the count.
   * Without a filter this uses estimatedDocumentCount (metadata, O(1));
   * with a filter it runs an exact countDocuments.
   */
  async count(): Promise<number> {
    return this.execute({ count: true, filter: this.filter }, (collection) => {
      const hasFilter = Object.keys(this.filter).length > 0
      return hasFilter
        ? collection.countDocuments(this.filter)
        : collection.estimatedDocumentCount()
    })
  }

  /**
   * Apply projection/sort/limit/skip to a find cursor
   */
  private applyCursorOptions(cursor: any): any {
    if (Object.keys(this.projection).length > 0) {
      cursor = cursor.project(this.projection)
    }
    if (Object.keys(this.sortOptions).length > 0) {
      cursor = cursor.sort(this.sortOptions as unknown as Sort)
    }
    if (this.limitValue !== null) {
      cursor = cursor.limit(this.limitValue)
    }
    if (this.skipValue !== null) {
      cursor = cursor.skip(this.skipValue)
    }
    return cursor
  }

  /**
   * Shape of the query descriptor used for `mongodb:query` events
   */
  private queryDescriptor(extra: Record<string, any> = {}): Record<string, any> {
    return {
      ...extra,
      filter: this.filter,
      projection: this.projection,
      sort: this.sortOptions,
      limit: this.limitValue,
      skip: this.skipValue,
    }
  }

  /**
   * Execute the query and return the results
   */
  async exec(): Promise<Model[]> {
    const results: Record<string, any>[] = await this.execute(this.queryDescriptor(), (collection) => {
      return this.applyCursorOptions(collection.find(this.filter as Filter<Model>)).toArray()
    })

    if (this.modelConstructor) {
      return results.map((result: Record<string, any>) => this.modelConstructor!.$hydrateRow(result)) as Model[]
    }

    return results as unknown as Model[]
  }

  /**
   * Stream results one document at a time via an async iterator.
   * Prefer this over `.all()` for large result sets — the cursor is closed
   * automatically when iteration ends or the caller breaks out.
   */
  async *stream(): AsyncGenerator<Model, void, void> {
    const startTime = process.hrtime()
    const collection = await this.resolveCollection()
    const cursor = this.applyCursorOptions(collection.find(this.filter as Filter<Model>))

    try {
      for await (const doc of cursor) {
        if (this.modelConstructor) {
          yield this.modelConstructor.$hydrateRow(doc) as Model
        } else {
          yield doc as unknown as Model
        }
      }
    } finally {
      await cursor.close().catch(() => { /* cursor already closed */ })
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: this.queryDescriptor({ stream: true }),
        duration: process.hrtime(startTime),
      })
    }
  }

  /**
   * Execute the query and update documents. Plain objects without update
   * operators are wrapped in `$set` automatically.
   */
  async update(data: UpdateFilter<Model> | Record<string, any>): Promise<number> {
    const hasOperators = Object.keys(data).some((key) => key.startsWith('$'))
    const updateDoc = hasOperators ? data : { $set: data }

    return this.execute({ update: true, filter: this.filter, data: updateDoc }, async (collection) => {
      const result = await collection.updateMany(this.filter, updateDoc as any)
      return result.modifiedCount
    })
  }

  /**
   * Execute the query and delete documents
   */
  async delete(): Promise<number> {
    return this.execute({ delete: true, filter: this.filter }, async (collection) => {
      const result = await collection.deleteMany(this.filter)
      return result.deletedCount || 0
    })
  }

  /**
   * Execute the query and insert a document
   */
  async insert(data: Record<string, any>): Promise<ObjectId> {
    return this.execute({ insert: true, data }, async (collection) => {
      const result = await collection.insertOne(data as any)
      return result.insertedId
    })
  }

  /**
   * Execute the query and insert multiple documents
   */
  async insertMany(data: Record<string, any>[]): Promise<ObjectId[]> {
    return this.execute({ insertMany: true, data }, async (collection) => {
      const result = await collection.insertMany(data as any)
      return Object.values(result.insertedIds)
    })
  }

  /**
   * Send several writes in a single round trip. Operations are the driver's
   * own (`insertOne`, `updateOne`, `deleteOne`, ...) and are **not** filtered
   * by the builder's `where` clauses — each one carries its own filter.
   *
   * Unordered, so one failing operation does not abort the rest.
   */
  async bulkWrite(operations: AnyBulkWriteOperation<any>[]): Promise<BulkWriteResult> {
    return this.execute({ bulkWrite: true, operations }, async (collection) => {
      return collection.bulkWrite(operations, { ordered: false })
    })
  }

  /**
   * Execute the query and paginate the results.
   * Runs the count and the page fetch in parallel — they're independent
   * round trips and MongoDB happily serves them concurrently over the pool.
   */
  async paginate(page: number = 1, perPage: number = 20): Promise<{
    total: number
    perPage: number
    lastPage: number
    page: number
    data: Model[]
  }> {
    const dataQuery = this.clone().offset((page - 1) * perPage).limit(perPage)
    const [total, data] = await Promise.all([
      this.count(),
      dataQuery.exec(),
    ])

    return {
      total,
      perPage,
      lastPage: Math.ceil(total / perPage),
      page,
      data,
    }
  }

  /**
   * Execute an aggregation pipeline
   *
   * @param pipeline An array of aggregation pipeline stages
   * @returns The result of the aggregation pipeline
   */
  async aggregate<T = any>(pipeline: any[]): Promise<T[]> {
    // Filter out any falsy stages (undefined, null, false)
    // This allows for conditional pipeline stages
    const validPipeline = pipeline.filter(Boolean)

    // Process $match stages so RegExp values work and driver types survive
    const processedPipeline = validPipeline.map((stage) => {
      const processedStage: Record<string, any> = {}

      for (const [key, value] of Object.entries(stage)) {
        if (key === '$match' && typeof value === 'object' && value !== null) {
          processedStage[key] = this.processMongoQuery(value as Record<string, any>)
        } else {
          processedStage[key] = value
        }
      }

      return processedStage
    })

    return this.execute({ aggregate: true, pipeline: processedPipeline }, (collection) => {
      return collection.aggregate(processedPipeline).toArray() as Promise<T[]>
    })
  }
}
