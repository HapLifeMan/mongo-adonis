/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Hooks are stored as static methods on the model constructor
 * (`Constructor.beforeSave` etc.), which also makes plain static methods
 * with the conventional names work without any decorator.
 *
 * When a hook of the same name already exists (own or inherited — e.g. from
 * the withAuthFinder mixin), the decorator chains the new handler after the
 * existing one instead of silently replacing it.
 */
function createHookDecorator(name: string): () => MethodDecorator {
  return () =>
    function (target: any, _key: string | symbol, descriptor: PropertyDescriptor) {
      // For static methods, target is the constructor itself.
      // For instance methods, target is the prototype.
      const constructor = typeof target === 'function' ? target : target.constructor
      const handler = descriptor.value
      const previous = constructor[name]

      if (!previous || previous === handler) {
        constructor[name] = handler
      } else {
        constructor[name] = async function (...args: any[]) {
          await previous.apply(this, args)
          return handler.apply(this, args)
        }
      }

      return descriptor
    }
}

export const beforeCreate = createHookDecorator('beforeCreate')
export const afterCreate = createHookDecorator('afterCreate')
export const beforeUpdate = createHookDecorator('beforeUpdate')
export const afterUpdate = createHookDecorator('afterUpdate')

/**
 * beforeSave/afterSave run for both create and update operations
 */
export const beforeSave = createHookDecorator('beforeSave')
export const afterSave = createHookDecorator('afterSave')

export const beforeDelete = createHookDecorator('beforeDelete')
export const afterDelete = createHookDecorator('afterDelete')
export const beforeFind = createHookDecorator('beforeFind')
export const afterFind = createHookDecorator('afterFind')
