/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Common options for all column decorators
 */
export type BaseColumnOptions = {
  /**
   * The column name in the database
   */
  columnName?: string

  /**
   * Whether to serialize this column
   */
  serialize?: boolean

  /**
   * The name to use for this column when serializing
   * If string: use this name when serializing
   * If null: don't include this column when serializing
   */
  serializeAs?: string | null

  /**
   * Function to transform the value before saving to database
   */
  prepare?: ((value: any) => any)

  /**
   * Function to transform the value when loading from database
   */
  consume?: ((value: any) => any)
}

/**
 * Options for the standard column decorator
 */
export type ColumnOptions = BaseColumnOptions & {
  /**
   * Whether this column is the primary key
   */
  isPrimary?: boolean
}

/**
 * Options for the dateTime decorator
 */
export type DateTimeOptions = BaseColumnOptions & {
  /**
   * Whether to automatically set the value when creating a new record
   */
  autoCreate?: boolean

  /**
   * Whether to automatically update the value when updating a record
   */
  autoUpdate?: boolean
}

/**
 * Get (or create) a metadata Map owned by this exact prototype.
 * Without the own-property check, a subclass would mutate the Map inherited
 * from its parent model and leak column definitions across classes.
 * Entries inherited from the parent are copied into the new Map.
 */
function ownMetadataMap(target: any, key: string): Map<string, any> {
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    target[key] = new Map(target[key] ?? [])
  }
  return target[key]
}

/**
 * Decorator to define a model column
 */
export function column(options?: ColumnOptions): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    const columnName = options?.columnName || property.toString()
    const isPrimary = options?.isPrimary || false
    const serialize = options?.serialize !== false
    const serializeAs = options?.serializeAs

    ownMetadataMap(target, '$columnsDefinitions').set(property.toString(), {
      columnName,
      isPrimary,
      serialize,
      serializeAs,
      prepare: options?.prepare,
      consume: options?.consume,
    })

    /**
     * If this is the primary key, set it on the model
     */
    if (isPrimary) {
      target.constructor.primaryKey = columnName
    }
  }
}

/**
 * Add the dateTime decorator to the column namespace
 */
export namespace column {
  /**
   * Decorator for DateTime columns with auto-create and auto-update
   * functionality. The timestamps themselves are applied by
   * MongoModel.save() based on this metadata.
   */
  export function dateTime(options: DateTimeOptions = {}): PropertyDecorator {
    return function (target: any, property: string | symbol) {
      // Apply the standard column decorator first
      column({
        columnName: options.columnName,
        serialize: options.serialize,
        serializeAs: options.serializeAs,
        prepare: options.prepare,
        consume: options.consume,
      })(target, property)

      ownMetadataMap(target, '$timestampColumns').set(property.toString(), {
        autoCreate: options.autoCreate ?? false,
        autoUpdate: options.autoUpdate ?? false,
        columnName: options.columnName || property.toString(),
      })
    }
  }
}

/**
 * Options for the computed decorator
 */
export type ComputedOptions = {
  /**
   * Whether to serialize this computed property
   */
  serialize?: boolean

  /**
   * The name to use for this property when serializing
   * If string: use this name when serializing
   * If null: don't include this property when serializing
   */
  serializeAs?: string | null
}

/**
 * Decorator to define a computed property
 */
export function computed(options?: ComputedOptions): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    ownMetadataMap(target, '$computedDefinitions').set(property.toString(), {
      serialize: options?.serialize !== false,
      serializeAs: options?.serializeAs,
    })
  }
}
