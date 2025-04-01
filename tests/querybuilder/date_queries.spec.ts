/*
 * mongo-adonis
 *
 * (c) Thomas Reichling
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Tests for date queries with comparison operators
 */

import { test } from '@japa/runner'
import { setupTest, teardownTest } from '../helpers.js'
import { Post } from '../fixtures.js'
import { ObjectId } from 'mongodb'

test.group('Date Queries with Comparison Operators', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Clean up any existing test posts
    await Post.truncate()

    // Create test posts with different dates
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    const twoDaysAgo = new Date(now)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    // Create posts with different dates and platforms
    await Post.createMany([
      {
        title: 'Today Post',
        content: 'Posted today',
        published: true,
        views: 10,
        platform: 'mobile',
        userId: new ObjectId(),
        categoryId: new ObjectId(),
        createdAt: now
      },
      {
        title: 'Yesterday Post',
        content: 'Posted yesterday',
        published: true,
        views: 20,
        platform: 'mobile',
        userId: new ObjectId(),
        categoryId: new ObjectId(),
        createdAt: yesterday
      },
      {
        title: 'Two Days Ago Post',
        content: 'Posted two days ago',
        published: true,
        views: 30,
        platform: 'web',
        userId: new ObjectId(),
        categoryId: new ObjectId(),
        createdAt: twoDaysAgo
      },
      {
        title: 'One Week Ago Post',
        content: 'Posted one week ago',
        published: true,
        views: 100,
        platform: 'web',
        userId: new ObjectId(),
        categoryId: new ObjectId(),
        createdAt: oneWeekAgo
      },
      {
        title: 'One Month Ago Post',
        content: 'Posted one month ago',
        published: true,
        views: 500,
        platform: 'desktop',
        userId: new ObjectId(),
        categoryId: new ObjectId(),
        createdAt: oneMonthAgo
      }
    ])
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  test('can filter posts with greater than or equal date comparison', async ({ assert }) => {
    // Set cutoff date to 3 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 3)

    // Create query with the proposed pattern
    const query = Post.query()
    query.where('createdAt', '>=', cutoffDate)
    const posts = await query.exec()

    // Should return posts from today, yesterday, and two days ago (3 posts)
    assert.equal(posts.length, 3)
    assert.isTrue(posts.every(post => post.createdAt >= cutoffDate))
  })

  test('can filter posts with less than date comparison', async ({ assert }) => {
    // Set cutoff date to 3 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 3)

    const posts = await Post.query()
      .where('createdAt', '<', cutoffDate)
      .exec()

    // Should return posts from one week ago and one month ago (2 posts)
    assert.equal(posts.length, 2)
    assert.isTrue(posts.every(post => post.createdAt < cutoffDate))
  })

  test('can filter posts with multiple conditions including dates', async ({ assert }) => {
    // Set cutoff date to 3 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 3)

    const platform = 'web'

    // Create query using the pattern from the question
    const query = Post.query()
    query.where('platform', platform)
    query.where('createdAt', '>=', cutoffDate)
    const posts = await query.limit(5).exec()

    // Should only return the post from two days ago (1 post)
    // That's the only post that is both from the web platform and newer than cutoffDate
    assert.equal(posts.length, 1)
    assert.equal(posts[0].title, 'Two Days Ago Post')
    assert.isTrue(posts.every(post => post.platform === platform && post.createdAt >= cutoffDate))
  })

  test('can use date objects directly in queries without ISO string conversion', async ({ assert }) => {
    // Set cutoff date to 3 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 3)

    const posts = await Post.query()
      .where('createdAt', '>=', cutoffDate)
      .exec()

    assert.equal(posts.length, 3)
    assert.isTrue(posts.every(post => post.createdAt >= cutoffDate))
  })

  test('can chain where methods with different conditions', async ({ assert }) => {
    // Set cutoff date to 3 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 10)

    // This should return all posts except the one month ago post
    const posts = await Post.query()
      .where('createdAt', '>=', cutoffDate)
      .where('views', '>', 15)
      .exec()

    assert.equal(posts.length, 3)
    assert.isTrue(posts.every(post =>
      post.createdAt >= cutoffDate &&
      post.views > 15
    ))
  })

  test('can use ISO string dates by converting them to Date objects', async ({ assert }) => {
    // Set cutoff date to 3 days ago
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 3)

    // Convert date to ISO string (simulating a luxon toISO() call)
    const isoDateString = cutoffDate.toISOString()

    // Create mock luxon-like object with toISO method
    const mockLuxonDate = {
      toISO: () => isoDateString
    }

    // Create query using the pattern from the question
    // but convert the ISO string back to a Date object
    const query = Post.query()
    query.where('platform', 'web')
    query.where('createdAt', '>=', new Date(mockLuxonDate.toISO()))
    const posts = await query.limit(5).exec()

    // Should only return the post from two days ago
    assert.equal(posts.length, 1)
    assert.equal(posts[0].title, 'Two Days Ago Post')
  })
})