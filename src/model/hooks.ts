/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Decorator for the beforeCreate hook
 */
export function beforeCreate(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.beforeCreate = descriptor.value

    return descriptor
  }
}

/**
 * Decorator for the afterCreate hook
 */
export function afterCreate(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.afterCreate = descriptor.value

    return descriptor
  }
}

/**
 * Decorator for the beforeUpdate hook
 */
export function beforeUpdate(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.beforeUpdate = descriptor.value

    return descriptor
  }
}

/**
 * Decorator for the afterUpdate hook
 */
export function afterUpdate(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.afterUpdate = descriptor.value

    return descriptor
  }
}

/**
 * Decorator for the beforeSave hook
 * This hook is called before both create and update operations
 */
export function beforeSave(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // Store the original method
    const originalMethod = descriptor.value

    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Set the beforeSave hook
    constructor.beforeSave = originalMethod

    return descriptor
  }
}

/**
 * Decorator for the afterSave hook
 * This hook is called after both create and update operations
 */
export function afterSave(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // Store the original method
    const originalMethod = descriptor.value

    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Set the afterSave hook
    constructor.afterSave = originalMethod

    return descriptor
  }
}

/**
 * Decorator for the beforeDelete hook
 */
export function beforeDelete(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.beforeDelete = descriptor.value
    return descriptor
  }
}

/**
 * Decorator for the afterDelete hook
 */
export function afterDelete(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.afterDelete = descriptor.value
    return descriptor
  }
}

/**
 * Decorator for the beforeFind hook
 */
export function beforeFind(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.beforeFind = descriptor.value
    return descriptor
  }
}

/**
 * Decorator for the afterFind hook
 */
export function afterFind(): MethodDecorator {
  return function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
    // For static methods, target is the constructor itself
    // For instance methods, target is the prototype, and we need to access the constructor
    const constructor = typeof target === 'function' ? target : target.constructor

    // Store the method on the constructor
    constructor.afterFind = descriptor.value
    return descriptor
  }
}