# Model Hooks in MongoDB Lucid ORM

## Summary

This document provides a comprehensive guide to using model hooks in the MongoDB Lucid ORM. Model hooks allow you to execute code at specific points in a model's lifecycle, such as before or after creating, updating, or deleting a record.

The MongoDB Lucid ORM supports various hooks, including `@beforeSave()`, `@afterSave()`, `@beforeCreate()`, `@afterCreate()`, `@beforeUpdate()`, `@afterUpdate()`, `@beforeDelete()`, `@afterDelete()`, `@beforeFind()`, and `@afterFind()`. All hooks can be implemented as either synchronous or asynchronous methods.

## Introduction

Model hooks allow you to execute code at specific points in a model's lifecycle. They are useful for implementing business logic that should run automatically when certain events occur, such as creating or updating a record.

## Available Hooks

The MongoDB Lucid ORM supports the following hooks:

| Hook | Decorator | Description | Execution Timing |
|------|-----------|-------------|------------------|
| `beforeCreate` | `@beforeCreate()` | Executed before a new record is created | Before `save()` when `$isNew` is true |
| `afterCreate` | `@afterCreate()` | Executed after a new record is created | After `save()` and `refresh()` when `$isNew` was true |
| `beforeUpdate` | `@beforeUpdate()` | Executed before an existing record is updated | Before `save()` when `$isNew` is false |
| `afterUpdate` | `@afterUpdate()` | Executed after an existing record is updated | After `save()` and `refresh()` when `$isNew` was false |
| `beforeSave` | `@beforeSave()` | Executed before both create and update operations | Before `save()` for both new and existing records |
| `afterSave` | `@afterSave()` | Executed after both create and update operations | After `save()` and `refresh()` for both new and existing records |
| `beforeDelete` | `@beforeDelete()` | Executed before a record is deleted | Before `delete()` |
| `afterDelete` | `@afterDelete()` | Executed after a record is deleted | After `delete()` |
| `beforeFind` | `@beforeFind()` | Executed before finding a record | Before `find()` and `findBy()` |
| `afterFind` | `@afterFind()` | Executed after finding a record | After `find()` and `findBy()` |

> **Note:** The `@beforeSave()` and `@afterSave()` decorators automatically register the method as both create and update hooks. This means that a method decorated with `@beforeSave()` will be executed for both `beforeCreate` and `beforeUpdate` operations, and a method decorated with `@afterSave()` will be executed for both `afterCreate` and `afterUpdate` operations.

## Defining Hooks

Hooks are defined as static methods on your model class using decorators.

### Using Decorators

```typescript
import {
  MongoModel,
  column,
  beforeSave,
  afterSave,
  beforeFind,
  afterFind,
  beforeDelete,
  afterDelete,
  ObjectId
} from 'mongo-adonis'

class User extends MongoModel {

  @beforeSave()
  public static setTimestamps(user: User): void {
    // This method will be executed for both create and update operations
    if (user.$isNew) {
      // This is a create operation
      user.created_at = new Date()
    }
    // For both create and update operations
    user.updated_at = new Date()
    user.beforeSaveTriggered = true
  }

  @afterSave()
  public static logSave(user: User): void {
    // This method will be executed for both create and update operations
    user.afterSaveTriggered = true
  }

  @beforeCreate()
  public static setBeforeCreateFlag(user: User): void {
    // This method will only be executed for create operations
    user.beforeCreateTriggered = true
  }

  @afterCreate()
  public static setAfterCreateFlag(user: User): void {
    // This method will only be executed for create operations
    user.afterCreateTriggered = true
  }

  @beforeUpdate()
  public static setBeforeUpdateFlag(user: User): void {
    // This method will only be executed for update operations
    user.beforeUpdateTriggered = true
  }

  @afterUpdate()
  public static setAfterUpdateFlag(user: User): void {
    // This method will only be executed for update operations
    user.afterUpdateTriggered = true
  }

  @beforeDelete()
  public static setBeforeDeleteFlag(user: User): void {
    // This method will be executed before deleting a record
    user.beforeDeleteTriggered = true
  }

  @afterDelete()
  public static setAfterDeleteFlag(user: User): void {
    // This method will be executed after deleting a record
    user.afterDeleteTriggered = true
  }

  @beforeFind()
  public static setBeforeFindFlag(query: any): void {
    // This method will be executed before finding a record
    // Make sure query.context exists before setting properties on it
    if (!query.context) {
      query.context = {}
    }
    query.context.beforeFindTriggered = true
  }

  @afterFind()
  public static setAfterFindFlag(user: User): void {
    // This method will be executed after finding a record
    user.afterFindTriggered = true
  }
}
```

