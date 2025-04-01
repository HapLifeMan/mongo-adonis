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
import { Post, Tag, PostTag, User, Category, bootModels } from '../fixtures.js'

test.group('Many-To-Many Relationships', (group) => {
  let db: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Boot models
    bootModels()
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  group.each.setup(async () => {
    // Clean the collections before each test
    await db.connection().collection('users').deleteMany({})
    await db.connection().collection('posts').deleteMany({})
    await db.connection().collection('categories').deleteMany({})
    await db.connection().collection('tags').deleteMany({})
    await db.connection().collection('post_tags').deleteMany({})
  })

  test('can retrieve related models through many-to-many relationship', async ({ assert }) => {
    // Create a user and category
    const user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      active: true
    })

    const category = await Category.create({
      name: 'Technology',
      slug: 'technology'
    })

    // Create a post
    const post = await Post.create({
      title: 'Introduction to MongoDB',
      content: 'MongoDB is a NoSQL database...',
      published: true,
      views: 100,
      userId: user._id,
      categoryId: category._id,
      createdAt: new Date()
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

    // Create relationships
    await PostTag.createMany([
      { post_id: post._id, tag_id: tag1._id, createdAt: new Date() },
      { post_id: post._id, tag_id: tag2._id, createdAt: new Date() }
    ])

    // Test retrieving tags from post
    const postTags = await post.tags.exec()
    assert.lengthOf(postTags, 2)
    assert.isTrue(postTags.some((tag: Tag) => tag.name === 'MongoDB'))
    assert.isTrue(postTags.some((tag: Tag) => tag.name === 'NoSQL'))

    // Test retrieving posts from tag
    const mongoDbPosts = await tag1.posts.exec()
    assert.lengthOf(mongoDbPosts, 1)
    assert.equal(mongoDbPosts[0].title, 'Introduction to MongoDB')
  })

  test('can attach and detach related models', async ({ assert }) => {
    // Create a post
    const post = await Post.create({
      title: 'Working with Relationships',
      content: 'This post covers relationships in MongoDB...',
      published: true,
      views: 50,
      createdAt: new Date()
    })

    // Create tags
    const tag1 = await Tag.create({
      name: 'Relationships',
      slug: 'relationships'
    })

    const tag2 = await Tag.create({
      name: 'MongoDB',
      slug: 'mongodb'
    })

    const tag3 = await Tag.create({
      name: 'ORM',
      slug: 'orm'
    })

    // Attach tags to post
    await post.tags.attach([tag1._id, tag2._id])

    // Verify attachments
    let postTags = await post.tags.exec()
    assert.lengthOf(postTags, 2)
    assert.isTrue(postTags.some((tag: Tag) => tag.name === 'Relationships'))
    assert.isTrue(postTags.some((tag: Tag) => tag.name === 'MongoDB'))

    // Test exists method
    const relationshipExists = await post.tags.exists(tag1._id)
    assert.isTrue(relationshipExists)

    const ormExists = await post.tags.exists(tag3._id)
    assert.isFalse(ormExists)

    // Detach a specific tag
    await post.tags.detach([tag1._id])

    // Verify after detach
    postTags = await post.tags.exec()
    assert.lengthOf(postTags, 1)
    assert.equal(postTags[0].name, 'MongoDB')

    // Sync tags (replaces all existing relationships)
    await post.tags.sync([tag3._id])

    // Verify after sync
    postTags = await post.tags.exec()
    assert.lengthOf(postTags, 1)
    assert.equal(postTags[0].name, 'ORM')
  })

  test('can use pivot data in many-to-many relationships', async ({ assert }) => {
    // Create a post
    const post = await Post.create({
      title: 'Advanced Relationships',
      content: 'This post covers advanced relationships in MongoDB...',
      published: true,
      views: 75,
      createdAt: new Date()
    })

    // Create tags
    const tag1 = await Tag.create({
      name: 'Advanced',
      slug: 'advanced'
    })

    const tag2 = await Tag.create({
      name: 'Intermediate',
      slug: 'intermediate'
    })

    // Attach tags with pivot data
    const now = new Date()
    await post.tags.attachWithPivotData([
      {
        id: tag1._id,
        pivotData: {
          createdAt: now,
          relevance: 'high',
          position: 1
        }
      },
      {
        id: tag2._id,
        pivotData: {
          createdAt: now,
          relevance: 'medium',
          position: 2
        }
      }
    ])

    // Get pivot data
    const pivotData = await post.tags.pivotData(tag1._id)
    assert.equal(pivotData?.relevance, 'high')
    assert.equal(pivotData?.position, 1)

    // Update pivot data
    await post.tags.updatePivotData(tag1._id, { relevance: 'very-high', featured: true })

    // Verify updated pivot data
    const updatedPivotData = await post.tags.pivotData(tag1._id)
    assert.equal(updatedPivotData?.relevance, 'very-high')
    assert.equal(updatedPivotData?.featured, true)
    assert.equal(updatedPivotData?.position, 1) // Original data preserved

    // Test sync with pivot data
    await post.tags.syncWithPivotData([
      {
        id: tag2._id,
        pivotData: {
          createdAt: now,
          relevance: 'critical',
          featured: true
        }
      }
    ])

    // Check after sync
    const tags = await post.tags.exec()
    assert.lengthOf(tags, 1)
    assert.equal(tags[0].name, 'Intermediate')

    const syncedPivotData = await post.tags.pivotData(tag2._id)
    assert.equal(syncedPivotData?.relevance, 'critical')
    assert.equal(syncedPivotData?.featured, true)
  })

  test('can perform parallel find operations with Promise.all', async ({ assert }) => {
    // Create some test data
    const user = await User.create({
      name: 'Parallel User',
      email: 'parallel@example.com',
      age: 32,
      active: true
    })

    const category = await Category.create({
      name: 'Parallel Category',
      slug: 'parallel-category'
    })

    // Create multiple posts
    const posts = await Post.createMany([
      {
        title: 'Parallel Post 1',
        content: 'Content for parallel post 1',
        published: true,
        views: 10,
        userId: user._id,
        categoryId: category._id,
        createdAt: new Date()
      },
      {
        title: 'Parallel Post 2',
        content: 'Content for parallel post 2',
        published: true,
        views: 20,
        userId: user._id,
        categoryId: category._id,
        createdAt: new Date()
      },
      {
        title: 'Parallel Post 3',
        content: 'Content for parallel post 3',
        published: true,
        views: 30,
        userId: user._id,
        categoryId: category._id,
        createdAt: new Date()
      }
    ])

    // Create tags
    const tags = await Tag.createMany([
      { name: 'Parallel Tag 1', slug: 'parallel-tag-1' },
      { name: 'Parallel Tag 2', slug: 'parallel-tag-2' },
      { name: 'Parallel Tag 3', slug: 'parallel-tag-3' }
    ])

    // Create relationships between posts and tags
    await Promise.all([
      PostTag.create({ post_id: posts[0]._id, tag_id: tags[0]._id, createdAt: new Date() }),
      PostTag.create({ post_id: posts[0]._id, tag_id: tags[1]._id, createdAt: new Date() }),
      PostTag.create({ post_id: posts[1]._id, tag_id: tags[1]._id, createdAt: new Date() }),
      PostTag.create({ post_id: posts[2]._id, tag_id: tags[2]._id, createdAt: new Date() })
    ])

    // Execute parallel find operations
    const [post1Tags, post2Tags, post3Tags] = await Promise.all([
      posts[0].tags.exec(),
      posts[1].tags.exec(),
      posts[2].tags.exec()
    ])

    // Assertions
    assert.lengthOf(post1Tags, 2)
    assert.lengthOf(post2Tags, 1)
    assert.lengthOf(post3Tags, 1)

    assert.isTrue(post1Tags.some((tag: Tag) => tag.name === 'Parallel Tag 1'))
    assert.isTrue(post1Tags.some((tag: Tag) => tag.name === 'Parallel Tag 2'))
    assert.isTrue(post2Tags.some((tag: Tag) => tag.name === 'Parallel Tag 2'))
    assert.isTrue(post3Tags.some((tag: Tag) => tag.name === 'Parallel Tag 3'))

    // Execute parallel find operations from tags to posts
    const [tag1Posts, tag2Posts, tag3Posts] = await Promise.all([
      tags[0].posts.exec(),
      tags[1].posts.exec(),
      tags[2].posts.exec()
    ])

    assert.lengthOf(tag1Posts, 1)
    assert.lengthOf(tag2Posts, 2)
    assert.lengthOf(tag3Posts, 1)
  })

  test('can perform parallel create operations with Promise.all', async ({ assert }) => {
    // Create a user and category first
    const user = await User.create({
      name: 'Create Parallel User',
      email: 'create-parallel@example.com',
      age: 33,
      active: true
    })

    const category = await Category.create({
      name: 'Create Parallel Category',
      slug: 'create-parallel-category'
    })

    // Create posts and tags in parallel
    const [posts, tags] = await Promise.all([
      Post.createMany([
        {
          title: 'Create Parallel Post 1',
          content: 'Content for create parallel post 1',
          published: true,
          views: 15,
          userId: user._id,
          categoryId: category._id,
          createdAt: new Date()
        },
        {
          title: 'Create Parallel Post 2',
          content: 'Content for create parallel post 2',
          published: true,
          views: 25,
          userId: user._id,
          categoryId: category._id,
          createdAt: new Date()
        }
      ]),
      Tag.createMany([
        { name: 'Create Parallel Tag 1', slug: 'create-parallel-tag-1' },
        { name: 'Create Parallel Tag 2', slug: 'create-parallel-tag-2' }
      ])
    ])

    // Create relationships in parallel
    await Promise.all([
      PostTag.create({ post_id: posts[0]._id, tag_id: tags[0]._id, createdAt: new Date() }),
      PostTag.create({ post_id: posts[0]._id, tag_id: tags[1]._id, createdAt: new Date() }),
      PostTag.create({ post_id: posts[1]._id, tag_id: tags[0]._id, createdAt: new Date() })
    ])

    // Verify the relationships were created correctly
    const post1Tags = await posts[0].tags.exec()
    const post2Tags = await posts[1].tags.exec()

    assert.lengthOf(post1Tags, 2)
    assert.lengthOf(post2Tags, 1)

    assert.isTrue(post1Tags.some((tag: Tag) => tag.name === 'Create Parallel Tag 1'))
    assert.isTrue(post1Tags.some((tag: Tag) => tag.name === 'Create Parallel Tag 2'))
    assert.isTrue(post2Tags.some((tag: Tag) => tag.name === 'Create Parallel Tag 1'))
  })

  test('can perform parallel attach/detach operations with Promise.all', async ({ assert }) => {
    // Create posts and tags
    const post1 = await Post.create({
      title: 'Attach Parallel Post 1',
      content: 'Content for attach parallel post 1',
      published: true,
      views: 35,
      createdAt: new Date()
    })

    const post2 = await Post.create({
      title: 'Attach Parallel Post 2',
      content: 'Content for attach parallel post 2',
      published: true,
      views: 45,
      createdAt: new Date()
    })

    const tags = await Tag.createMany([
      { name: 'Attach Tag 1', slug: 'attach-tag-1' },
      { name: 'Attach Tag 2', slug: 'attach-tag-2' },
      { name: 'Attach Tag 3', slug: 'attach-tag-3' },
      { name: 'Attach Tag 4', slug: 'attach-tag-4' }
    ])

    // Perform parallel attach operations
    await Promise.all([
      post1.tags.attach([tags[0]._id, tags[1]._id]),
      post2.tags.attach([tags[2]._id, tags[3]._id])
    ])

    // Verify attachments
    const [post1Tags, post2Tags] = await Promise.all([
      post1.tags.exec(),
      post2.tags.exec()
    ])

    assert.lengthOf(post1Tags, 2)
    assert.lengthOf(post2Tags, 2)

    // Perform parallel exists checks
    const [tag1Exists, tag2Exists, tag3Exists, tag4Exists] = await Promise.all([
      post1.tags.exists(tags[0]._id),
      post1.tags.exists(tags[1]._id),
      post2.tags.exists(tags[2]._id),
      post2.tags.exists(tags[3]._id)
    ])

    assert.isTrue(tag1Exists)
    assert.isTrue(tag2Exists)
    assert.isTrue(tag3Exists)
    assert.isTrue(tag4Exists)

    // Perform parallel detach operations
    await Promise.all([
      post1.tags.detach([tags[0]._id]),
      post2.tags.detach([tags[2]._id])
    ])

    // Verify detachments
    const [post1TagsAfter, post2TagsAfter] = await Promise.all([
      post1.tags.exec(),
      post2.tags.exec()
    ])

    assert.lengthOf(post1TagsAfter, 1)
    assert.lengthOf(post2TagsAfter, 1)
    assert.equal(post1TagsAfter[0].name, 'Attach Tag 2')
    assert.equal(post2TagsAfter[0].name, 'Attach Tag 4')
  })

  test('can perform parallel pivot data operations with Promise.all', async ({ assert }) => {
    // Create a post and tags
    const post = await Post.create({
      title: 'Pivot Parallel Post',
      content: 'Content for pivot parallel post',
      published: true,
      views: 55,
      createdAt: new Date()
    })

    const tags = await Tag.createMany([
      { name: 'Pivot Tag 1', slug: 'pivot-tag-1' },
      { name: 'Pivot Tag 2', slug: 'pivot-tag-2' }
    ])

    // Attach tags with pivot data
    await post.tags.attachWithPivotData([
      {
        id: tags[0]._id,
        pivotData: {
          createdAt: new Date(),
          importance: 'high',
          order: 1
        }
      },
      {
        id: tags[1]._id,
        pivotData: {
          createdAt: new Date(),
          importance: 'medium',
          order: 2
        }
      }
    ])

    // Perform parallel pivot data operations
    const [pivotData1, pivotData2] = await Promise.all([
      post.tags.pivotData(tags[0]._id),
      post.tags.pivotData(tags[1]._id)
    ])

    // Verify pivot data
    assert.equal(pivotData1?.importance, 'high')
    assert.equal(pivotData1?.order, 1)
    assert.equal(pivotData2?.importance, 'medium')
    assert.equal(pivotData2?.order, 2)

    // Perform parallel pivot data updates
    await Promise.all([
      post.tags.updatePivotData(tags[0]._id, { importance: 'critical', featured: true }),
      post.tags.updatePivotData(tags[1]._id, { importance: 'high', featured: false })
    ])

    // Verify updates
    const [updatedPivotData1, updatedPivotData2] = await Promise.all([
      post.tags.pivotData(tags[0]._id),
      post.tags.pivotData(tags[1]._id)
    ])

    assert.equal(updatedPivotData1?.importance, 'critical')
    assert.equal(updatedPivotData1?.featured, true)
    assert.equal(updatedPivotData1?.order, 1) // Original data preserved
    assert.equal(updatedPivotData2?.importance, 'high')
    assert.equal(updatedPivotData2?.featured, false)
    assert.equal(updatedPivotData2?.order, 2) // Original data preserved
  })

  test('can use findOrCreate with many-to-many relationships', async ({ assert }) => {
    // Create a post
    const post = await Post.create({
      title: 'FindOrCreate Post',
      content: 'Content for findOrCreate post',
      published: true,
      views: 65,
      createdAt: new Date()
    })

    // Use findOrCreate to either find existing tags or create new ones
    const [tag1, tag2, tag3] = await Promise.all([
      // This should create a new tag
      Tag.updateOrCreate(
        { slug: 'find-or-create-1' },
        { name: 'FindOrCreate Tag 1', slug: 'find-or-create-1' }
      ),
      // Create another new tag
      Tag.updateOrCreate(
        { slug: 'find-or-create-2' },
        { name: 'FindOrCreate Tag 2', slug: 'find-or-create-2' }
      ),
      // Create a tag first, then find it
      Tag.create({ name: 'Existing Tag', slug: 'existing-tag' }).then(() => {
        return Tag.updateOrCreate(
          { slug: 'existing-tag' },
          { name: 'Updated Existing Tag', slug: 'existing-tag' }
        )
      })
    ])

    // Attach the tags to the post
    await post.tags.attach([tag1._id, tag2._id, tag3._id])

    // Verify the tags are attached
    const postTags = await post.tags.exec()
    assert.lengthOf(postTags, 3)

    // Verify the tags have the correct names
    assert.isTrue(postTags.some((tag: Tag) => tag.name === 'FindOrCreate Tag 1'))
    assert.isTrue(postTags.some((tag: Tag) => tag.name === 'FindOrCreate Tag 2'))

    // The existing tag should be updated with the new name
    assert.isTrue(postTags.some((tag: Tag) => tag.name === 'Updated Existing Tag'))
    assert.isFalse(postTags.some((tag: Tag) => tag.name === 'Existing Tag'))
  })
})