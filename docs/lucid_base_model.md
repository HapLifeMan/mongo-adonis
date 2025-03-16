# Lucid ORM Base Model Documentation

This document provides a simple overview of all methods available in the standard Lucid ORM base model, based on the [official Lucid documentation](https://lucid.adonisjs.com/docs/crud-operations).

## Method Reference Table

| Method Name | Category | Description |
|-------------|----------|-------------|
| `create(data)` | Static/Create | Create a new record and persist it to the database |
| `createMany(data[])` | Static/Create | Create multiple records with one insert query per model |
| `all()` | Static/Query | Get all records from the database |
| `find(id)` | Static/Query | Find a record by its primary key |
| `findBy(key, value)` | Static/Query | Find a record by a column name and its value |
| `findManyBy(key, value)` | Static/Query | Find multiple records by a column name and its value |
| `findManyBy(object)` | Static/Query | Find multiple records by multiple column names and values |
| `first()` | Static/Query | Fetch the first record from the database |
| `findOrFail(id)` | Static/Query | Find a record by its primary key or fail with exception |
| `firstOrFail()` | Static/Query | Fetch the first record or fail with exception |
| `findByOrFail(key, value)` | Static/Query | Find a record by column or fail with exception |
| `query()` | Static/Query | Get a query builder instance for the model |
| `firstOrCreate(search, save?)` | Static/Idempotent | Find first record or create if not exists |
| `fetchOrCreateMany(key, objects[])` | Static/Idempotent | Find records by key or create if not exists |
| `updateOrCreate(search, data)` | Static/Idempotent | Update existing record or create new one |
| `updateOrCreateMany(key, objects[])` | Static/Idempotent | Update existing records or create new ones using a single key |
| `updateOrCreateMany(keys[], objects[])` | Static/Idempotent | Update existing records or create new ones using multiple keys |
| `save()` | Instance/Persistence | Save the model to the database (insert or update) |
| `delete()` | Instance/Persistence | Delete the model from the database |
| `fill(attributes)` | Instance/Attribute | Fill the model with attributes |
| `merge(attributes)` | Instance/Attribute | Merge attributes into the model |

## Static Methods

### Create Methods

- `create(data)`: Create a new record and persist it to the database
  ```typescript
  const user = await User.create({
    username: 'test',
    email: 'test@example.com',
  })
  ```

- `createMany(data[])`: Create multiple records with one insert query per model
  ```typescript
  const users = await User.createMany([
    {
      email: 'test@example.com',
      password: 'secret',
    },
    {
      email: 'romain@example.com',
      password: 'secret',
    },
  ])
  ```

### Query Methods

- `all()`: Get all records from the database
  ```typescript
  const users = await User.all()
  // SQL: SELECT * from "users" ORDER BY "id" DESC;
  ```

- `find(id)`: Find a record by its primary key
  ```typescript
  const user = await User.find(1)
  // SQL: SELECT * from "users" WHERE "id" = 1 LIMIT 1;
  ```

- `findBy(key, value)`: Find a record by a column name and its value
  ```typescript
  const user = await User.findBy('email', 'test@example.com')
  // SQL: SELECT * from "users" WHERE "email" = 'test@example.com' LIMIT 1;
  ```

- `findManyBy(key, value)`: Find multiple records by a column name and its value
  ```typescript
  const users = await User.findManyBy('status', 'active')
  // SQL: SELECT * from "users" WHERE "status" = 'active';
  ```

- `findManyBy(object)`: Find multiple records by multiple column names and values
  ```typescript
  const posts = await Post.findManyBy({ status: 'published', userId: 1 })
  // SQL: SELECT * from "posts" WHERE "status" = 'published' AND "userId" = 1;
  ```

- `first()`: Fetch the first record from the database
  ```typescript
  const user = await User.first()
  // SQL: SELECT * from "users" LIMIT 1;
  ```

### OrFail Variations

- `findOrFail(id)`: Find a record by its primary key or fail with exception
  ```typescript
  const user = await User.findOrFail(1)
  ```

- `firstOrFail()`: Fetch the first record or fail with exception
  ```typescript
  const user = await User.firstOrFail()
  ```

- `findByOrFail(key, value)`: Find a record by column or fail with exception
  ```typescript
  const user = await User.findByOrFail('email', 'test@example.com')
  ```

### Query Builder

- `query()`: Get a query builder instance for the model
  ```typescript
  const users = await User
    .query()
    .where('countryCode', 'IN')
    .orWhereNull('countryCode')
  ```

### Idempotent Methods

- `firstOrCreate(search, save?)`: Find first record or create if not exists
  ```typescript
  await User.firstOrCreate(
    { email: 'test@example.com' },
    { password: 'secret' }
  )
  ```

- `fetchOrCreateMany(key, objects[])`: Find records by key or create if not exists
  ```typescript
  await User.fetchOrCreateMany('email', [
    {
      email: 'foo@example.com',
      username: 'foo',
    },
    {
      email: 'bar@example.com',
      username: 'bar',
    },
  ])
  ```

- `updateOrCreate(search, data)`: Update existing record or create new one
  ```typescript
  await User.updateOrCreate(
    { email: 'test@example.com' },
    { password: 'secret' }
  )
  ```

- `updateOrCreateMany(key, objects[])`: Update existing records or create new ones using a single key
  ```typescript
  await User.updateOrCreateMany('email', [
    {
      email: 'foo@example.com',
      username: 'foo',
    },
    {
      email: 'bar@example.com',
      username: 'bar',
    },
  ])
  ```

- `updateOrCreateMany(keys[], objects[])`: Update existing records or create new ones using multiple keys
  ```typescript
  await User.updateOrCreateMany(['email', 'username'], [
    {
      email: 'foo@example.com',
      username: 'foo',
    },
    {
      email: 'bar@example.com',
      username: 'bar',
    },
  ])
  ```

## Instance Methods

### Persistence Methods

- `save()`: Save the model to the database (insert or update)
  ```typescript
  const user = new User()
  user.username = 'test'
  user.email = 'test@example.com'
  await user.save()
  ```

- `delete()`: Delete the model from the database
  ```typescript
  const user = await User.findOrFail(1)
  await user.delete()
  ```

### Attribute Methods

- `fill(attributes)`: Fill the model with attributes
  ```typescript
  const user = new User()
  await user
    .fill({ username: 'test', email: 'test@example.com' })
    .save()
  ```

- `merge(attributes)`: Merge attributes into the model
  ```typescript
  await user.merge({ lastLoginAt: DateTime.local() }).save()
  ```

## Comparison with MongoDB Implementation

The Lucid ORM for MongoDB (`MongoModel`) implements many of the same methods as the standard Lucid ORM, but with adaptations for MongoDB's document-oriented nature. Key differences include:

1. MongoDB uses `_id` as the default primary key (typically an ObjectId) instead of an auto-incrementing integer
2. MongoDB uses collections instead of tables
3. MongoDB has different query operators and syntax
4. Some methods like `fetchOrCreateMany` and `findManyBy` may not be available in the MongoDB implementation

For MongoDB-specific functionality, refer to the [MongoModel documentation](./base_model.md).

## References

- [Lucid ORM CRUD Operations Documentation](https://lucid.adonisjs.com/docs/crud-operations)