### Asynchronous Hooks

All hooks can be implemented as asynchronous methods by returning a Promise. This is useful when you need to perform asynchronous operations in your hooks, such as making API calls or performing database operations.

```typescript
@beforeSave()
public static async validateEmail(user: User): Promise<void> {
  // Simulate an asynchronous email validation
  const isValid = await someAsyncEmailValidator(user.email)

  if (!isValid) {
    throw new Error('Invalid email address')
  }
}

@afterCreate()
public static async sendWelcomeEmail(user: User): Promise<void> {
  // Send a welcome email asynchronously
  await emailService.sendWelcomeEmail(user.email, user.name)
}
```

## Hook Execution Order

When saving a model, hooks are executed in the following order:

1. For new models:
   - `beforeSave`
   - `beforeCreate`
   - Database insert operation
   - Model refresh (to get latest values)
   - `afterCreate`
   - `afterSave`

2. For existing models:
   - `beforeSave`
   - `beforeUpdate`
   - Database update operation
   - Model refresh (to get latest values)
   - `afterUpdate`
   - `afterSave`

When finding a model, hooks are executed in the following order:
1. `beforeFind` - receives the query builder instance
2. Database find operation
3. `afterFind` - receives the found model instance

When deleting a model, hooks are executed in the following order:
1. `beforeDelete`
2. Database delete operation
3. `afterDelete`

## Use Cases

### Timestamps

One of the most common use cases for hooks is automatically setting timestamps:

```typescript
@beforeSave()
public static setTimestamps(model: Model): void {
  if (model.$isNew) {
    model.created_at = new Date()
  }
  model.updated_at = new Date()
}
```

### Data Validation

You can use hooks to validate data before it's saved to the database:

```typescript
@beforeSave()
public static validateData(user: User): void {
  if (!user.email.includes('@')) {
    throw new Error('Invalid email address')
  }
}
```

### Data Transformation

Hooks can be used to transform data before it's saved:

```typescript
@beforeSave()
public static transformData(user: User): void {
  // Convert email to lowercase
  user.email = user.email.toLowerCase()

  // Hash password if it's a new user or if the password has changed
  if (user.$isNew || user.isDirty('password')) {
    user.password = hashPassword(user.password)
  }
}
```

### Logging

You can use hooks for logging operations:

```typescript
@afterSave()
public static logOperation(user: User): void {
  if (user.$isNew === false) {
    console.log(`User updated: ${user._id}`)
  } else {
    console.log(`User created: ${user._id}`)
  }
}
```

### Asynchronous Operations

You can use asynchronous hooks for operations that require async/await:

```typescript
@afterCreate()
public static async notifyAdmins(user: User): Promise<void> {
  // Fetch all admin users
  const admins = await User.query().where('role', 'admin').all()

  // Send notifications to all admins
  for (const admin of admins) {
    await notificationService.send(admin._id, `New user registered: ${user.name}`)
  }
}
```

### Managing Relationships

Hooks are particularly useful for managing relationships between models. Here are some common use cases:

#### Creating Related Records

You can use the `afterCreate` hook to automatically create related records when a model is created:

