# Relationship Methods in MongoDB Lucid ORM

This document provides a comprehensive guide to using relationship methods in the MongoDB Lucid ORM. Relationship methods allow you to interact with related models through defined relationships.

## Table of Contents

- [Introduction](#introduction)
- [Relationship Decorators](#relationship-decorators)
- [HasOne Relationship Methods](#hasone-relationship-methods)
- [HasMany Relationship Methods](#hasmany-relationship-methods)
- [BelongsTo Relationship Methods](#belongsto-relationship-methods)
- [Using Relationships with Hooks](#using-relationships-with-hooks)
- [Best Practices](#best-practices)

## Introduction

Relationships in MongoDB Lucid ORM allow you to define connections between different models. These relationships are defined using decorators and provide methods to interact with related models.

## Relationship Decorators

The MongoDB Lucid ORM supports three types of relationship decorators:

### `@hasOne(() => Model, foreignKey?, localKey?)`

Defines a one-to-one relationship where the current model has one related model.

**Parameters:**
- `Model` (function): A function returning the related model class
- `foreignKey` (string, optional): The foreign key in the related model (default: lowercase model name + 'Id')
- `localKey` (string, optional): The local key in this model (default: '_id')

**Example:**
```typescript
class User extends MongoModel {
  @hasOne(() => Profile, 'userId', '_id')
  declare profile: any
}
```

### `@hasMany(() => Model, foreignKey?, localKey?)`

Defines a one-to-many relationship where the current model has many related models.

**Parameters:**
- `Model` (function): A function returning the related model class
- `foreignKey` (string, optional): The foreign key in the related model (default: lowercase model name + 'Id')
- `localKey` (string, optional): The local key in this model (default: '_id')

**Example:**
```typescript
class User extends MongoModel {
  @hasMany(() => Post, 'userId', '_id')
  declare posts: any
}
```

### `@belongsTo(() => Model, foreignKey?, localKey?)`

Defines a many-to-one relationship where the current model belongs to a related model.

**Parameters:**
- `Model` (function): A function returning the related model class
- `foreignKey` (string, optional): The foreign key in this model (default: lowercase related model name + 'Id')
- `localKey` (string, optional): The local key in the related model (default: '_id')

**Example:**
```typescript
class Post extends MongoModel {
  @belongsTo(() => User, 'userId', '_id')
  declare user: any
}
```

## HasOne Relationship Methods

The `HasOne` relationship provides the following methods:

### `exec()`

**Description:** Executes the relationship query and returns the related model.

**Parameters:** None

**Returns:** Promise<Model | null>

**Example:**
```typescript
// Get a user's profile
const profile = await user.profile.exec()
```

### `create(data)`

**Description:** Creates a related model.

**Parameters:**
- `data` (object): The data for the new model

**Returns:** Promise<Model>

**Example:**
```typescript
// Create a profile for a user
const profile = await user.profile.create({
  bio: 'Software developer',
  location: 'New York'
})
```

### `save(model)`

**Description:** Saves a related model.

**Parameters:**
- `model` (Model): The model to save

**Returns:** Promise<Model>

**Example:**
```typescript
// Save a profile for a user
const profile = new Profile()
profile.bio = 'Software developer'
profile.location = 'New York'
await user.profile.save(profile)
```

### `associate(model)`

**Description:** Associates a model with this relationship.

**Parameters:**
- `model` (Model): The model to associate

**Returns:** Promise<void>

**Example:**
```typescript
// Associate a profile with a user
const profile = await Profile.find('60a1e2c3d4e5f6a7b8c9d0e1')
await user.profile.associate(profile)
```

### `dissociate()`

**Description:** Dissociates the related model.

**Parameters:** None

**Returns:** Promise<void>

**Example:**
```typescript
// Dissociate a profile from a user
await user.profile.dissociate()
```

### `delete()`

**Description:** Deletes the related model.

**Parameters:** None

**Returns:** Promise<void>

**Example:**
```typescript
// Delete a user's profile
await user.profile.delete()
```

## HasMany Relationship Methods

The `HasMany` relationship provides the following methods:

### `exec()`

**Description:** Executes the relationship query and returns the related models.

**Parameters:** None

**Returns:** Promise<Model[]>

**Example:**
```typescript
// Get a user's posts
const posts = await user.posts.exec()
```

### `create(data)`

**Description:** Creates a related model.

**Parameters:**
- `data` (object): The data for the new model

**Returns:** Promise<Model>

**Example:**
```typescript
// Create a post for a user
const post = await user.posts.create({
  title: 'New Post',
  content: 'This is a new post'
})
```

### `createMany(data)`

**Description:** Creates multiple related models.

**Parameters:**
- `data` (array): The data for the new models

**Returns:** Promise<Model[]>

**Example:**
```typescript
// Create multiple posts for a user
const posts = await user.posts.createMany([
  { title: 'Post 1', content: 'Content 1' },
  { title: 'Post 2', content: 'Content 2' }
])
```

### `save(model)`

**Description:** Saves a related model.

**Parameters:**
- `model` (Model): The model to save

**Returns:** Promise<Model>

**Example:**
```typescript
// Save a post for a user
const post = new Post()
post.title = 'New Post'
post.content = 'This is a new post'
await user.posts.save(post)
```

### `saveMany(models)`

**Description:** Saves multiple related models.

**Parameters:**
- `models` (array): The models to save

**Returns:** Promise<Model[]>

**Example:**
```typescript
// Save multiple posts for a user
const post1 = new Post()
post1.title = 'Post 1'
post1.content = 'Content 1'

const post2 = new Post()
post2.title = 'Post 2'
post2.content = 'Content 2'

await user.posts.saveMany([post1, post2])
```

### `associate(model)`

**Description:** Associates a model with this relationship.

**Parameters:**
- `model` (Model): The model to associate

**Returns:** Promise<void>

**Example:**
```typescript
// Associate a post with a user
const post = await Post.find('60a1e2c3d4e5f6a7b8c9d0e1')
await user.posts.associate(post)
```

### `associateMany(models)`

**Description:** Associates multiple models with this relationship.

**Parameters:**
- `models` (array): The models to associate

**Returns:** Promise<void>

**Example:**
```typescript
// Associate multiple posts with a user
const post1 = await Post.find('60a1e2c3d4e5f6a7b8c9d0e1')
const post2 = await Post.find('60a1e2c3d4e5f6a7b8c9d0e2')
await user.posts.associateMany([post1, post2])
```

### `dissociate()`

**Description:** Dissociates all related models.

**Parameters:** None

**Returns:** Promise<void>

**Example:**
```typescript
// Dissociate all posts from a user
await user.posts.dissociate()
```

### `delete()`

**Description:** Deletes all related models.

**Parameters:** None

**Returns:** Promise<void>

**Example:**
```typescript
// Delete all posts from a user
await user.posts.delete()
```

### `deleteMany(models)`

**Description:** Deletes multiple specific related models.

**Parameters:**
- `models` (array): The models to delete

**Returns:** Promise<void>

**Example:**
```typescript
// Delete specific posts from a user
const posts = await user.posts.exec()
const postsToDelete = posts.filter(post => post.published === false)
await user.posts.deleteMany(postsToDelete)
```

## BelongsTo Relationship Methods

The `BelongsTo` relationship provides the following methods:

### `exec()`

**Description:** Executes the relationship query and returns the related model.

**Parameters:** None

**Returns:** Promise<Model | null>

**Example:**
```typescript
// Get a post's author
const user = await post.user.exec()
```

### `associate(model)`

**Description:** Associates a model with this relationship.

**Parameters:**
- `model` (Model): The model to associate

**Returns:** Promise<void>

**Example:**
```typescript
// Associate a user with a post
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')
await post.user.associate(user)
```

### `dissociate()`

**Description:** Dissociates the related model.

**Parameters:** None

**Returns:** Promise<void>

**Example:**
```typescript
// Dissociate a user from a post
await post.user.dissociate()
```

## Using Relationships with Hooks

Relationship methods can be used within model hooks to implement complex business logic. Here are some common use cases:

### Automatic Creation of Related Records

You can use the `afterCreate` hook to automatically create related records when a model is created:

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
```

### Cascading Deletes

You can use the `beforeDelete` hook to implement cascading deletes:

```typescript
import { MongoModel, column, hasMany, hasOne, beforeDelete, ObjectId } from 'mongo-adonis'

class Cocktail extends MongoModel {
  static collection = 'cocktails'

  @column({ isPrimary: true })
  declare _id: ObjectId

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
```

### Selective Deletion of Related Records

You can use the `beforeDelete` hook to selectively delete related records based on certain conditions:

```typescript
import { MongoModel, column, hasMany, beforeDelete, ObjectId } from 'mongo-adonis'

class User extends MongoModel {
  static collection = 'users'

  @column({ isPrimary: true })
  declare _id: ObjectId

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
```

## Best Practices

Here are some best practices for using relationship methods:

1. **Use relationship methods instead of direct queries**: Instead of manually querying related models, use the relationship methods provided by the ORM.

2. **Implement cascading operations in hooks**: Use hooks to implement cascading operations like cascading deletes or updates.

3. **Be careful with circular dependencies**: When defining relationships between models, be careful not to create circular dependencies that could cause infinite loops.

4. **Use type annotations**: Use proper type annotations for relationship properties to get better IDE support.

5. **Consider performance implications**: Be aware of the performance implications of relationship operations, especially when dealing with large datasets.

6. **Use transactions when necessary**: For operations that involve multiple related models, consider using transactions to ensure data consistency.

7. **Implement proper error handling**: Implement proper error handling for relationship operations to handle cases where related models might not exist.

8. **Document your relationships**: Document your relationships and the business logic implemented in hooks to make your code more maintainable.