[![npm-image]][npm-url] [![license-image]][license-url] [![adonisjs-image]][adonisjs-url] [![mongodb-image]][mongodb-url] [![nodejs-image]][nodejs-url] ![typescript-image]


# Adonis x Lucid x Mongo

> [!WARNING]
> 🚧 This package is in active development and may contain breaking changes. While it contains 100+ tests to ensure reliability, I recommend using it in production with caution. The documentation may not be up-to-date and can have inconsistent information. Thanks for your understanding!

> Leverage the power of objects in Node.js with MongoDB's object-oriented database and AdonisJS 6's Lucid ORM. Built specifically for AdonisJS 6, `mongo-adonis` supports latest MongoDB versions.

## ✨ Features

- 🔌 **Seamless MongoDB Integration**: Use MongoDB with the familiar Lucid ORM API
- 🎯 **TypeScript First**: Full type safety and autocompletion
- 🔄 **Active Record Pattern**: Intuitive model-based database operations
- 🔗 **Rich Relationships**: Support for HasOne, HasMany, BelongsTo relationships
- 🎨 **Decorator Support**: Clean and declarative model definitions
- 🔍 **Powerful Query Builder**: Fluent API for complex queries
- 🧠 **Direct MongoDB Access**: Use MongoDB's native API directly with `db.collection.find({})`
- 🔐 **Built-in Auth Support**: Works seamlessly with AdonisJS 6 auth
- 📦 **Zero Configuration**: Get started with minimal setup

## 🗺️ Roadmap

- [ ] Create boilerplate
- [ ] Improve query builder
- [ ] Many-to-Many relationships
- [ ] Paginate methods
- [ ] Serializers (vanilla + JSON)
- [ ] ? Migrations
- [ ] ? Factories
- [ ] ? Seeds

## 🚀 Quick Start

### 1. Install the Package

```bash
bun install mongo-adonis
```

### 2. Configure the Provider

```bash
node ace configure mongo-adonis
```

### 3. Fill Environment Variables

```env
MONGODB_CONNECTION=mongodb
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/mongo-adonis
MONGODB_HOST=127.0.0.1
MONGODB_PORT=27017
MONGODB_USER=
MONGODB_PASSWORD=
MONGODB_DATABASE=mongo-adonis
MONGODB_AUTH_SOURCE=admin
```

## 📝 Usage Examples

### Basic Model Definition

```ts
import { MongoModel, column, ObjectId } from 'mongo-adonis'

export class Post extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare content: string
}
```

### CRUD Operations

```ts
// Create
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret'
})

// Read
const user = await User.find('60a1e2c3d4e5f6a7b8c9d0e1')
const users = await User.all()

// Update
user.name = 'Jane Doe'
await user.save()

// Delete
await user.delete()
```

### Advanced Queries

```ts
// Complex queries with the fluent API
const activeUsers = await User.query()
  .where('status', 'active')
  .where('age', '>=', 18)
  .orderBy('name', 'asc')
  .limit(10)
  .offset(0)
  .all()
```

### Relationships

```ts
import { column, hasMany, belongsTo, ObjectId, MongoModel } from 'mongo-adonis'

export class User extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>
}

export class Post extends MongoModel {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare title: string

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
```

### Working with Relationships

```ts
// Create a user with posts
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
})

// Create posts for the user
await user.posts.create({
  title: 'First Post',
  content: 'Hello World!'
})

await user.posts.createMany([
  {
    title: 'Second Post',
    content: 'Another post',
  },
  {
    title: 'Third Post',
    content: 'Another one',
  }
])

// Load user with their posts
const userWithPosts = await User.query().where('_id', user._id).first()

// Get all posts for a user
const userPosts = await user.posts.all()

// Find a post and load its user
const post = await Post.query().where('_id', postId).first()

// Get the user of a post
const postUser = await post.user.exec()

// Update a post's user
const newUser = await User.find(newUserId)
await post.user.associate(newUser)

// Remove a post from a user
await post.user.dissociate()
```

## 🔐 Authentication

Works seamlessly with AdonisJS 6 auth, update the `app/models/user.ts` file:

```ts
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { MongoModel, column, withAuthFinder, ObjectId } from 'mongo-adonis'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(MongoModel, AuthFinder) {
  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare email: string

  @column({ serialize: false })
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
```

## 🤝 Contributing

Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

[npm-image]: https://img.shields.io/npm/v/mongo-adonis.svg
[npm-url]: https://npmjs.org/package/mongo-adonis
[license-image]: https://img.shields.io/npm/l/mongo-adonis
[license-url]: LICENSE.md
[adonisjs-image]: https://img.shields.io/badge/AdonisJS-6-5A45FF
[adonisjs-url]: https://adonisjs.com
[mongodb-image]: https://img.shields.io/badge/MongoDB-4.0--8.0-47A248
[mongodb-url]: https://www.mongodb.com/docs/drivers/node/current/compatibility/
[nodejs-image]: https://img.shields.io/badge/Node.js-16--22-339933
[nodejs-url]: https://www.mongodb.com/docs/drivers/node/current/compatibility/
[typescript-image]: https://img.shields.io/badge/TypeScript-3178C6