```typescript
import { MongoModel, column, hasMany, afterCreate, ObjectId } from 'mongo-adonis'

class User extends MongoModel {
  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public name!: string

  @column()
  public email!: string

  @hasMany(() => Notification, 'userId')
  declare notifications: any

  @afterCreate()
  public static async createWelcomeNotification(user: User): Promise<void> {
    // Create a welcome notification for the user
    await user.notification.create({
      message = `Welcome to the system, ${user.name}!`
      type = 'welcome'
    })
  }
}

class Notification extends MongoModel {
  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public message!: string

  @column()
  public type!: string

  @column()
  public userId!: ObjectId
}
```

#### Cleaning Up Relationships

The `beforeDelete` hook is perfect for cleaning up or dissociating relationships before a model is deleted:

```typescript
import { MongoModel, column, hasMany, beforeDelete, ObjectId } from 'mongo-adonis'

class User extends MongoModel {
  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public name!: string

  @hasMany(() => Task, 'userId')
  declare tasks: any

  @hasMany(() => Notification, 'userId')
  declare notifications: any

  @beforeDelete()
  public static async cleanupRelationships(user: User): Promise<void> {
    // Option 1: Dissociate tasks by setting userId to null
    await user.tasks.dissociate()

    // Option 2: Delete related records
    await user.notifications.delete()
  }
}

class Task extends MongoModel {
  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public title!: string

  @column()
  public status!: string

  @column()
  public userId!: ObjectId | null
}

class Notification extends MongoModel {
  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public message!: string

  @column()
  public userId!: ObjectId
}
```

### Advanced Relationship Operations in Hooks

Hooks are powerful when combined with relationship methods. Here are some advanced examples:

#### Automatic Cleanup with Cascading Deletes

This example demonstrates how to implement cascading deletes using the `beforeDelete` hook:

```typescript
import { MongoModel, column, hasMany, hasOne, beforeDelete, ObjectId } from 'mongo-adonis'

class Cocktail extends MongoModel {
  static collection = 'cocktails'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare description: string

  @hasMany(() => Ingredient, 'cocktailId')
  declare ingredients: any

  @hasOne(() => Price, 'cocktailId')
  declare price: any

  @beforeDelete()
  public static async deleteRelatedRecords(cocktail: Cocktail): Promise<void> {
    // Delete all ingredients related to this cocktail
    await cocktail.ingredients.delete()

    // Delete the price related to this cocktail
    await cocktail.price.delete()
  }
}

class Ingredient extends MongoModel {
  static collection = 'ingredients'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare cocktailId: ObjectId
}

class Price extends MongoModel {
  static collection = 'prices'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare amount: number

  @column()
  declare cocktailId: ObjectId
}
```

#### Automatic Creation of Related Records

This example shows how to automatically create related records when a model is created:

```typescript
import { MongoModel, column, hasOne, afterCreate, ObjectId } from 'mongo-adonis'

class Cocktail extends MongoModel {
  static collection = 'cocktails'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @hasOne(() => Price, 'cocktailId')
  declare price: any

  @afterCreate()
  public static async createRelatedPrice(cocktail: Cocktail): Promise<void> {
    // Automatically create a price when a cocktail is created
    await cocktail.price.create({
      amount: Math.floor(Math.random() * 10) + 5, // Random price between 5 and 15
      currency: 'USD',
    })
  }
}

class Price extends MongoModel {
  static collection = 'prices'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare cocktailId: ObjectId
}
```

#### Selective Deletion of Related Records

This example demonstrates how to selectively delete related records based on certain conditions:

```typescript
import { MongoModel, column, hasMany, beforeDelete, ObjectId } from 'mongo-adonis'

class User extends MongoModel {
  static collection = 'users'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @hasMany(() => Post, 'userId')
  declare posts: any

  @beforeDelete()
  public static async deleteSelectedPosts(user: User): Promise<void> {
    // Get all posts
    const posts = await user.posts.exec()

    // Filter posts that are drafts
    const draftPosts = posts.filter(post => post.status === 'draft')

    // Delete only draft posts
    await user.posts.deleteMany(draftPosts)

    // For published posts, just dissociate them
    const publishedPosts = posts.filter(post => post.status === 'published')
    for (const post of publishedPosts) {
      post.userId = null
      post.authorName = user.name // Keep the author name for reference
      await post.save()
    }
  }
}

class Post extends MongoModel {
  static collection = 'posts'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare title: string

  @column()
  declare status: string

  @column()
  declare userId: ObjectId | null

  @column()
  declare authorName: string | null
}
```

