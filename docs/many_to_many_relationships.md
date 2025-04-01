# Many-to-Many Relationships in MongoDB Lucid ORM

This guide explains how to work with many-to-many relationships in MongoDB Lucid ORM.

## Table of Contents

- [Introduction](#introduction)
- [Setting Up Models](#setting-up-models)
- [Defining Relationships](#defining-relationships)
- [Pivot Collections](#pivot-collections)
- [Querying Relationships](#querying-relationships)
- [Managing Relationships](#managing-relationships)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)

## Introduction

Many-to-many relationships occur when multiple records in one collection can be associated with multiple records in another collection. For example, a post can have multiple tags, and a tag can be associated with multiple posts.

In MongoDB Lucid ORM, many-to-many relationships are implemented using a pivot collection that stores the associations between the two related collections.

## Setting Up Models

To implement a many-to-many relationship, you need three models:

1. The primary model (e.g., Post)
2. The related model (e.g., Tag)
3. The pivot model (e.g., PostTag)

### Example Models:

```typescript
import { MongoModel } from 'mongo-adonis'
import { column, belongsToMany } from 'mongo-adonis'
import { ObjectId } from 'mongodb'

export class Post extends MongoModel {
  static collection = 'posts'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare title: string

  @column()
  declare content: string

  @belongsToMany(() => Tag, () => PostTag, 'post_id', 'tag_id')
  declare tags: any
}

export class Tag extends MongoModel {
  static collection = 'tags'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare slug: string

  @belongsToMany(() => Post, () => PostTag, 'tag_id', 'post_id')
  declare posts: any
}

export class PostTag extends MongoModel {
  static collection = 'post_tags'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare post_id: ObjectId

  @column()
  declare tag_id: ObjectId

  @column()
  declare createdAt: Date
}
```

## Defining Relationships

The `@belongsToMany` decorator is used to define a many-to-many relationship:

```typescript
@belongsToMany(
  () => RelatedModel,
  () => PivotModel,
  pivotForeignKey?,
  pivotRelatedKey?,
  localKey?,
  relatedKey?
)
```

### Parameters:

- `RelatedModel`: A function that returns the related model class
- `PivotModel`: A function that returns the pivot model class
- `pivotForeignKey` (optional): The foreign key in the pivot model that references the owner model
- `pivotRelatedKey` (optional): The foreign key in the pivot model that references the related model
- `localKey` (optional): The local key in the owner model (default: '_id')
- `relatedKey` (optional): The local key in the related model (default: '_id')

## Pivot Collections

The pivot collection stores the relationship data between the two models. It typically contains:

- Foreign keys to both related models
- Additional metadata about the relationship (optional)
- Timestamps or other relationship data (optional)

## Querying Relationships

Once you've defined a many-to-many relationship, you can query related models:

```typescript
// Get a post
const post = await Post.find('60a1e2c3d4e5f6a7b8c9d0e1')

// Get all tags for a post
const tags = await post.tags.exec()

// Get all posts for a tag
const tag = await Tag.find('60a1e2c3d4e5f6a7b8c9d0e1')
const posts = await tag.posts.exec()
```

## Managing Relationships

### Attaching Relations

```typescript
// Attach one or more tags to a post
await post.tags.attach([tag1._id, tag2._id])

// Attach with pivot data
await post.tags.attachWithPivotData([
  {
    id: tag1._id,
    pivotData: {
      createdAt: new Date(),
      weight: 10
    }
  },
  {
    id: tag2._id,
    pivotData: {
      createdAt: new Date(),
      weight: 5
    }
  }
])
```

### Detaching Relations

```typescript
// Detach specific tags
await post.tags.detach([tag1._id])

// Detach all tags
await post.tags.detach()
```

### Syncing Relations

```typescript
// Replace all relations with the given IDs
await post.tags.sync([tag2._id, tag3._id])

// Replace all relations with pivot data
await post.tags.syncWithPivotData([
  {
    id: tag2._id,
    pivotData: {
      createdAt: new Date(),
      weight: 8
    }
  },
  {
    id: tag3._id,
    pivotData: {
      createdAt: new Date(),
      weight: 12
    }
  }
])
```

### Checking Relations

```typescript
// Check if a relationship exists
const exists = await post.tags.exists(tag1._id)
```

## Advanced Usage

### Working with Pivot Data

```typescript
// Get pivot data for a specific relation
const pivotData = await post.tags.pivotData(tag1._id)
console.log(pivotData.weight) // 10

// Update pivot data
await post.tags.updatePivotData(tag1._id, { weight: 15 })
```

## Examples

### Creating Posts and Tags with Relationships

```typescript
// Create a post
const post = await Post.create({
  title: 'Introduction to MongoDB',
  content: 'MongoDB is a NoSQL database...'
})

// Create tags
const tag1 = await Tag.create({
  name: 'MongoDB',
  slug: 'mongodb'
})

const tag2 = await Tag.create({
  name: 'NoSQL',
  slug: 'nosql'
})

// Associate tags with the post
await post.tags.attach([tag1._id, tag2._id])
```

### Querying Posts with Specific Tags

```typescript
// Get a tag
const mongoDbTag = await Tag.query()
  .where('slug', 'mongodb')
  .first()

// Get all posts with the MongoDB tag
const posts = await mongoDbTag.posts.exec()
```

### Adding Additional Pivot Data

```typescript
// Create a post with tags and relevance scores
const post = await Post.create({
  title: 'Advanced MongoDB Techniques',
  content: 'Learn advanced techniques...'
})

// Create tags
const tag1 = await Tag.create({ name: 'MongoDB', slug: 'mongodb' })
const tag2 = await Tag.create({ name: 'Advanced', slug: 'advanced' })
const tag3 = await Tag.create({ name: 'Performance', slug: 'performance' })

// Attach tags with different relevance scores
await post.tags.attachWithPivotData([
  { id: tag1._id, pivotData: { relevance: 'high' } },
  { id: tag2._id, pivotData: { relevance: 'high' } },
  { id: tag3._id, pivotData: { relevance: 'medium' } }
])
```