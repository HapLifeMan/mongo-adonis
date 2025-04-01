/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * This file contains shared test fixtures that can be used across all test files.
 * It provides functions to create common test models and data.
 */

import { MongoModel } from '../src/model/base_model.js'
import { column, hasOne, hasMany, belongsTo, belongsToMany, beforeSave, afterSave, beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeDelete, afterDelete, beforeFind, afterFind } from '../src/model/main.js'
import { ObjectId } from 'mongodb'

// Define test models that can be used across test files
export class User extends MongoModel {
  static collection = 'users'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare email: string

  @column()
  declare age: number

  @column()
  declare active: boolean

  @column()
  declare role: string

  @hasMany(() => Post, 'userId')
  declare posts: any

  @hasOne(() => Profile, 'userId')
  declare profile: any

  @beforeSave()
  public static setBeforeSaveFlag(user: User): void {
    user.beforeSaveTriggered = true

    if (user.$isNew) {
      user.lastOperation = 'create'
    } else {
      user.lastOperation = 'update'
    }
  }

  @afterSave()
  public static setAfterSaveFlag(user: User): void {
    user.afterSaveTriggered = true
  }

  @beforeCreate()
  public static setBeforeCreateFlag(user: User): void {
    user.beforeCreateTriggered = true
  }

  @afterCreate()
  public static setAfterCreateFlag(user: User): void {
    user.afterCreateTriggered = true
  }

  @beforeUpdate()
  public static setBeforeUpdateFlag(user: User): void {
    user.beforeUpdateTriggered = true
  }

  @afterUpdate()
  public static setAfterUpdateFlag(user: User): void {
    user.afterUpdateTriggered = true
  }

  @beforeDelete()
  public static setBeforeDeleteFlag(user: User): void {
    user.beforeDeleteTriggered = true
  }

  @afterDelete()
  public static setAfterDeleteFlag(user: User): void {
    user.afterDeleteTriggered = true
  }

  @beforeFind()
  public static setBeforeFindFlag(query: any): void {
    // Store flag in query context to be retrieved later
    if (!query.context) {
      query.context = {}
    }
    query.context.beforeFindTriggered = true
  }

  @afterFind()
  public static setAfterFindFlag(user: User): void {
    user.afterFindTriggered = true
  }
}

export class Post extends MongoModel {
  static collection = 'posts'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare title: string

  @column()
  declare content: string

  @column()
  declare published: boolean

  @column()
  declare views: number

  @column()
  declare userId: ObjectId

  @column()
  declare categoryId: ObjectId

  @column()
  declare createdAt: Date

  @belongsTo(() => User, 'userId', '_id')
  declare user: any

  @belongsTo(() => Category, 'categoryId', '_id')
  declare category: any

  @hasMany(() => Comment, 'postId')
  declare comments: any

  @belongsToMany(() => Tag, () => PostTag, 'post_id', 'tag_id')
  declare tags: any
}

export class Profile extends MongoModel {
  static collection = 'profiles'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare bio: string

  @column()
  declare location: string

  @column()
  declare userId: ObjectId

  @belongsTo(() => User, 'userId', '_id')
  declare user: any
}

export class Comment extends MongoModel {
  static collection = 'comments'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare content: string

  @column()
  declare postId: ObjectId

  @column()
  declare userId: ObjectId

  @column()
  declare createdAt: Date

  @belongsTo(() => Post, 'postId', '_id')
  declare post: any

  @belongsTo(() => User, 'userId', '_id')
  declare user: any
}

export class Category extends MongoModel {
  static collection = 'categories'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare slug: string

  @hasMany(() => Post, 'categoryId')
  declare posts: any
}

export class Product extends MongoModel {
  static collection = 'products'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare price: number

  @column()
  declare category: string

  @column()
  declare inStock: boolean

  @column()
  declare tags: string[]

  @column()
  declare description: string | null

  @column()
  declare rating: number
}

export class Cocktail extends MongoModel {
  static collection = 'cocktails'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare description: string

  @column()
  declare instructions: string

