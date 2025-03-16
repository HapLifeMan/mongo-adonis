# MongoDB Lucid ORM API Reference

This document provides a comprehensive reference for all methods available in the MongoDB Lucid ORM, including both model instance methods and query builder methods.

## Table of Contents

- [Model Static Methods](#model-static-methods)
- [Model Instance Methods](#model-instance-methods)
- [Query Builder Methods](#query-builder-methods)
- [Relationship Methods](#relationship-methods)

## Model Static Methods

These methods are available on the model class itself.

### `boot()`

**Description:** Boots the model and sets up the collection name.

**Parameters:** None

**Example:**
```typescript
// Boot the model
User.boot()
```

### `query()`

**Description:** Gets a query builder instance for the model.

**Parameters:** None

**Example:**
```typescript
// Get a query builder instance
const query = User.query()
```

### `all()`

**Description:** Gets all records from the database.

**Parameters:** None

**Example:**
```typescript
// Get all users
const users = await User.all()
```

### `find(id)`

**Description:** Finds a record by its primary key.

**Parameters:**
- `id` (string): The primary key value

**Example:**
```typescript
// Find a user by ID
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')
```

### `findBy(key, value)`

**Description:** Finds a record by a key-value pair.

**Parameters:**
- `key` (string): The field name
- `value` (any): The field value

**Example:**
```typescript
// Find a user by email
const user = await User.findBy('email', 'john@example.com')
```

### `create(data)`

**Description:** Creates a new record.

**Parameters:**
- `data` (object): The data for the new record

**Example:**
```typescript
// Create a new user
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})
```

### `createMany(data)`

**Description:** Creates multiple records.

**Parameters:**
- `data` (array): An array of objects with data for the new records

**Example:**
```typescript
// Create multiple users
const users = await User.createMany([
  { name: 'John Doe', email: 'john@example.com', age: 30 },
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 }
])
```

### `updateOrCreate(search, data)`

**Description:** Updates an existing record or creates a new one.

**Parameters:**
- `search` (object): The search criteria
- `data` (object): The data to update or create

**Example:**
```typescript
// Update or create a user
const user = await User.updateOrCreate(
  { email: 'john@example.com' },
  { name: 'John Doe', age: 31 }
)
```

### `firstOrCreate(search, data?)`

**Description:** Finds the first matching record or creates a new one.

**Parameters:**
- `search` (object): The search criteria
- `data` (object, optional): Additional data for creation if no record is found

**Example:**
```typescript
// Find or create a user
const user = await User.firstOrCreate(
  { email: 'john@example.com' },
  { name: 'John Doe', age: 30 }
)
```

### `firstOrNew(search, data?)`

**Description:** Finds the first matching record or instantiates a new one (without saving).

**Parameters:**
- `search` (object): The search criteria
- `data` (object, optional): Additional data for the new instance if no record is found

**Example:**
```typescript
// Find or instantiate a user
const user = await User.firstOrNew(
  { email: 'john@example.com' },
  { name: 'John Doe', age: 30 }
)
```

### `truncate()`

**Description:** Deletes all records from the collection.

**Parameters:** None

**Example:**
```typescript
// Delete all users
await User.truncate()
```

## Model Instance Methods

These methods are available on model instances.

### `fill(attributes)`

**Description:** Fills the model with attributes.

**Parameters:**
- `attributes` (object): The attributes to fill

**Example:**
```typescript
// Fill a user with attributes
const user = new User()
user.fill({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})
```

### `getAttribute(key)`

**Description:** Gets an attribute value.

**Parameters:**
- `key` (string): The attribute name

**Example:**
```typescript
// Get the name attribute
const name = user.getAttribute('name')
```

### `setAttribute(key, value)`

**Description:** Sets an attribute value.

**Parameters:**
- `key` (string): The attribute name
- `value` (any): The attribute value

**Example:**
```typescript
// Set the name attribute
user.setAttribute('name', 'John Doe')
```

### `isDirty(key?)`

**Description:** Checks if the model or a specific attribute is dirty (changed).

**Parameters:**
- `key` (string, optional): The attribute name to check

**Example:**
```typescript
// Check if the model is dirty
const isDirty = user.isDirty()

// Check if the name attribute is dirty
const isNameDirty = user.isDirty('name')
```

### `save()`

**Description:** Saves the model to the database.

**Parameters:** None

**Example:**
```typescript
// Save a user
await user.save()
```

### `delete()`

**Description:** Deletes the model from the database.

**Parameters:** None

**Example:**
```typescript
// Delete a user
await user.delete()
```

### `refresh()`

**Description:** Refreshes the model from the database.

**Parameters:** None

**Example:**
```typescript
// Refresh a user
await user.refresh()
```

### `toObject()`

**Description:** Converts the model to a plain object.

**Parameters:** None

**Example:**
```typescript
// Convert a user to an object
const userObject = user.toObject()
```

### `toJSON()`

**Description:** Converts the model to JSON.

**Parameters:** None

**Example:**
```typescript
// Convert a user to JSON
const userJson = user.toJSON()
```

## Query Builder Methods

These methods are available on the query builder instance returned by `Model.query()`.

### `where(key, value)`
### `where(key, operator, value)`
### `where(mongoQuery)`

**Description:** Adds a where clause to the query.

**Parameters:**
- `key` (string): The field name
- `operator` (string, optional): The comparison operator ('=', '>', '>=', '<', '<=', '!=', 'like', 'in', 'not in')
- `value` (any): The field value
- `mongoQuery` (object): A MongoDB query object with operators

**Example (standalone):**
```typescript
// Create a query builder and add a where clause
const query = User.query().where('age', '>', 25)

// Using MongoDB query syntax
const query = User.query().where({ age: { $gt: 25 } })
```

**Example (in a query):**
```typescript
// Find users older than 25
const users = await User.query().where('age', '>', 25).exec()

// Using MongoDB query syntax
const users = await User.query().where({ age: { $gt: 25 } }).exec()

// Using MongoDB $in operator
const users = await User.query().where({ _id: { $in: userIds } }).exec()

// Using MongoDB $and operator
const users = await User.query().where({
  $and: [
    { role: 'admin' },
    { active: true }
  ]
}).exec()

// Using MongoDB $or operator
const users = await User.query().where({
  $or: [
    { role: 'admin' },
    { role: 'moderator' }
  ]
}).exec()

// Combining MongoDB syntax with regular where clauses
const users = await User.query()
  .where({ age: { $gte: 25 } })
  .where('active', true)
  .exec()
```

### MongoDB Query Operators

The MongoDB Lucid ORM supports native MongoDB query operators in the `where` method. Here are some of the most commonly used operators:

#### Comparison Operators

- **$eq**: Matches values that are equal to a specified value.
  ```typescript
  // Find users with age equal to 25
  const users = await User.query().where({ age: { $eq: 25 } }).exec()
  ```

- **$gt**: Matches values that are greater than a specified value.
  ```typescript
  // Find users older than 25
  const users = await User.query().where({ age: { $gt: 25 } }).exec()
  ```

- **$gte**: Matches values that are greater than or equal to a specified value.
  ```typescript
  // Find users with age greater than or equal to 25
  const users = await User.query().where({ age: { $gte: 25 } }).exec()
  ```

- **$lt**: Matches values that are less than a specified value.
  ```typescript
  // Find users younger than 25
  const users = await User.query().where({ age: { $lt: 25 } }).exec()
  ```

- **$lte**: Matches values that are less than or equal to a specified value.
  ```typescript
  // Find users with age less than or equal to 25
  const users = await User.query().where({ age: { $lte: 25 } }).exec()
  ```

- **$ne**: Matches values that are not equal to a specified value.
  ```typescript
  // Find users with role not equal to 'guest'
  const users = await User.query().where({ role: { $ne: 'guest' } }).exec()
  ```

- **$in**: Matches any of the values specified in an array.
  ```typescript
  // Find users with roles in the specified array
  const users = await User.query().where({ role: { $in: ['admin', 'moderator'] } }).exec()
  ```

- **$nin**: Matches none of the values specified in an array.
  ```typescript
  // Find users with roles not in the specified array
  const users = await User.query().where({ role: { $nin: ['guest', 'user'] } }).exec()
  ```

#### Logical Operators

- **$and**: Joins query clauses with a logical AND.
  ```typescript
  // Find users who are both active and have the admin role
  const users = await User.query().where({
    $and: [
      { active: true },
      { role: 'admin' }
    ]
  }).exec()
  ```

- **$or**: Joins query clauses with a logical OR.
  ```typescript
  // Find users who are either admins or moderators
  const users = await User.query().where({
    $or: [
      { role: 'admin' },
      { role: 'moderator' }
    ]
  }).exec()
  ```

#### Element Operators

- **$exists**: Matches documents that have the specified field.
  ```typescript
  // Find users with a profile field
  const users = await User.query().where({ profile: { $exists: true } }).exec()
  ```

#### Array Operators

- **$all**: Matches arrays that contain all elements specified in the query.
  ```typescript
  // Find users with all the specified tags
  const users = await User.query().where({ tags: { $all: ['developer', 'javascript'] } }).exec()
  ```

#### Regular Expression Operator

- **$regex**: Provides regular expression capabilities for pattern matching strings in queries.
  ```typescript
  // Find users with names containing 'john' (case-insensitive)
  const users = await User.query().where({ name: { $regex: 'john', $options: 'i' } }).exec()

  // Find users with names starting with 'J' (case-insensitive)
  const users = await User.query().where({ name: { $regex: '^J', $options: 'i' } }).exec()

  // Find users with names ending with 'doe' (case-insensitive)
  const users = await User.query().where({ name: { $regex: 'doe$', $options: 'i' } }).exec()

  // Find users with names containing 'john' or 'jane' (case-insensitive)
  const users = await User.query().where({ name: { $regex: 'john|jane', $options: 'i' } }).exec()

  // Find users with 'smith' as a whole word in their name (case-insensitive)
  const users = await User.query().where({ name: { $regex: '\\bsmith\\b', $options: 'i' } }).exec()

  // Using JavaScript RegExp object (recommended)
  const users = await User.query().where({ name: { $regex: /john/i } }).exec()

  // Using JavaScript RegExp object with start anchor
  const users = await User.query().where({ name: { $regex: /^J/i } }).exec()

  // Using JavaScript RegExp object with end anchor
  const users = await User.query().where({ name: { $regex: /doe$/i } }).exec()

  // Using JavaScript RegExp object with alternation
  const users = await User.query().where({ name: { $regex: /john|jane/i } }).exec()

  // Using JavaScript RegExp object with word boundary
  const users = await User.query().where({ name: { $regex: /\bsmith\b/i } }).exec()

  // Using JavaScript RegExp object directly as a field value (shorthand)
  const users = await User.query().where({ name: /john/i }).exec()
  ```

  **$options** for $regex:
  - `i`: Case insensitivity
  - `m`: Multiline matching
  - `x`: Extended mode (ignore whitespace)
  - `s`: Dot matches all (including newlines)

#### Complex Queries

You can combine multiple operators for complex queries:

```typescript
// Find active users who are either admins with age > 30 or moderators with age > 25
const users = await User.query().where({
  active: true,
  $or: [
    {
      $and: [
        { role: 'admin' },
        { age: { $gt: 30 } }
      ]
    },
    {
      $and: [
        { role: 'moderator' },
        { age: { $gt: 25 } }
      ]
    }
  ]
}).exec()
```

### `whereIn(key, values)`

**Description:** Adds a whereIn clause to the query.

**Parameters:**
- `key` (string): The field name
- `values` (array): The array of values to match against

**Example (standalone):**
```typescript
// Create a query builder and add a whereIn clause
const query = User.query().whereIn('role', ['admin', 'moderator'])
```

**Example (in a query):**
```typescript
// Find users with specific roles
const users = await User.query().whereIn('role', ['admin', 'moderator']).exec()
```

### `whereNotIn(key, values)`

**Description:** Adds a whereNotIn clause to the query.

**Parameters:**
- `key` (string): The field name
- `values` (array): The array of values to exclude

**Example (standalone):**
```typescript
// Create a query builder and add a whereNotIn clause
const query = User.query().whereNotIn('role', ['guest', 'user'])
```

**Example (in a query):**
```typescript
// Find users without specific roles
const users = await User.query().whereNotIn('role', ['guest', 'user']).exec()
```

### `whereLike(key, value)`

**Description:** Adds a whereLike clause to the query (case-insensitive regex search).

**Parameters:**
- `key` (string): The field name
- `value` (string): The pattern to match

**Example (standalone):**
```typescript
// Create a query builder and add a whereLike clause
const query = User.query().whereLike('name', 'john')
```

**Example (in a query):**
```typescript
// Find users with names containing 'john'
const users = await User.query().whereLike('name', 'john').exec()
```

### `whereExists(key, exists)`

**Description:** Adds a whereExists clause to the query.

**Parameters:**
- `key` (string): The field name
- `exists` (boolean, default: true): Whether the field should exist

**Example (standalone):**
```typescript
// Create a query builder and add a whereExists clause
const query = User.query().whereExists('profile')
```

**Example (in a query):**
```typescript
// Find users with a profile field
const users = await User.query().whereExists('profile').exec()
```

### `whereNull(key)`

**Description:** Adds a whereNull clause to the query.

**Parameters:**
- `key` (string): The field name

**Example (standalone):**
```typescript
// Create a query builder and add a whereNull clause
const query = User.query().whereNull('deletedAt')
```

**Example (in a query):**
```typescript
// Find users with a null deletedAt field
const users = await User.query().whereNull('deletedAt').exec()
```

### `whereNotNull(key)`

**Description:** Adds a whereNotNull clause to the query.

**Parameters:**
- `key` (string): The field name

**Example (standalone):**
```typescript
// Create a query builder and add a whereNotNull clause
const query = User.query().whereNotNull('email')
```

**Example (in a query):**
```typescript
// Find users with a non-null email field
const users = await User.query().whereNotNull('email').exec()
```

### `orWhere(key, value)`
### `orWhere(key, operator, value)`

**Description:** Adds an orWhere clause to the query.

**Parameters:**
- `key` (string): The field name
- `operator` (string, optional): The comparison operator
- `value` (any): The field value

**Example (standalone):**
```typescript
// Create a query builder and add an orWhere clause
const query = User.query().where('role', 'admin').orWhere('role', 'moderator')
```

**Example (in a query):**
```typescript
// Find users who are either admins or moderators
const users = await User.query()
  .where('role', 'admin')
  .orWhere('role', 'moderator')
  .exec()
```

### `select(...fields)`

**Description:** Adds a select clause to the query.

**Parameters:**
- `fields` (string[]): The fields to select

**Example (standalone):**
```typescript
// Create a query builder and add a select clause
const query = User.query().select('name', 'email')
```

**Example (in a query):**
```typescript
// Find users and select only name and email fields
const users = await User.query().select('name', 'email').exec()
```

### `orderBy(field, direction)`

**Description:** Adds an orderBy clause to the query.

**Parameters:**
- `field` (string): The field to sort by
- `direction` (string, default: 'asc'): The sort direction ('asc' or 'desc')

**Example (standalone):**
```typescript
// Create a query builder and add an orderBy clause
const query = User.query().orderBy('createdAt', 'desc')
```

**Example (in a query):**
```typescript
// Find users sorted by creation date in descending order
const users = await User.query().orderBy('createdAt', 'desc').exec()
```

### `limit(value)`

**Description:** Adds a limit clause to the query.

**Parameters:**
- `value` (number): The maximum number of records to return

**Example (standalone):**
```typescript
// Create a query builder and add a limit clause
const query = User.query().limit(10)
```

**Example (in a query):**
```typescript
// Find the first 10 users
const users = await User.query().limit(10).exec()
```

### `offset(value)`

**Description:** Adds an offset clause to the query.

**Parameters:**
- `value` (number): The number of records to skip

**Example (standalone):**
```typescript
// Create a query builder and add an offset clause
const query = User.query().offset(10)
```

**Example (in a query):**
```typescript
// Find users starting from the 11th record
const users = await User.query().offset(10).exec()
```

### `first()`

**Description:** Executes the query and returns the first result.

**Parameters:** None

**Example:**
```typescript
// Find the first user matching the criteria
const user = await User.query().where('role', 'admin').first()
```

### `all()`

**Description:** Executes the query and returns all results.

**Parameters:** None

**Example:**
```typescript
// Find all users matching the criteria
const users = await User.query().where('active', true).all()
```

### `count()`

**Description:** Executes the query and returns the count.

**Parameters:** None

**Example:**
```typescript
// Count users matching the criteria
const count = await User.query().where('active', true).count()
```

### `exec()`

**Description:** Executes the query and returns the results.

**Parameters:** None

**Example:**
```typescript
// Execute the query and get the results
const users = await User.query().where('active', true).exec()
```

### `update(data)`

**Description:** Executes the query and updates matching documents.

**Parameters:**
- `data` (object): The update operations

**Example:**
```typescript
// Update users matching the criteria
const count = await User.query()
  .where('active', false)
  .update({ $set: { active: true } })
```

### `delete()`

**Description:** Executes the query and deletes matching documents.

**Parameters:** None

**Example:**
```typescript
// Delete users matching the criteria
const count = await User.query().where('active', false).delete()
```

### `insert(data)`

**Description:** Inserts a document.

**Parameters:**
- `data` (object): The document to insert

**Example:**
```typescript
// Insert a new user
const id = await User.query().insert({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})
```

### `insertMany(data)`

**Description:** Inserts multiple documents.

**Parameters:**
- `data` (array): The documents to insert

**Example:**
```typescript
// Insert multiple users
const ids = await User.query().insertMany([
  { name: 'John Doe', email: 'john@example.com', age: 30 },
  { name: 'Jane Smith', email: 'jane@example.com', age: 25 }
])
```

### `paginate(page, perPage)`

**Description:** Executes the query and paginates the results.

**Parameters:**
- `page` (number, default: 1): The page number
- `perPage` (number, default: 20): The number of records per page

**Example:**
```typescript
// Paginate users
const result = await User.query().paginate(2, 10)
// result = { total, perPage, lastPage, page, data }
```

### `aggregate(pipeline)`

**Description:** Executes a MongoDB aggregation pipeline.

**Parameters:**
- `pipeline` (array): An array of aggregation pipeline stages

**Example:**
```typescript
// Basic aggregation to count documents
const result = await User.query().aggregate([
  { $match: { active: true } },
  { $count: 'activeUsers' }
])
// result = [{ activeUsers: 42 }]

// Complex aggregation with conditional stages
const result = await Post.query().aggregate([
  { $match: { userId: user._id } },
  { $match: { published: true } },
  { $project: { title: 1, content: 1, views: 1 } },
  minViews && { $match: { views: { $gt: minViews } } },
  { $sort: { views: -1 } },
  { $limit: 10 }
])
// Falsy stages (undefined, null, false) are automatically filtered out

// Group and count by category
const result = await Post.query().aggregate([
  { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
// result = [{ _id: 'technology', count: 15 }, { _id: 'sports', count: 7 }, ...]

// Lookup to join collections
const result = await Post.query().aggregate([
  { $match: { published: true } },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'author'
    }
  },
  { $unwind: '$author' },
  { $project: { title: 1, 'author.name': 1 } }
])
// result = [{ title: 'First Post', author: { name: 'John Doe' } }, ...]
```

## Relationship Methods

These methods are available on relationship properties defined using decorators.

### `@hasOne(() => Model, foreignKey?, localKey?)`

**Description:** Defines a one-to-one relationship.

**Parameters:**
- `Model` (function): A function returning the related model class
- `foreignKey` (string, optional): The foreign key in the related model
- `localKey` (string, optional): The local key in this model

**Example:**
```typescript
class User extends MongoModel {
  @hasOne(() => Profile, 'userId', '_id')
  declare profile: any
}
```

**Usage:**
```typescript
// Get a user's profile
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')
const profile = await user.profile.exec()
```

### `@hasMany(() => Model, foreignKey?, localKey?)`

**Description:** Defines a one-to-many relationship.

**Parameters:**
- `Model` (function): A function returning the related model class
- `foreignKey` (string, optional): The foreign key in the related model
- `localKey` (string, optional): The local key in this model

**Example:**
```typescript
class User extends MongoModel {
  @hasMany(() => Post, 'userId', '_id')
  declare posts: any
}
```

**Usage:**
```typescript
// Get a user's posts
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')
const posts = await user.posts.exec()
```

### `@belongsTo(() => Model, foreignKey?, localKey?)`

**Description:** Defines a many-to-one relationship.

**Parameters:**
- `Model` (function): A function returning the related model class
- `foreignKey` (string, optional): The foreign key in this model
- `localKey` (string, optional): The local key in the related model

**Example:**
```typescript
class Post extends MongoModel {
  @belongsTo(() => User, 'userId', '_id')
  declare user: any
}
```

**Usage:**
```typescript
// Get a post's author
const post = await Post.find('60a1e2c3d4e5f6a7b8c9d0e1')
const user = await post.user.exec()
```

### Relationship Instance Methods

These methods are available on relationship instances.

#### `exec()`

**Description:** Executes the relationship query and returns the related model(s).

**Parameters:** None

**Example:**
```typescript
// Get a user's posts
const posts = await user.posts.exec()
```

#### `create(data)`

**Description:** Creates a related model.

**Parameters:**
- `data` (object): The data for the new model

**Example:**
```typescript
// Create a post for a user
const post = await user.posts.create({
  title: 'New Post',
  content: 'This is a new post'
})
```

#### `createMany(data)`

**Description:** Creates multiple related models.

**Parameters:**
- `data` (array): The data for the new models

**Example:**
```typescript
// Create multiple posts for a user
const posts = await user.posts.createMany([
  { title: 'Post 1', content: 'Content 1' },
  { title: 'Post 2', content: 'Content 2' }
])
```

#### `save(model)`

**Description:** Saves a related model.

**Parameters:**
- `model` (Model): The model to save

**Example:**
```typescript
// Save a post for a user
const post = new Post()
post.title = 'New Post'
post.content = 'This is a new post'
await user.posts.save(post)
```

#### `saveMany(models)`

**Description:** Saves multiple related models.

**Parameters:**
- `models` (array): The models to save

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

#### `associate(model)`

**Description:** Associates a model with this relationship.

**Parameters:**
- `model` (Model): The model to associate

**Example:**
```typescript
// Associate a post with a user
const post = await Post.find('60a1e2c3d4e5f6a7b8c9d0e1')
await user.posts.associate(post)
```

#### `associateMany(models)`

**Description:** Associates multiple models with this relationship.

**Parameters:**
- `models` (array): The models to associate

**Example:**
```typescript
// Associate multiple posts with a user
const post1 = await Post.find('60a1e2c3d4e5f6a7b8c9d0e1')
const post2 = await Post.find('60a1e2c3d4e5f6a7b8c9d0e2')
await user.posts.associateMany([post1, post2])
```

#### `dissociate()`

**Description:** Dissociates all related models.

**Parameters:** None

**Example:**
```typescript
// Dissociate all posts from a user
await user.posts.dissociate()
```

#### `delete()`

**Description:** Deletes all related models.

**Parameters:** None

**Example:**
```typescript
// Delete all posts from a user
await user.posts.delete()
```

#### `deleteMany(models)`

**Description:** Deletes multiple specific related models.

**Parameters:**
- `models` (array): The models to delete

**Example:**
```typescript
// Delete specific posts from a user
const posts = await user.posts.exec()
const postsToDelete = posts.filter(post => post.published === false)
await user.posts.deleteMany(postsToDelete)
```

#### `dissociate()`

**Description:** Dissociates the related model.

**Parameters:** None

**Example:**
```typescript
// Dissociate a profile from a user
await user.profile.dissociate()
```

#### `delete()`

**Description:** Deletes the related model.

**Parameters:** None

**Example:**
```typescript
// Delete a profile from a user
await user.profile.delete()
```