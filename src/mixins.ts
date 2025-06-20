/*
 * @adonisjs/auth
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Hash } from '@adonisjs/core/hash'
import { RuntimeException } from '@adonisjs/core/exceptions'
import { beforeSave, type MongoModel } from './model/main.js'
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'

type UserWithUserFinderRow = {
  verifyPassword(plainPassword: string): Promise<boolean>
}

type UserWithUserFinderClass<
  Model extends NormalizeConstructor<typeof MongoModel> = NormalizeConstructor<typeof MongoModel>,
> = Model & {
  hashPassword<T extends UserWithUserFinderClass>(this: T, user: InstanceType<T>): Promise<void>
  findForAuth<T extends UserWithUserFinderClass>(
    this: T,
    uids: string[],
    value: string
  ): Promise<InstanceType<T> | null>
  verifyCredentials<T extends UserWithUserFinderClass>(
    this: T,
    uid: string,
    password: string
  ): Promise<InstanceType<T>>
  new (...args: any[]): UserWithUserFinderRow
}

/**
 * Mixing to add user lookup and password verification methods
 * on a model.
 *
 * Under the hood, this mixin defines following methods and hooks
 *
 * - beforeSave hook to hash user password
 * - findForAuth method to find a user during authentication
 * - verifyCredentials method to verify user credentials and prevent
 *   timing attacks.
 */
export function withAuthFinder(
  hash: () => Hash,
  options: {
    uids: string[]
    passwordColumnName: string
  }
) {
  return function <Model extends NormalizeConstructor<typeof MongoModel>>(
    superclass: Model
  ): UserWithUserFinderClass<Model> {
    class UserWithUserFinder extends superclass {
      /**
       * Hook to verify user password when creating or updating
       * the user model.
       */
      @beforeSave()
      static async hashPassword<T extends UserWithUserFinderClass>(this: T, user: InstanceType<T>) {
        if (user.isDirty(options.passwordColumnName)) {
          ;(user as any)[options.passwordColumnName] = await hash().make(
            (user as any)[options.passwordColumnName]
          )
        }
      }

      /**
       * Finds the user for authentication via "verifyCredentials".
       * Feel free to override this method customize the user
       * lookup behavior.
       */
      static findForAuth<T extends UserWithUserFinderClass>(
        this: T,
        uids: string[],
        value: string
      ): Promise<InstanceType<T> | null> {
        const query = this.query()
        uids.forEach((uid) => query.orWhere(uid, value))
        return query.limit(1).first() as Promise<InstanceType<T> | null>
      }

      /**
       * Find a user by uid and verify their password. This method is
       * safe from timing attacks.
       */
      static async verifyCredentials<T extends UserWithUserFinderClass>(
        this: T,
        uid: string,
        password: string
      ) {
        /**
         * Fail when uid or the password are missing
         */
        if (!uid || !password) {
          throw new Error('Invalid user credentials')
        }

        const user = await this.findForAuth(options.uids, uid)
        if (!user) {
          await hash().make(password)
          throw new Error('Invalid user credentials')
        }

        if (await user.verifyPassword(password)) {
          return user
        }

        throw new Error('Invalid user credentials')
      }

      /**
       * Verifies the plain password against the user's password
       * hash
       */
      async verifyPassword(plainPassword: string): Promise<boolean> {
        const passwordHash = (this as any)[options.passwordColumnName]
        if (!passwordHash) {
          throw new RuntimeException(
            `Cannot verify password. The value for "${options.passwordColumnName}" column is undefined or null`
          )
        }
        return hash().verify(passwordHash, plainPassword)
      }
    }

    return UserWithUserFinder
  }
}