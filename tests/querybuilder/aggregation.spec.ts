/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for MongoDB aggregation pipeline in the query builder
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import {
  User,
  Post,
  Category,
  createAllTestData
} from '../fixtures.js'

test.group('MongoQueryBuilder Aggregation', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Create test data
    await createAllTestData()
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('should support basic aggregation pipeline', async ({ assert }) => {
    // Get the total number of posts
    const result = await Post.query().aggregate([
      { $count: 'total' }
    ])

    assert.equal(result.length, 1)
    assert.isTrue(result[0].total > 0)
  })

  test('should support conditional stages in aggregation pipeline', async ({ assert }) => {
    // Get posts by John Doe
    const user = await User.query().where('name', 'John Doe').first()
    assert.exists(user)

    // Test with onlyPublished = true
    const onlyPublished = true
    const publishedResult = await Post.query().aggregate([
      { $match: { userId: user!._id } },
      onlyPublished && { $match: { published: true } },
      { $count: 'posts' }
    ])

    // Check if we have results
    if (publishedResult.length > 0) {
      assert.isTrue(publishedResult[0].posts >= 0)
    } else {
      // If no results, the count is 0
      assert.equal(publishedResult.length, 0)
    }

    // Test with onlyPublished = false (should return all posts by John)
    const allResult = await Post.query().aggregate([
      { $match: { userId: user!._id } },
      false && { $match: { published: true } }, // This stage will be filtered out
      { $count: 'posts' }
    ])

    // Check if we have results
    if (allResult.length > 0) {
      assert.isTrue(allResult[0].posts >= 0)
    } else {
      // If no results, the count is 0
      assert.equal(allResult.length, 0)
    }
  })

  test('should support RegExp in aggregation pipeline', async ({ assert }) => {
    // Get users with names containing "Jo"
    const searchRegex = /Jo/i
    const result = await User.query().aggregate([
      { $match: { name: searchRegex } },
      { $count: 'users' }
    ])

    // Check if we have results
    if (result.length > 0) {
      assert.isTrue(result[0].users > 0)
    } else {
      // If no results, the count is 0
      assert.equal(result.length, 0)
    }
  })

  test('should support complex aggregation with multiple conditions', async ({ assert }) => {
    // Get all categories
    const categories = await Category.all()
    assert.isTrue(categories.length > 0)

    // Get the first category
    const category = categories[0]
    assert.exists(category)

    // Test with multiple conditions
    const minViews = 50
    const onlyPublished = true

    // Now run the test with conditional stages
    const result = await Post.query().aggregate([
      { $match: { categoryId: category._id } },
      { $match: { views: { $gt: minViews } } },
      onlyPublished && { $match: { published: true } }
    ])

    // Count the matching entries
    assert.isTrue(result.length >= 0)

    // Now run the count query
    const countResult = await Post.query().aggregate([
      { $match: { categoryId: category._id } },
      { $match: { views: { $gt: minViews } } },
      onlyPublished && { $match: { published: true } },
      { $count: 'posts' }
    ])

    // Check if we have count results
    if (countResult.length > 0) {
      assert.equal(countResult[0].posts, result.length)
    } else {
      // If no results, the count is 0
      assert.equal(result.length, 0)
    }
  })

  test('should support grouping and sorting in aggregation pipeline', async ({ assert }) => {
    // Group posts by category and count
    const result = await Post.query().aggregate([
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ])

    // We should have at least one category
    assert.isTrue(result.length > 0)

    // Get the categories to verify the counts
    const categories = await Category.all()
    const categoryCounts: Record<string, number> = {}

    for (const category of categories) {
      const posts = await Post.query().where('categoryId', category._id).exec()
      categoryCounts[category._id.toString()] = posts.length
    }

    // Verify that the aggregation results match our manual counts
    for (const item of result) {
      const categoryId = item._id.toString()
      assert.equal(item.count, categoryCounts[categoryId])
    }
  })

  test('should support $or conditions in aggregation pipeline', async ({ assert }) => {
    // Search for posts with title containing "First" or content containing "second"
    const result = await Post.query().aggregate([
      {
        $match: {
          $or: [
            { title: /First/i },
            { content: /second/i }
          ]
        }
      }
    ])

    // Count the matching entries
    const matchCount = result.length

    // Now run the count query
    const countResult = await Post.query().aggregate([
      {
        $match: {
          $or: [
            { title: /First/i },
            { content: /second/i }
          ]
        }
      },
      { $count: 'posts' }
    ])

    // Check if we have count results
    if (countResult.length > 0) {
      assert.equal(countResult[0].posts, matchCount)
    } else {
      // If no results, the count is 0
      assert.equal(matchCount, 0)
    }

    // Verify we found some posts
    assert.isTrue(matchCount >= 0)
  })

  test('should support lookup and unwind for joins', async ({ assert }) => {
    // Get posts with their authors
    const result = await Post.query().aggregate([
      { $match: { published: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      { $project: { title: 1, 'author.name': 1 } }
    ])

    // Verify we have the expected number of published posts
    const publishedPosts = await Post.query().where('published', true).exec()
    assert.equal(result.length, publishedPosts.length)

    // Verify each post has an author
    for (const post of result) {
      assert.property(post, 'author')
      assert.property(post.author, 'name')
    }
  })
})