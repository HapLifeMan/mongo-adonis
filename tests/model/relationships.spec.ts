/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import {
  User,
  Post,
  Profile,
  Comment,
  Category,
} from '../fixtures.js'
import { ObjectId } from 'mongodb'

test.group('MongoModel Relationships', (group) => {
  let db: any
  let userId: ObjectId
  let postId: ObjectId

  group.setup(async () => {
    // Setup test environment
    const setup = await setupTest()
    db = setup.db

    // Create test users
    const users = await User.createMany([
      { name: 'John Doe', email: 'john@example.com', age: 30, active: true, role: 'admin' },
      { name: 'Jane Smith', email: 'jane@example.com', age: 25, active: true, role: 'user' }
    ])

    // Create test categories
    const categories = await Category.createMany([
      { name: 'Technology', slug: 'technology' },
      { name: 'Health', slug: 'health' }
    ])

    // Create test posts
    const now = new Date()
    const posts = await Post.createMany([
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
        createdAt: now
      }
    ])

    // Create test profiles
    await Profile.createMany([
      { bio: 'Software developer with 10 years of experience', location: 'New York', userId: users[0]._id },
      { bio: 'Health enthusiast and yoga instructor', location: 'Los Angeles', userId: users[1]._id }
    ])

    // Create test comments
    await Comment.createMany([
      { content: 'Great article!', postId: posts[0]._id, userId: users[1]._id, createdAt: now },
      { content: 'I learned a lot from this.', postId: posts[0]._id, userId: users[0]._id, createdAt: now }
    ])

    // Store IDs for testing
    userId = users[0]._id
    postId = posts[0]._id
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('can fetch one-to-one relationship using decorator', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    const profile = await user!.profile.exec()
    assert.exists(profile)
    assert.equal(profile!.bio, 'Software developer with 10 years of experience')
    assert.equal(profile!.location, 'New York')
  })

  test('can fetch one-to-many relationship using decorator', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    const posts = await user!.posts.exec()
    assert.isTrue(posts.length > 0)
    assert.isTrue(posts.every((post: Post) => post.userId.equals(userId)))
  })

  test('can fetch many-to-one relationship using decorator', async ({ assert }) => {
    const post = await Post.find(postId)
    assert.exists(post)

    const user = await post!.user.exec()
    assert.exists(user)
    assert.equal(user!.name, 'John Doe')
    assert.equal(user!.email, 'john@example.com')
  })

  test('can fetch nested relationships using decorators', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    const posts = await user!.posts.exec()
    assert.isTrue(posts.length > 0)

    const firstPost = posts[0]
    const comments = await firstPost.comments.exec()

    assert.exists(comments)
  })

  test('can create related records using relationship decorators', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    const initialPosts = await user!.posts.exec()
    const initialCount = initialPosts.length

    const newPost = await user!.posts.create({
      title: 'Advanced MongoDB Techniques',
      content: 'In this post, we will explore advanced MongoDB features...'
    })

    assert.exists(newPost)
    assert.equal(newPost.title, 'Advanced MongoDB Techniques')
    assert.equal(newPost.userId.equals(userId), true)

    const posts = await user!.posts.exec()
    assert.equal(posts.length, initialCount + 1)
  })

  test('can associate and dissociate related records', async ({ assert }) => {
    const newUser = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com'
    })

    const newPost = await Post.create({
      title: 'MongoDB for Beginners',
      content: 'Getting started with MongoDB...'
    })

    await newUser.posts.associate(newPost)

    const posts = await newUser.posts.exec()
    assert.lengthOf(posts, 1)
    assert.equal(posts[0].title, 'MongoDB for Beginners')

    await newUser.posts.dissociate(newPost)

    const postsAfterDissociate = await newUser.posts.exec()
    assert.lengthOf(postsAfterDissociate, 0)
  })

  test('can create related records with hasOne relationship', async ({ assert }) => {
    const newUser = await User.create({
      name: 'Bob Johnson',
      email: 'bob@example.com'
    })

    const profile = await newUser.profile.create({
      bio: 'Database expert',
      location: 'San Francisco'
    })

    assert.exists(profile)
    assert.equal(profile.bio, 'Database expert')
    assert.equal(profile.location, 'San Francisco')

    const fetchedProfile = await newUser.profile.exec()
    assert.exists(fetchedProfile)
    assert.equal(fetchedProfile!.bio, 'Database expert')
  })
})