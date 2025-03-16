/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Base exception class for MongoDB adapter
 */
export class Exception extends Error {
  static status: number = 500
  cause?: Error

  constructor(message: string, options?: { cause?: Error }) {
    super(message)
    this.name = this.constructor.name
    if (options?.cause) {
      this.cause = options.cause
    }
  }
}

/**
 * Exception raised when unable to connect to the MongoDB server
 */
export class ConnectionRefusedException extends Exception {
  static status = 503

  constructor(message: string, options?: { cause?: Error }) {
    super(message, options)
  }
}

/**
 * Exception raised when unable to find a registered connection
 */
export class ConnectionNotFoundException extends Exception {
  static status = 500

  constructor(message: string, options?: { cause?: Error }) {
    super(message, options)
  }
}

/**
 * Exception raised when a model doesn't have a primary key defined
 */
export class ModelPrimaryKeyMissingException extends Exception {
  static status = 500

  constructor(message: string, options?: { cause?: Error }) {
    super(message, options)
  }
}

/**
 * Exception raised when a model operation fails
 */
export class ModelQueryException extends Exception {
  static status = 500

  constructor(message: string, options?: { cause?: Error }) {
    super(message, options)
  }
}

/**
 * Exception raised when a relationship is not properly defined
 */
export class InvalidRelationException extends Exception {
  static status = 500

  constructor(message: string, options?: { cause?: Error }) {
    super(message, options)
  }
}

/**
 * Exception raised when a MongoDB operation fails
 */
export class MongoDBException extends Exception {
  static status = 500

  constructor(message: string, options?: { cause?: Error }) {
    super(message, options)
  }
}