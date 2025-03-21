# Direct MongoDB Access

This package provides a way to directly access MongoDB collections using a simple dot notation, similar to the native MongoDB shell syntax.

## Setup

The MongoDB client is automatically initialized when your application starts, so you can import and use the `db` object directly:

```ts
import { db } from 'mongo-adonis'

// Now you can use it like the MongoDB shell:
const users = await db.users.find({}).toArray()
const user = await db.users.findOne({ email: 'user@example.com' })

// Insert a document
await db.users.insertOne({
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date()
})

// Update a document
await db.users.updateOne(
  { email: 'john@example.com' },
  { $set: { name: 'John Updated' } }
)

// Delete a document
await db.users.deleteOne({ email: 'john@example.com' })
```

## Available Methods

All MongoDB collection methods are available:

- `find()`
- `findOne()`
- `insertOne()`
- `insertMany()`
- `updateOne()`
- `updateMany()`
- `deleteOne()`
- `deleteMany()`
- `aggregate()`
- `count()`
- `distinct()`
- ... and all other methods provided by the official MongoDB driver