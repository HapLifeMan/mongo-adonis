# MongoModel Base Class Documentation

This document provides a simple overview of all methods available in the `MongoModel` base class.

## Method Reference Table

| Method Name | Category | Description |
|-------------|----------|-------------|
| `boot()` | Static/Setup | Boot the model and set up collection name |
| `query()` | Static/Query | Get the query builder for the model |
| `all()` | Static/Query | Get all records from the database |
| `find(id)` | Static/Query | Find a record by its primary key |
| `findBy(key, value)` | Static/Query | Find a record by a key-value pair |
| `create(data)` | Static/Create | Create a new record |
| `createMany(data)` | Static/Create | Create multiple records |
| `updateOrCreate(search, data)` | Static/Create | Update or create a record |
| `firstOrCreate(search, data?)` | Static/Create | Find the first matching record or create a new one |
| `firstOrNew(search, data?)` | Static/Create | Find the first matching record or instantiate a new one |
| `truncate()` | Static/Delete | Delete all records from the collection |
| `registerRelationship(name, callback)` | Static/Relationship | Register a relationship method on the model |
| `fill(attributes)` | Instance/Attribute | Fill the model with attributes |
| `getAttribute(key)` | Instance/Attribute | Get an attribute |
| `setAttribute(key, value)` | Instance/Attribute | Set an attribute |
| `isDirty(key?)` | Instance/Attribute | Check if the model is dirty |
| `save()` | Instance/Persistence | Save the model to the database |
| `delete()` | Instance/Persistence | Delete the model from the database |
| `refresh()` | Instance/Persistence | Refresh the model from the database |
| `toObject()` | Instance/Serialization | Convert the model to a plain object |
| `toJSON()` | Instance/Serialization | Convert the model to JSON |

## Static Properties

- `$adapter`: The adapter used for executing queries
- `booted`: A boolean indicating if the model has been booted
- `primaryKey`: The primary key for the model (default: '_id')
- `collection`: The collection name for the model
- `connection`: The connection name for the model (default: 'mongodb')
- `$hooks`: Hooks for the model

## Static Methods

### Query Methods

- `boot()`: Boot the model
- `query()`: Get the query builder for the model
- `all()`: Get all records from the database
- `find(id)`: Find a record by its primary key
- `findBy(key, value)`: Find a record by a key-value pair

### Create Methods

- `create(data)`: Create a new record
- `createMany(data)`: Create multiple records

### Find or Create Methods

- `updateOrCreate(search, data)`: Update or create a record
- `firstOrCreate(search, data?)`: Find the first matching record or create a new one
- `firstOrNew(search, data?)`: Find the first matching record or instantiate a new one

### Delete Methods

- `truncate()`: Delete all records from the collection

### Relationship Methods

- `registerRelationship(name, callback)`: Register a relationship method on the model

## Instance Properties

- `$primaryKeyValue`: The primary key value
- `$isNew`: A boolean indicating if the model is a new record
- `$original`: The original attributes of the model
- `$attributes`: The attributes of the model

## Instance Getters

- `$primaryKey`: Get the primary key name
- `$collection`: Get the collection name
- `$connection`: Get the connection name

## Instance Methods

### Attribute Methods

- `fill(attributes)`: Fill the model with attributes
- `getAttribute(key)`: Get an attribute
- `setAttribute(key, value)`: Set an attribute
- `isDirty(key?)`: Check if the model is dirty

### Persistence Methods

- `save()`: Save the model to the database
- `delete()`: Delete the model from the database
- `refresh()`: Refresh the model from the database

### Serialization Methods

- `toObject()`: Convert the model to a plain object
- `toJSON()`: Convert the model to JSON

## Usage Example

```typescript
import { MongoModel } from 'mongo-adonis'

class User extends MongoModel {
  // Define your model properties and methods here
}

// Find a user by ID
const user = await User.find('60f7b0b9e6b3f3b3e8b4b1a1')

// Create a new user
const newUser = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
})

// Update a user
user.name = 'Jane Doe'
await user.save()

// Delete a user
await user.delete()
```