## Important Notes

### Direct Query Builder Operations

Hooks are only triggered when using model instances with methods like `save()` and `delete()`. They are not triggered when using query builder methods directly, such as `query().insert()`, `query().update()`, or `query().delete()`.

### Asynchronous Hooks

All hooks can be asynchronous. If your hook performs asynchronous operations, make sure to define it as an async function and return a Promise:

```typescript
@beforeSave()
public static async validateExternalData(user: User): Promise<void> {
  const isValid = await someExternalValidationService.validate(user)
  if (!isValid) {
    throw new Error('Validation failed')
  }
}
```

### Error Handling

If a hook throws an error, the operation will be aborted, and the error will be propagated to the caller. This is useful for validation:

```typescript
@beforeSave()
public static validateEmail(user: User): void {
  if (!user.email.includes('@')) {
    throw new Error('Invalid email address')
  }
}
```

## Complete Example

Here's a complete example of a User model with various hooks:

```typescript
import {
  MongoModel,
  column,
  beforeSave,
  afterSave,
  beforeDelete,
  afterDelete,
  beforeFind,
  afterFind,
  ObjectId
} from 'mongo-adonis'

class User extends MongoModel {
  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public name!: string

  @column()
  public email!: string

  @column()
  public password!: string

  @column()
  public role!: string

  @column()
  public created_at!: Date

  @column()
  public updated_at!: Date

  @column()
  public last_login_at?: Date

  @beforeSave()
  public static async validateAndPrepare(user: User): Promise<void> {
    // Validate email
    if (!user.email.includes('@')) {
      throw new Error('Invalid email address')
    }

    // Convert email to lowercase
    user.email = user.email.toLowerCase()

    // Hash password if it's new or changed
    if (user.$isNew || user.isDirty('password')) {
      user.password = await hashPassword(user.password)
    }

    // Set timestamps
    if (user.$isNew) {
      user.created_at = new Date()
      user.role = user.role || 'user' // Default role
    }

    user.updated_at = new Date()
  }

  @afterSave()
  public static async postSaveOperations(user: User): Promise<void> {
    // Log the operation
    if (user.$isNew === false) {
      console.log(`User updated: ${user.name} (${user._id})`)
    } else {
      console.log(`User created: ${user.name} (${user._id})`)

      // Send welcome email for new users
      await emailService.sendWelcomeEmail(user.email, user.name)
    }
  }

  @beforeDelete()
  public static async beforeDeleteUser(user: User): Promise<void> {
    // Check if user can be deleted
    const hasActiveSubscriptions = await subscriptionService.hasActive(user._id)

    if (hasActiveSubscriptions) {
      throw new Error('Cannot delete user with active subscriptions')
    }

    // Log the deletion
    console.log(`Preparing to delete user: ${user.name} (${user._id})`)
  }

  @afterDelete()
  public static async afterDeleteUser(user: User): Promise<void> {
    // Perform cleanup operations
    await cleanupService.removeUserData(user._id)

    // Log the deletion
    console.log(`User deleted: ${user.name} (${user._id})`)
  }

  @beforeFind()
  public static prepareQuery(query: any): void {
    // Add default query conditions if needed
    if (!query.context) {
      query.context = {}
    }

    // For example, exclude soft-deleted users
    if (!query.context.includeSoftDeleted) {
      query.whereNull('deleted_at')
    }
  }

  @afterFind()
  public static processFoundUser(user: User): void {
    // Process the found user
    console.log(`User found: ${user.name} (${user._id})`)

    // You could perform additional operations here
    // For example, tracking user access
  }
}
```

This example demonstrates a comprehensive implementation of model hooks for a User model, including validation, data transformation, logging, and asynchronous operations.