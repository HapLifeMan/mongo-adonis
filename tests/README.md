# MongoDB Lucid ORM Tests

This directory contains tests for the MongoDB Lucid ORM. The tests are organized into different directories based on the functionality being tested.

## Test Structure

- `connection/`: Tests for MongoDB connection functionality
- `model/`: Tests for model operations and relationships
- `querybuilder/`: Tests for query builder methods and MongoDB-specific features

## Shared Test Fixtures

To improve test maintainability and reduce duplication, we've implemented shared test fixtures in `fixtures.ts`. These fixtures provide:

1. Common model definitions
2. Shared test data creation functions
3. Utility functions for test setup

### Using the Fixtures

To use the shared fixtures in your tests:

```typescript
import {
  User,
  Post,
  Profile,
  Comment,
  Category,
  Product,
  bootModels,
  createAllTestData,
  // Or specific data creation functions:
  createTestUsers,
  createTestPosts,
  createTestCategories,
  createTestProfiles,
  createTestComments,
  createTestProducts
} from '../fixtures.js'

test.group('Your Test Group', (group) => {
  let db: any
  let testData: any

  group.setup(async () => {
    const setup = await setupTest()
    db = setup.db

    // Boot all models
    bootModels()

    // Create all test data
    testData = await createAllTestData()

    // Or create specific test data
    // const users = await createTestUsers()
    // const categories = await createTestCategories()
    // const posts = await createTestPosts(users, categories)
  })

  group.teardown(async () => {
    await teardownTest(db)
  })

  // Your tests...
})
```

### Available Models

The fixtures provide the following models:

- `User`: Basic user model with relationships to posts and profile
- `Post`: Blog post model with relationships to user, category, and comments
- `Profile`: User profile model with relationship to user
- `Comment`: Comment model with relationships to post and user
- `Category`: Category model with relationship to posts
- `Product`: Product model for testing product-related queries

### Test Data

The `createAllTestData()` function creates a comprehensive set of test data with proper relationships between models. It returns an object with the following properties:

```typescript
{
  users: User[],      // 5 test users
  categories: Category[], // 5 test categories
  posts: Post[],      // 6 test posts
  profiles: Profile[], // 5 test profiles
  comments: Comment[], // 8 test comments
  products: Product[]  // 9 test products
}
```

## Running Tests

To run all tests:

```bash
yarn test
```

To run a specific test file:

```bash
yarn test tests/path/to/test.spec.ts
```

## Test Helpers

The `helpers.ts` file provides utility functions for setting up and tearing down the test environment:

- `setupTest()`: Sets up the test environment and returns database objects
- `teardownTest(db)`: Cleans up the database and closes connections
- `createTestDatabase()`: Creates a test database instance
- `createTestAdapter(db)`: Creates a test adapter
- `createTestSchema(db)`: Creates a test schema