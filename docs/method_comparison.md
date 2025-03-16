# Method Comparison: Lucid ORM vs MongoDB Implementation

This document provides a comparison between the standard Lucid ORM methods and our MongoDB implementation, showing which methods are supported in our package.

## Method Support Comparison

| Method Name | Lucid ORM | MongoDB Implementation | Notes |
|-------------|:---------:|:----------------------:|-------|
| `create(data)` | ✅ | ✅ | Both implementations support creating a single record |
| `createMany(data[])` | ✅ | ✅ | Both implementations support creating multiple records |
| `all()` | ✅ | ✅ | Both implementations support retrieving all records |
| `find(id)` | ✅ | ✅ | MongoDB uses ObjectId for the primary key |
| `findBy(key, value)` | ✅ | ✅ | Both implementations support finding by a key-value pair |
| `findManyBy(key, value)` | ✅ | ❌ | Not implemented in MongoDB version |
| `findManyBy(object)` | ✅ | ❌ | Not implemented in MongoDB version |
| `first()` | ✅ | ❌ | Use `query().first()` in MongoDB version |
| `findOrFail(id)` | ✅ | ❌ | Not implemented in MongoDB version |
| `firstOrFail()` | ✅ | ❌ | Not implemented in MongoDB version |
| `findByOrFail(key, value)` | ✅ | ❌ | Not implemented in MongoDB version |
| `query()` | ✅ | ✅ | Both implementations support query builder |
| `firstOrCreate(search, save?)` | ✅ | ✅ | Both implementations support find or create |
| `firstOrNew(search, data?)` | ❌ | ✅ | MongoDB-specific method |
| `fetchOrCreateMany(key, objects[])` | ✅ | ❌ | Not implemented in MongoDB version |
| `updateOrCreate(search, data)` | ✅ | ✅ | Both implementations support update or create |
| `updateOrCreateMany(key, objects[])` | ✅ | ❌ | Not implemented in MongoDB version |
| `updateOrCreateMany(keys[], objects[])` | ✅ | ❌ | Not implemented in MongoDB version |
| `truncate()` | ❌ | ✅ | MongoDB-specific method to delete all records |
| `registerRelationship(name, callback)` | ❌ | ✅ | MongoDB-specific method for relationships |
| `save()` | ✅ | ✅ | Both implementations support saving a model (fixed to properly update records and refresh after saving) |
| `delete()` | ✅ | ✅ | Both implementations support deleting a model |
| `refresh()` | ❌ | ✅ | MongoDB-specific method to refresh from database (improved to handle missing records) |
| `fill(attributes)` | ✅ | ✅ | Both implementations support filling attributes |
| `merge(attributes)` | ✅ | ❌ | Use `fill()` in MongoDB version |
| `getAttribute(key)` | ❌ | ✅ | MongoDB-specific method |
| `setAttribute(key, value)` | ❌ | ✅ | MongoDB-specific method |
| `isDirty(key?)` | ❌ | ✅ | MongoDB-specific method |
| `toObject()` | ❌ | ✅ | MongoDB-specific method |
| `toJSON()` | ✅ | ✅ | Both implementations support JSON serialization |

## Relationship Decorators

Our MongoDB implementation supports the same relationship decorators as the standard Lucid ORM:

| Decorator | Description | Example |
|-----------|-------------|---------|
| `@hasOne(() => Model, foreignKey?, localKey?)` | Defines a one-to-one relationship | `@hasOne(() => Profile)` |
| `@hasMany(() => Model, foreignKey?, localKey?)` | Defines a one-to-many relationship | `@hasMany(() => Post)` |
| `@belongsTo(() => Model, foreignKey?, localKey?)` | Defines a many-to-one relationship | `@belongsTo(() => User)` |

### Example Usage

```typescript
import { MongoModel, column, hasOne, hasMany, belongsTo } from 'mongo-adonis'
import { Post } from './post_model'
import { Profile } from './profile_model'
import { Role } from './role_model'

export class User extends MongoModel {
  @column({ isPrimary: true })
  public _id!: ObjectId

  @column()
  public name!: string

  @column()
  public email!: string

  @column()
  public role_id!: ObjectId

  // One-to-many relationship
  @hasMany(() => Post)
  public posts: any

  // One-to-one relationship
  @hasOne(() => Profile)
  public profile: any

  // Many-to-one relationship
  @belongsTo(() => Role)
  public role: any
}
```

### Relationship Methods

Each relationship decorator provides the following methods:

#### HasOne and BelongsTo

- `exec()`: Fetch the related model
- `save(model)`: Save a related model
- `create(data)`: Create a related model
- `associate(model)`: Associate an existing model
- `dissociate()`: Dissociate the related model

#### HasMany

- `exec()`: Fetch all related models
- `save(model)`: Save a related model
- `saveMany(models)`: Save multiple related models
- `create(data)`: Create a related model
- `createMany(data[])`: Create multiple related models
- `associate(model)`: Associate an existing model
- `dissociate(model?)`: Dissociate a related model or all related models

## Recent Improvements

We've made the following improvements to the MongoDB implementation:

1. **Fixed `save()` method**: The `save()` method now properly updates records in the database, refreshes the model after saving, and updates the original attributes.
2. **Enhanced `update()` method**: The query builder's `update()` method now correctly handles both direct updates and updates with MongoDB operators like `$set`.
3. **Improved `refresh()` method**: The `refresh()` method now gracefully handles the case when a model is not found in the database by marking the model as new.
4. **Fixed relationship methods**: Relationship methods now properly execute queries and return model instances with all methods available.
5. **Improved query builder**: The query builder now returns proper model instances with all methods available, not just raw database objects.
6. **Added relationship decorators**: The package now supports the same relationship decorators as the standard Lucid ORM.

## Key Differences

1. **Primary Key**:
   - Lucid ORM: Uses auto-incrementing integer `id` by default
   - MongoDB: Uses `_id` with ObjectId type

2. **Storage**:
   - Lucid ORM: Uses SQL tables
   - MongoDB: Uses collections

3. **Query Syntax**:
   - Lucid ORM: SQL-based query builder
   - MongoDB: Document-oriented query builder with MongoDB operators

4. **Relationships**:
   - Lucid ORM: Uses SQL joins and has built-in relationship methods
   - MongoDB: Uses relationship decorators and methods similar to Lucid ORM

5. **OrFail Methods**:
   - Lucid ORM: Has several OrFail variations
   - MongoDB: Does not implement OrFail methods directly

## MongoDB-Specific Features

Our MongoDB implementation includes several features not found in the standard Lucid ORM:

1. **ObjectId Support**: Native support for MongoDB's ObjectId type
2. **Document-Oriented Queries**: Query builder designed for MongoDB's document model
3. **Custom Relationship Registration**: Flexible relationship definition through decorators
4. **Model State Management**: Methods like `isDirty()` and `refresh()` for managing model state

## Recommended Migration Path

When migrating from Lucid ORM to our MongoDB implementation:

1. Update primary key references from `id` to `_id`
2. Replace any missing methods with their MongoDB equivalents:
   - `findManyBy` → Use `query()` with `where()` conditions
   - `firstOrFail` → Use `first()` with manual error handling
   - `merge()` → Use `fill()`
3. Update relationship decorators to use MongoDB models
4. Update query syntax to use MongoDB operators

## References

- [Lucid ORM Documentation](./lucid_base_model.md)
- [MongoDB Implementation Documentation](./base_model.md)