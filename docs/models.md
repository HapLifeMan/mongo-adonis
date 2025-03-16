# MongoDB Lucid ORM Models

This document provides a comprehensive guide to using models in the MongoDB Lucid ORM.

## Table of Contents

- [Introduction](#introduction)
- [Defining Models](#defining-models)
- [Timestamps](#timestamps)
- [CRUD Operations](#crud-operations)
- [Querying](#querying)

## Introduction

Models in MongoDB Lucid ORM are classes that represent collections in your MongoDB database. They provide a convenient way to interact with your data.

## Defining Models

To define a model, you need to extend the `MongoModel` class and define your columns using the `@column` decorator.

```typescript
import { MongoModel, column, ObjectId } from 'mongo-adonis'

class User extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare email: string
}

// Boot the model to set up collection name
User.boot()
```

## Timestamps

MongoDB Lucid ORM provides built-in support for timestamps via the `@column.dateTime()` decorator. This allows you to easily manage creation and update times for your models.

### Using Timestamp Decorators

You can use the `@column.dateTime()` decorator with the `autoCreate` and `autoUpdate` options to manage timestamps:

```typescript
import { MongoModel, column, ObjectId } from 'mongo-adonis'

// Type alias for Date objects
type DateTime = Date

class User extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare email: string

  @column.dateTime({ columnName: 'created_at', autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

In this example:
- `autoCreate: true` ensures the timestamp is set automatically when a new record is created
- `autoUpdate: true` ensures the timestamp is updated automatically when the record is modified
- `columnName` allows you to specify the column name in the database (useful for mapping camelCase properties to snake_case database fields)

### Custom Column Names

You can customize the database column names while maintaining clean property names in your code:

```typescript
class Task extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare title: string

  @column.dateTime({ columnName: 'creation_time', autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ columnName: 'last_modified', autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

### Disabling Timestamps

If you don't need timestamps for a model, simply don't add the dateTime decorators:

```typescript
class SimpleModel extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  // No timestamp fields
}
```

## CRUD Operations

### Creating Records

```typescript
// Create a new instance
const user = new User()
user.name = 'John Doe'
user.email = 'john@example.com'
await user.save() // Timestamps are handled by the column.dateTime decorator

// Or use the create method
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
}) // Timestamps are handled by the column.dateTime decorator
```

### Reading Records

```typescript
// Find a user by ID
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')

// Find a user by a specific column
const user = await User.findBy('email', 'john@example.com')

// Get all users
const users = await User.all()
```

### Updating Records

```typescript
// Find and update
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')
if (user) {
  user.name = 'John Smith'
  await user.save() // updatedAt will be automatically updated if using the dateTime decorator
}

// Update or create
const user = await User.updateOrCreate(
  { email: 'john@example.com' },
  { name: 'John Smith' }
) // Timestamps are handled by the column.dateTime decorator
```

### Deleting Records

```typescript
// Find and delete
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')
if (user) {
  await user.delete()
}

// Delete via query
await User.query().where('email', 'john@example.com').delete()
```

## Querying

You can use the query builder to create complex queries:

```typescript
// Find active users older than 25
const users = await User.query()
  .where('active', true)
  .where('age', '>', 25)
  .orderBy('name', 'asc')
  .limit(10)
  .exec()
```

For more detailed information on querying, see the [Query Builder](./query_builder.md) documentation.