  @column()
  declare glassType: string

  @column()
  declare imageUrl: string | null

  @hasMany(() => Ingredient, 'cocktailId')
  declare ingredients: any

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

  @beforeDelete()
  public static async deleteRelatedPrice(cocktail: Cocktail): Promise<void> {
    await cocktail.ingredients.delete()
    await cocktail.price.delete()
  }
}

export class Price extends MongoModel {
  static collection = 'prices'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare amount: number

  @column()
  declare currency: string

  @column()
  declare cocktailId: ObjectId

  @belongsTo(() => Cocktail, 'cocktailId', '_id')
  declare cocktail: any
}

export class Ingredient extends MongoModel {
  static collection = 'ingredients'

  @column({ isPrimary: true })
  declare _id: ObjectId

  @column()
  declare name: string

  @column()
  declare quantity: string

  @column()
  declare unit: string

  @column()
  declare cocktailId: ObjectId

  @belongsTo(() => Cocktail, 'cocktailId', '_id')
  declare cocktail: any
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

/**
 * Boot all models to ensure they are registered
 */
export function bootModels() {
  User.boot()
  Post.boot()
  Profile.boot()
  Comment.boot()
  Category.boot()
  Product.boot()
  Cocktail.boot()
  Price.boot()
  Ingredient.boot()
  Tag.boot()
  PostTag.boot()
}

/**
 * Create test users
 */
export async function createTestUsers() {
  return await User.createMany([
    { name: 'John Doe', email: 'john@example.com', age: 30, active: true, role: 'admin' },
    { name: 'Jane Smith', email: 'jane@example.com', age: 25, active: true, role: 'user' },
    { name: 'Bob Johnson', email: 'bob@example.com', age: 40, active: false, role: 'user' },
    { name: 'Alice Brown', email: 'alice@example.com', age: 35, active: true, role: 'editor' },
    { name: 'Charlie Wilson', email: 'charlie@example.com', age: 28, active: false, role: 'user' }
  ])
}

/**
 * Create test categories
 */
export async function createTestCategories() {
  return await Category.createMany([
    { name: 'Technology', slug: 'technology' },
    { name: 'Health', slug: 'health' },
    { name: 'Business', slug: 'business' },
    { name: 'Lifestyle', slug: 'lifestyle' },
    { name: 'Science', slug: 'science' }
  ])
}

/**
 * Create test posts linked to users and categories
 */
export async function createTestPosts(users: any[], categories: any[]) {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return await Post.createMany([
    {
      title: 'Getting Started with MongoDB',
      content: 'MongoDB is a NoSQL database...',
      published: true,
      views: 120,
      userId: users[0]._id,
      categoryId: categories[0]._id,
      createdAt: now
    },
    {
      title: 'Healthy Eating Habits',
      content: 'Eating healthy is important...',
      published: true,
      views: 85,
      userId: users[1]._id,
      categoryId: categories[1]._id,
      createdAt: yesterday
    },
    {
      title: 'Business Strategies for 2023',
      content: 'In the current economic climate...',
      published: false,
      views: 0,
      userId: users[0]._id,
      categoryId: categories[2]._id,
      createdAt: lastWeek
    },
    {
      title: 'Modern Web Development',
      content: 'Web development has evolved...',
      published: true,
      views: 200,
      userId: users[3]._id,
      categoryId: categories[0]._id,
      createdAt: yesterday
    },
    {
      title: 'The Science of Sleep',
      content: 'Sleep is essential for health...',
      published: true,
      views: 150,
      userId: users[2]._id,
      categoryId: categories[4]._id,
      createdAt: lastWeek
    },
    {
      title: 'Work-Life Balance',
      content: 'Maintaining a healthy balance...',
      published: true,
      views: 95,
      userId: users[1]._id,
      categoryId: categories[3]._id,
      createdAt: now
    }
  ])
}

/**
 * Create test profiles linked to users
 */
export async function createTestProfiles(users: any[]) {
  return await Profile.createMany([
    { bio: 'Software developer with 10 years of experience', location: 'New York', userId: users[0]._id },
    { bio: 'Health enthusiast and yoga instructor', location: 'Los Angeles', userId: users[1]._id },
    { bio: 'Business consultant and entrepreneur', location: 'Chicago', userId: users[2]._id },
    { bio: 'Editor and content creator', location: 'Boston', userId: users[3]._id },
    { bio: 'Freelance writer and blogger', location: 'Seattle', userId: users[4]._id }
  ])
}

/**
 * Create test comments linked to posts and users
 */
export async function createTestComments(posts: any[], users: any[]) {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  return await Comment.createMany([
    { content: 'Great article!', postId: posts[0]._id, userId: users[1]._id, createdAt: now },
    { content: 'I learned a lot from this.', postId: posts[0]._id, userId: users[2]._id, createdAt: yesterday },
    { content: 'Very informative.', postId: posts[1]._id, userId: users[0]._id, createdAt: now },
    { content: 'I disagree with some points.', postId: posts[3]._id, userId: users[2]._id, createdAt: yesterday },
    { content: 'Looking forward to more content like this.', postId: posts[4]._id, userId: users[3]._id, createdAt: now },
    { content: 'This changed my perspective.', postId: posts[5]._id, userId: users[4]._id, createdAt: yesterday },
    { content: 'Can you elaborate more on this topic?', postId: posts[0]._id, userId: users[3]._id, createdAt: now },
    { content: 'I have a question about this.', postId: posts[2]._id, userId: users[1]._id, createdAt: yesterday }
  ])
}

/**
 * Create test products
 */
export async function createTestProducts() {
  return await Product.createMany([
    { name: 'Laptop', price: 1200, category: 'electronics', inStock: true, tags: ['computer', 'portable'], description: 'A powerful laptop', rating: 4.5 },
    { name: 'Smartphone', price: 800, category: 'electronics', inStock: true, tags: ['mobile', 'portable'], description: 'Latest smartphone', rating: 4.2 },
    { name: 'Headphones', price: 150, category: 'electronics', inStock: false, tags: ['audio', 'portable'], description: null, rating: 3.8 },
    { name: 'Desk', price: 300, category: 'furniture', inStock: true, tags: ['office', 'wood'], description: 'Sturdy desk', rating: 4.0 },
    { name: 'Chair', price: 150, category: 'furniture', inStock: true, tags: ['office', 'comfort'], description: 'Ergonomic chair', rating: 4.3 },
    { name: 'Bookshelf', price: 200, category: 'furniture', inStock: false, tags: ['storage', 'wood'], description: null, rating: 3.5 },
    { name: 'Coffee Maker', price: 80, category: 'appliances', inStock: true, tags: ['kitchen', 'electric'], description: 'Makes great coffee', rating: 4.7 },
    { name: 'Blender', price: 60, category: 'appliances', inStock: true, tags: ['kitchen', 'electric'], description: 'Powerful blender', rating: 4.1 },
    { name: 'Toaster', price: 40, category: 'appliances', inStock: false, tags: ['kitchen', 'electric'], description: null, rating: 3.9 }
  ])
}

/**
 * Create test cocktails and ingredients
 */
export async function createTestCocktails() {
  const cocktails = await Cocktail.createMany([
    {
      name: 'Mojito',
      description: 'A refreshing Cuban highball',
      instructions: 'Muddle mint leaves with sugar and lime juice. Add rum and top with soda water.',
      glassType: 'Highball',
      imageUrl: 'https://example.com/mojito.jpg'
    },
    {
      name: 'Margarita',
      description: 'A classic tequila-based cocktail',
      instructions: 'Shake tequila, lime juice, and triple sec with ice. Strain into a salt-rimmed glass.',
      glassType: 'Margarita',
      imageUrl: 'https://example.com/margarita.jpg'
    },
    {
      name: 'Old Fashioned',
      description: 'A sophisticated whiskey cocktail',
      instructions: 'Muddle sugar with bitters, add whiskey and ice, garnish with orange peel.',
      glassType: 'Rocks',
      imageUrl: 'https://example.com/oldfashioned.jpg'
    }
  ])

  // Create ingredients for each cocktail
  for (const cocktail of cocktails) {
    if (cocktail.name === 'Mojito') {
      await Ingredient.createMany([
        { name: 'White Rum', quantity: '2', unit: 'oz', cocktailId: cocktail._id },
        { name: 'Fresh Lime Juice', quantity: '1', unit: 'oz', cocktailId: cocktail._id },
        { name: 'Mint Leaves', quantity: '8-10', unit: 'leaves', cocktailId: cocktail._id },
        { name: 'Sugar', quantity: '2', unit: 'tsp', cocktailId: cocktail._id },
        { name: 'Soda Water', quantity: 'to top', unit: '', cocktailId: cocktail._id }
      ])
    } else if (cocktail.name === 'Margarita') {
      await Ingredient.createMany([
        { name: 'Tequila', quantity: '2', unit: 'oz', cocktailId: cocktail._id },
        { name: 'Triple Sec', quantity: '1', unit: 'oz', cocktailId: cocktail._id },
        { name: 'Fresh Lime Juice', quantity: '1', unit: 'oz', cocktailId: cocktail._id },
        { name: 'Salt', quantity: 'for rim', unit: '', cocktailId: cocktail._id }
      ])
    } else if (cocktail.name === 'Old Fashioned') {
      await Ingredient.createMany([
        { name: 'Bourbon or Rye Whiskey', quantity: '2', unit: 'oz', cocktailId: cocktail._id },
        { name: 'Sugar Cube', quantity: '1', unit: '', cocktailId: cocktail._id },
        { name: 'Angostura Bitters', quantity: '2-3', unit: 'dashes', cocktailId: cocktail._id },
        { name: 'Orange Peel', quantity: '1', unit: 'twist', cocktailId: cocktail._id }
      ])
    }
  }

  return cocktails
}

/**
 * Create test tags
 */
export async function createTestTags() {
  return await Tag.createMany([
    { name: 'Technology', slug: 'technology' },
    { name: 'Health', slug: 'health' },
    { name: 'Business', slug: 'business' },
    { name: 'Lifestyle', slug: 'lifestyle' },
    { name: 'Science', slug: 'science' }
  ])
}

/**
 * Create test post-tag relationships
 */
export async function createTestPostTags(posts: any[], tags: any[]) {
  const now = new Date()

  // Create relationships between posts and tags
  const postTags = [
    // Post 1 has Technology and Science tags
    { post_id: posts[0]._id, tag_id: tags[0]._id, createdAt: now },
    { post_id: posts[0]._id, tag_id: tags[4]._id, createdAt: now },

    // Post 2 has Health tag
    { post_id: posts[1]._id, tag_id: tags[1]._id, createdAt: now },

    // Post 3 has Business and Technology tags
    { post_id: posts[2]._id, tag_id: tags[2]._id, createdAt: now },
    { post_id: posts[2]._id, tag_id: tags[0]._id, createdAt: now },

    // Post 4 has Science tag
    { post_id: posts[3]._id, tag_id: tags[4]._id, createdAt: now },

    // Post 5 has Lifestyle and Health tags
    { post_id: posts[4]._id, tag_id: tags[3]._id, createdAt: now },
    { post_id: posts[4]._id, tag_id: tags[1]._id, createdAt: now }
  ]

  return await PostTag.createMany(postTags)
}

/**
 * Create all test data
 */
export async function createAllTestData() {
  // Boot all models
  bootModels()

  // Create test data
  const users = await createTestUsers()
  const categories = await createTestCategories()
  const posts = await createTestPosts(users, categories)
  const profiles = await createTestProfiles(users)
  const comments = await createTestComments(posts, users)
  const products = await createTestProducts()
  const cocktails = await createTestCocktails()
  const tags = await createTestTags()
  const postTags = await createTestPostTags(posts, tags)

  return {
    users,
    categories,
    posts,
    profiles,
    comments,
    products,
    cocktails,
    tags,
    postTags
  }
}