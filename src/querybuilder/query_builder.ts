/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Collection, Filter, Sort, UpdateFilter } from 'mongodb'
import { EventEmitter } from 'node:events'
import { MongoModel } from '../model/base_model.js'
import { ObjectId } from 'mongodb'

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
    private collection: Collection<any>,
    private collectionName: string,
    private connectionName: string,
    private emitter: EventEmitter,
    modelConstructor?: typeof MongoModel
  ) {
    this.modelConstructor = modelConstructor
  }

  /**
   * Clone the query builder
   */
  clone(): MongoQueryBuilder<Model> {
    const clone = new MongoQueryBuilder<Model>(
      this.collection,
      this.collectionName,
      this.connectionName,
      this.emitter,
      this.modelConstructor
    )

    clone.filter = { ...this.filter }
    clone.sortOptions = { ...this.sortOptions }
    clone.projection = { ...this.projection }
    clone.limitValue = this.limitValue
    clone.skipValue = this.skipValue

    return clone
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
      // Process the query object to handle RegExp objects
      const processedQuery = this.processMongoQuery(keyOrObject)

      // Merge the provided filter with the existing filter
      this.filter = { ...this.filter, ...processedQuery }
      return this
    }

    const key = keyOrObject as string;

    if (value === undefined) {
      this.filter[key] = operatorOrValue
      return this
    }

    const operator = operatorOrValue

    // Check if we already have a condition for this key
    if (this.filter[key] && typeof this.filter[key] === 'object' && !Array.isArray(this.filter[key])) {
      // If we do, we need to merge the new condition with the existing one
      switch (operator) {
        case '=':
          this.filter[key] = value
          break
        case '>':
          this.filter[key].$gt = value
          break
        case '>=':
          this.filter[key].$gte = value
          break
        case '<':
          this.filter[key].$lt = value
          break
        case '<=':
          this.filter[key].$lte = value
          break
        case '!=':
          this.filter[key].$ne = value
          break
        case 'like':
          this.filter[key].$regex = value
          this.filter[key].$options = 'i'
          break
        case 'in':
          this.filter[key].$in = value
          break
        case 'not in':
          this.filter[key].$nin = value
          break
        default:
          this.filter[key][operator] = value
      }
    } else {
      // If not, create a new condition
      switch (operator) {
        case '=':
          this.filter[key] = value
          break
        case '>':
          this.filter[key] = { $gt: value }
          break
        case '>=':
          this.filter[key] = { $gte: value }
          break
        case '<':
          this.filter[key] = { $lt: value }
          break
        case '<=':
          this.filter[key] = { $lte: value }
          break
        case '!=':
          this.filter[key] = { $ne: value }
          break
        case 'like':
          this.filter[key] = { $regex: value, $options: 'i' }
          break
        case 'in':
          this.filter[key] = { $in: value }
          break
        case 'not in':
          this.filter[key] = { $nin: value }
          break
        default:
          this.filter[key] = { [operator]: value }
      }
    }

    return this
  }

  /**
   * Process MongoDB query object to handle RegExp objects
   */
  private processMongoQuery(query: Record<string, any>): Record<string, any> {
    // Handle null or undefined values
    if (query === null || query === undefined) {
      return {}
    }

    const result: Record<string, any> = {}

    for (const [key, value] of Object.entries(query)) {
      if (key === '$and' || key === '$or') {
        // Process logical operators
        result[key] = value.map((item: Record<string, any>) => this.processMongoQuery(item))
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (value instanceof RegExp) {
          // Handle RegExp objects directly
          result[key] = {
            $regex: value.source,
            $options: (value.flags || '')
          }
        } else if (value.$regex instanceof RegExp) {
          // Handle { $regex: /pattern/flags }
          const regex = value.$regex
          result[key] = {
            ...value,
            $regex: regex.source,
            $options: regex.flags || (value.$options || '')
          }
        } else {
          // Process nested objects
          result[key] = this.processMongoQuery(value)
        }
      } else {
        // Keep other values as is
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
    this.filter[key] = { $exists: exists }
    return this
  }

  /**
   * Add a whereNull clause to the query
   */
  whereNull(key: string): this {
    this.filter[key] = null
    return this
  }

  /**
   * Add a whereNotNull clause to the query
   */
  whereNotNull(key: string): this {
    this.filter[key] = { $ne: null }
    return this
  }

  /**
   * Add an orWhere clause to the query
   */
  orWhere(key: string, value: any): this
  orWhere(key: string, operator: string, value: any): this
  orWhere(key: string, operatorOrValue: any, value?: any): this {
    const orBuilder = this.clone()
    orBuilder.filter = {}

    if (value === undefined) {
      orBuilder.filter[key] = operatorOrValue
    } else {
      orBuilder.where(key, operatorOrValue, value)
    }

    if (!this.filter.$or) {
      this.filter.$or = []
    }

    this.filter.$or.push(orBuilder.filter)
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
    this.sortOptions[field] = direction === 'asc' ? 1 : -1
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
   * Execute the query and return the first result
   */
  async first(): Promise<Model | null> {
    const results = await this.limit(1).exec()
    return results[0] || null
  }

  /**
   * Execute the query and return all results
   */
  async all(): Promise<Model[]> {
    return this.exec()
  }

  /**
   * Execute the query and return the count
   */
  async count(): Promise<number> {
    const startTime = process.hrtime()

    try {
      const count = await this.collection.countDocuments(this.filter)

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { count: true, filter: this.filter },
        duration,
      })

      return count
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { count: true, filter: this.filter },
        duration,
        error,
      })

      throw error
    }
  }

  /**
   * Execute the query and return the results
   */
  async exec(): Promise<Model[]> {
    const startTime = process.hrtime()

    try {
      let query = this.collection.find(this.filter as Filter<Model>)

      if (Object.keys(this.projection).length > 0) {
        query = query.project(this.projection)
      }

      if (Object.keys(this.sortOptions).length > 0) {
        query = query.sort(this.sortOptions as unknown as Sort)
      }

      if (this.limitValue !== null) {
        query = query.limit(this.limitValue)
      }

      if (this.skipValue !== null) {
        query = query.skip(this.skipValue)
      }

      const results = await query.toArray()

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: {
          filter: this.filter,
          projection: this.projection,
          sort: this.sortOptions,
          limit: this.limitValue,
          skip: this.skipValue,
        },
        duration,
      })

      // If we have a model constructor, instantiate model instances
      if (this.modelConstructor) {
        return results.map(result => {
          const instance = new this.modelConstructor!()

          // Use processFromDatabase to apply consume transformations
          instance.processFromDatabase(result)

          // Mark as not new
          instance.$isNew = false

          // Set the primary key value
          if (result._id) {
            instance.$primaryKeyValue = result._id
          }

          // Set the original attributes to the model's processed data
          instance.$original = { ...instance.toObject() }

          return instance
        }) as Model[]
      }

      return results as unknown as Model[]
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: {
          filter: this.filter,
          projection: this.projection,
          sort: this.sortOptions,
          limit: this.limitValue,
          skip: this.skipValue,
        },
        duration,
        error,
      })

      throw error
    }
  }

  /**
   * Execute the query and update documents
   */
  async update(data: UpdateFilter<Model>): Promise<number> {
    const startTime = process.hrtime()

    try {
      const result = await this.collection.updateMany(this.filter, data as any)

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { update: true, filter: this.filter, data },
        duration,
      })

      return result.modifiedCount
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { update: true, filter: this.filter, data },
        duration,
        error,
      })

      throw error
    }
  }

  /**
   * Execute the query and delete documents
   */
  async delete(): Promise<number> {
    const startTime = process.hrtime()

    try {
      const result = await this.collection.deleteMany(this.filter)

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { delete: true, filter: this.filter },
        duration,
      })

      return result.deletedCount || 0
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { delete: true, filter: this.filter },
        duration,
        error,
      })

      throw error
    }
  }

  /**
   * Execute the query and insert a document
   */
  async insert(data: Model): Promise<ObjectId> {
    const startTime = process.hrtime()

    try {
      const result = await this.collection.insertOne(data as any)

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { insert: true, data },
        duration,
      })

      return result.insertedId
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { insert: true, data },
        duration,
        error,
      })

      throw error
    }
  }

  /**
   * Execute the query and insert multiple documents
   */
  async insertMany(data: Model[]): Promise<ObjectId[]> {
    const startTime = process.hrtime()

    try {
      const result = await this.collection.insertMany(data as any)

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { insertMany: true, data },
        duration,
      })

      return Object.values(result.insertedIds)
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: { insertMany: true, data },
        duration,
        error,
      })

      throw error
    }
  }

  /**
   * Execute the query and paginate the results
   */
  async paginate(page: number = 1, perPage: number = 20): Promise<{
    total: number
    perPage: number
    lastPage: number
    page: number
    data: Model[]
  }> {
    const total = await this.count()
    const lastPage = Math.ceil(total / perPage)

    const results = await this.offset((page - 1) * perPage).limit(perPage).exec()

    return {
      total,
      perPage,
      lastPage,
      page,
      data: results,
    }
  }

  /**
   * Execute an aggregation pipeline
   *
   * @param pipeline An array of aggregation pipeline stages
   * @returns The result of the aggregation pipeline
   */
  async aggregate<T = any>(pipeline: any[]): Promise<T[]> {
    const startTime = process.hrtime()

    try {
      // Filter out any falsy stages (undefined, null, false)
      // This allows for conditional pipeline stages
      const validPipeline = pipeline.filter(Boolean)

      // Process any RegExp objects in the pipeline
      const processedPipeline = validPipeline.map(stage => {
        // For each stage, process any query objects that might contain RegExp
        const processedStage: Record<string, any> = {}

        for (const [key, value] of Object.entries(stage)) {
          if (key === '$match' && typeof value === 'object' && value !== null) {
            // Process $match stages to handle RegExp objects
            processedStage[key] = this.processMongoQuery(value as Record<string, any>)
          } else {
            // Keep other stages as is
            processedStage[key] = value
          }
        }

        return processedStage
      })

      // Execute the aggregation pipeline
      const results = await this.collection.aggregate(processedPipeline).toArray()

      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: {
          aggregate: true,
          pipeline: processedPipeline
        },
        duration,
      })

      return results as T[]
    } catch (error) {
      const duration = process.hrtime(startTime)
      this.emitter.emit('mongodb:query', {
        connection: this.connectionName,
        query: {
          aggregate: true,
          pipeline: pipeline.filter(Boolean)
        },
        duration,
        error,
      })

      throw error
    }
  }
}