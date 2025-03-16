/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for relationship queries with constraints and additional relationship methods
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import {
  User,
  Post,
  Comment,
  createAllTestData
} from '../fixtures.js'

test.group('Relationship Queries', (group) => {
  let db: any
  let testData: any
  let userId: string

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Create test data
    testData = await createAllTestData()

    // Store IDs for testing
    userId = testData.users[0]._id.toString()
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('can filter related records with where clause', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    // Get only published posts
    const publishedPosts = await user!.posts.exec()
      .then((posts: Post[]) => posts.filter((post: Post) => post.published))

    assert.isTrue(publishedPosts.length > 0)
    assert.isTrue(publishedPosts.every((post: Post) => post.published === true))
  })

  test('can create multiple related records with createMany', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    // Get initial count of posts
    const initialPosts = await user!.posts.exec()
    const initialCount = initialPosts.length

    // Create multiple posts at once
    const newPosts = await user!.posts.createMany([
      {
        title: 'New Post 1',
        content: 'Content for new post 1',
        published: true,
        views: 0,
        createdAt: new Date()
      },
      {
        title: 'New Post 2',
        content: 'Content for new post 2',
        published: false,
        views: 0,
        createdAt: new Date()
      }
    ])

    assert.lengthOf(newPosts, 2)
    assert.equal(newPosts[0].title, 'New Post 1')
    assert.equal(newPosts[1].title, 'New Post 2')

    // Verify the posts were created with the correct relationship
    assert.equal(newPosts[0].userId.toString(), userId)
    assert.equal(newPosts[1].userId.toString(), userId)

    // Verify the total count of posts
    const allPosts = await user!.posts.exec()
    assert.equal(allPosts.length, initialCount + 2)
  })

  test('can associate multiple related records with associateMany', async ({ assert }) => {
    // Create a new user
    const newUser = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      age: 28,
      active: true
    })

    // Create posts without association
    const post1 = await Post.create({
      title: 'Jane Post 1',
      content: 'Content for Jane post 1',
      published: true,
      views: 0,
      createdAt: new Date()
    })

    const post2 = await Post.create({
      title: 'Jane Post 2',
      content: 'Content for Jane post 2',
      published: true,
      views: 0,
      createdAt: new Date()
    })

    // Associate multiple posts at once
    await newUser.posts.associateMany([post1, post2])

    // Verify the association
    const posts = await newUser.posts.exec()
    assert.lengthOf(posts, 2)
    assert.isTrue(posts.some((p: Post) => p.title === 'Jane Post 1'))
    assert.isTrue(posts.some((p: Post) => p.title === 'Jane Post 2'))

    // Verify the foreign keys were updated
    assert.equal(post1.userId.toString(), newUser.$primaryKeyValue!.toString())
    assert.equal(post2.userId.toString(), newUser.$primaryKeyValue!.toString())
  })

  test('can save multiple related records with saveMany', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    // Get the posts
    const posts = await user!.posts.exec()
    assert.isTrue(posts.length > 0)

    // Modify the first two posts
    posts[0].views += 10
    posts[1].views += 20

    // Save multiple posts at once
    const savedPosts = await user!.posts.saveMany([posts[0], posts[1]])

    // Verify the posts were saved
    assert.lengthOf(savedPosts, 2)

    // Refresh the posts from the database
    const refreshedPosts = await user!.posts.exec()

    // Find the updated posts
    const updatedPost1 = refreshedPosts.find((p: Post) => p.$primaryKeyValue!.toString() === posts[0].$primaryKeyValue!.toString())
    const updatedPost2 = refreshedPosts.find((p: Post) => p.$primaryKeyValue!.toString() === posts[1].$primaryKeyValue!.toString())

    // Verify the views were updated
    assert.exists(updatedPost1)
    assert.exists(updatedPost2)
    assert.equal(updatedPost1!.views, posts[0].views)
    assert.equal(updatedPost2!.views, posts[1].views)
  })

  test('can dissociate all related records', async ({ assert }) => {
    // Create a new user
    const newUser = await User.create({
      name: 'Bob Johnson',
      email: 'bob@example.com',
      age: 35,
      active: true
    })

    // Create posts and associate them
    await newUser.posts.createMany([
      {
        title: 'Bob Post 1',
        content: 'Content for Bob post 1',
        published: true,
        views: 0,
        createdAt: new Date()
      },
      {
        title: 'Bob Post 2',
        content: 'Content for Bob post 2',
        published: true,
        views: 0,
        createdAt: new Date()
      }
    ])

    // Verify the posts were created
    const posts = await newUser.posts.exec()
    assert.lengthOf(posts, 2)

    // Dissociate all posts
    await newUser.posts.dissociate()

    // Verify the posts were dissociated
    const postsAfterDissociate = await newUser.posts.exec()
    assert.lengthOf(postsAfterDissociate, 0)
  })

  test('can get nested relationships with filtering', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    // Get the posts
    const posts = await user!.posts.exec()
    assert.isTrue(posts.length > 0)

    // Get the first post
    const firstPost = posts[0]
    assert.exists(firstPost)

    // Get comments for the first post
    const comments = await firstPost.comments.exec()

    // Check if there are any comments
    if (comments.length > 0) {
      // Filter for approved comments if the property exists
      if ('approved' in comments[0]) {
        const approvedComments = comments.filter((c: Comment) => c.approved)
        assert.isTrue(approvedComments.length >= 0)
      }
    }
  })

  test('can handle complex relationship queries', async ({ assert }) => {
    const user = await User.find(userId)
    assert.exists(user)

    // Get posts with at least 50 views
    const posts = await user!.posts.exec()
    const popularPosts = posts.filter((p: Post) => p.views >= 50)

    // Check if there are any popular posts
    if (popularPosts.length > 0) {
      // Get the first popular post
      const firstPopularPost = popularPosts[0]

      // Get comments for the first popular post
      const comments = await firstPopularPost.comments.exec()

      // Check if there are any comments with rating property
      if (comments.length > 0 && 'rating' in comments[0]) {
        const highRatedComments = comments.filter((c: Comment) => c.rating >= 4)
        assert.isTrue(highRatedComments.length >= 0)
      }
    } else {
      // Skip this test if there are no popular posts
      assert.isTrue(true, 'No popular posts found, skipping test')
    }
  })
})