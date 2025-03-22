# Model Serialization in MongoDB Lucid ORM

This document explains the serialization options available in MongoDB Lucid ORM for controlling how model data is converted to JSON.

## Overview

When returning models in HTTP responses or using `JSON.stringify()`, MongoDB Lucid ORM automatically serializes models into JSON objects. You can customize this serialization behavior using several options in the `@column` and `@computed` decorators.

## Serialization Options

MongoDB Lucid ORM provides two primary ways to control serialization:

1. **serialize**: Determines whether a field should be included in the serialized output.
2. **serializeAs**: Controls the field name in the serialized output or excludes the field.

### The `serialize` Option

The `serialize` option is a boolean value that determines whether a field should be included in the serialized output.

```typescript
@column({ serialize: false })
declare password: string
```

In this example, the `password` field will be excluded from the serialized output.

### The `serializeAs` Option

The `serializeAs` option provides more fine-grained control over serialization:

- If `serializeAs` is a string, the field will be included in the serialized output with that name.
- If `serializeAs` is `null`, the field will be excluded from the serialized output.

```typescript
// Rename field in serialized output
@column({ serializeAs: 'fullName' })
declare name: string

// Exclude field from serialized output
@column({ serializeAs: null })
declare internalNote: string
```

## Examples

Here's a comprehensive example demonstrating various serialization options:

```typescript
import { MongoModel, column, computed, ObjectId } from 'mongo-adonis'

class User extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  // Regular field (included in serialization with same name)
  @column()
  declare firstName: string

  @column()
  declare lastName: string

  // Field renamed in serialization
  @column({ serializeAs: 'email_address' })
  declare email: string

  // Field excluded from serialization
  @column({ serialize: false })
  declare password: string

  // Alternative way to exclude from serialization
  @column({ serializeAs: null })
  declare internalNotes: string

  // Computed property (included in serialization)
  @computed()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  // Computed property excluded from serialization
  @computed({ serialize: false })
  get internalId(): string {
    return `ID-${this._id}`
  }

  // Computed property renamed in serialization
  @computed({ serializeAs: 'full_address' })
  get address(): string {
    return `${this.street}, ${this.city}, ${this.country}`
  }

  // Computed property excluded from serialization
  @computed({ serializeAs: null })
  get secretInfo(): string {
    return 'This will not be visible in JSON'
  }
}
```

When this model is serialized, the output will be:

```json
{
  "_id": "ObjectId('...')",
  "firstName": "John",
  "lastName": "Doe",
  "email_address": "john@example.com",
  "fullName": "John Doe",
  "full_address": "123 Main St, New York, USA"
}
```

Note that `password`, `internalNotes`, `internalId`, and `secretInfo` are not included in the serialized output.

## Using Serialization

### Explicit Serialization

You can explicitly serialize a model using the `serialize` method:

```typescript
const user = await User.find(userId)
const serializedUser = user.serialize()
```

### Automatic Serialization

Models are automatically serialized when:

1. Returned in an HTTP response in AdonisJS 6
2. Used with `JSON.stringify()`

```typescript
// In an AdonisJS controller
return response.json(await User.find(userId))

// Using JSON.stringify
const userJson = JSON.stringify(await User.find(userId))
```

## Combining with Other Features

### Serialization with Transformations

You can combine serialization options with data transformations:

```typescript
@column({
  serializeAs: 'publish_date',
  prepare: (value: Date) => value.toISOString(),
  consume: (value: string) => new Date(value)
})
declare publishedAt: Date
```