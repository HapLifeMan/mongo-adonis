/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

// Ensure Map type is available
// No imports needed here

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
 * Decorator to define a model column
 */
export function column(options?: ColumnOptions): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    /**
     * Define the column metadata on the model
     */
    if (!target.$columnsDefinitions) {
      target.$columnsDefinitions = new Map()
    }

    const columnName = options?.columnName || property.toString()
    const isPrimary = options?.isPrimary || false
    const serialize = options?.serialize !== false

    // Handle prepare/consume functions
    const prepare = options?.prepare
    const consume = options?.consume

    target.$columnsDefinitions.set(property.toString(), {
      columnName,
      isPrimary,
      serialize,
      prepare,
      consume,
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
   * Decorator for DateTime columns with auto-create and auto-update functionality
   */
  export function dateTime(options: DateTimeOptions = {}): PropertyDecorator {
    return function (target: any, property: string | symbol) {
      // Apply the standard column decorator first
      const columnOptions: ColumnOptions = {
        columnName: options.columnName,
        serialize: options.serialize,
        prepare: options.prepare,
        consume: options.consume,
      }

      column(columnOptions)(target, property)

      // Store timestamp metadata on the model
      if (!target.$timestampColumns) {
        target.$timestampColumns = new Map()
      }

      // Add this property to the timestamps map
      target.$timestampColumns.set(property.toString(), {
        autoCreate: options.autoCreate ?? false,
        autoUpdate: options.autoUpdate ?? false,
        columnName: columnOptions.columnName || property.toString(),
      })

      // Install the hook to handle timestamps if not already done
      if (!target.constructor.$timestampHooksInstalled) {
        const proto = target.constructor.prototype

        // Store the original save method
        const originalSave = proto.save

        // Override the save method to handle timestamps
        proto.save = async function (...args: any[]) {
          const now = new Date()

          // Get timestamp columns from the prototype
          const timestampColumns = this.constructor.prototype.$timestampColumns

          if (timestampColumns && timestampColumns instanceof Map) {
            timestampColumns.forEach((config, key) => {
              // Set value on creation if autoCreate is true
              if (this.$isNew && config.autoCreate) {
                this[key] = now
              }

              // Update value on update if autoUpdate is true
              if (!this.$isNew && config.autoUpdate) {
                this[key] = now
              }
            })
          }

          // Call the original save method
          return originalSave.apply(this, args)
        }

        // Mark hooks as installed to prevent duplicate installation
        target.constructor.$timestampHooksInstalled = true
      }
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
}

/**
 * Decorator to define a computed property
 */
export function computed(options?: ComputedOptions): PropertyDecorator {
  return function (target: any, property: string | symbol) {
    /**
     * Define the computed metadata on the model
     */
    if (!target.$computedDefinitions) {
      target.$computedDefinitions = new Map()
    }

    const serialize = options?.serialize !== false

    target.$computedDefinitions.set(property.toString(), {
      serialize,
    })
  }
}