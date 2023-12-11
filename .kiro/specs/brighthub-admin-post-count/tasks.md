# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Admin Hub Wrong Collection & Missing getStats
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases:
    - `AdminHubController.handleListPosts` queries collection named `'brighthub_posts'`
    - `AdminHubController.handleDeletePost` queries collection named `'brighthub_posts'`
    - `PostService` instance has a callable `getStats()` method returning `{ totalPosts, activeUsersLast30Days }`
  - Write a property-based test in `brightchain-api-lib` that:
    - Mocks `BrightDb` and verifies `handleListPosts` calls `brightDb.collection('brighthub_posts')` (not `'posts'`)
    - Mocks `BrightDb` and verifies `handleDeletePost` calls `brightDb.collection('brighthub_posts')` (not `'posts'`)
    - Asserts `PostService` has a `getStats` method that returns `{ totalPosts: number, activeUsersLast30Days: number }`
  - Run test on UNFIXED code via `yarn nx test brightchain-api-lib --testPathPatterns=adminHub`
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - `AdminHubController` calls `brightDb.collection('posts')` instead of `brightDb.collection('brighthub_posts')`
    - `PostService` has no `getStats` method
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Public Post Operations & Other Stats Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Observe: `PostService.createPost(authorId, content)` creates a post in `brighthub_posts` collection
    - Observe: `PostService.likePost(postId, userId)` increments like count correctly
    - Observe: `PostService.deletePost(postId, userId)` soft-deletes the post
    - Observe: `PostService.editPost(postId, userId, newContent)` updates content within edit window
    - Observe: Dashboard `gatherChatStats()`, `gatherPassStats()`, `gatherMailStats()` return their respective stats unchanged
  - Write property-based tests capturing observed behavior patterns:
    - For all valid post creation inputs, `PostService.createPost` stores to `brighthub_posts` and returns a valid post object
    - For all valid like/unlike operations, counts are correctly incremented/decremented
    - For all valid edit operations within the edit window, content is updated and `isEdited` is set to true
    - For all other dashboard stat calls (chat, pass, mail), results are unaffected by any changes to `PostService`
  - Run tests on UNFIXED code via `yarn nx test brightchain-api-lib --testPathPatterns=postService`
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for admin hub zero post count and missing dashboard stats

  - [x] 3.1 Fix collection name in AdminHubController
    - In `brightchain-api-lib/src/lib/controllers/api/adminHub.ts`:
    - Change `brightDb.collection('posts')` to `brightDb.collection('brighthub_posts')` in `handleListPosts` (around line 97)
    - Change `brightDb.collection('posts')` to `brightDb.collection('brighthub_posts')` in `handleDeletePost` (around line 148)
    - _Bug_Condition: isBugCondition_Collection(request) where request.endpoint IN {'/api/admin/hub/posts', '/api/admin/hub/posts/:postId'}_
    - _Expected_Behavior: collectionUsed = 'brighthub_posts' for all admin hub post operations_
    - _Preservation: Public PostService operations continue using postsCollection (already 'brighthub_posts')_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.2 Add getStats() method to PostService
    - In `brightchain-api-lib/src/lib/services/brighthub/postService.ts`:
    - Add a `getStats()` method to the `PostService` class that:
      - Queries `postsCollection` for `totalPosts`: count of posts where `isDeleted` is false
      - Queries `postsCollection` for `activeUsersLast30Days`: count of distinct `authorId` values where `createdAt` is within the last 30 days and `isDeleted` is false
      - Returns `{ totalPosts: number, activeUsersLast30Days: number }`
      - Wraps in try/catch and returns `{ totalPosts: 0, activeUsersLast30Days: 0 }` on failure
    - _Bug_Condition: isBugCondition_GetStats(call) where call.target = 'postService' AND call.method = 'getStats'_
    - _Expected_Behavior: method_exists(PostService, 'getStats') AND result.totalPosts >= 0 AND result.activeUsersLast30Days >= 0_
    - _Preservation: All existing PostService methods (createPost, editPost, deletePost, likePost, unlikePost, repostPost, createQuotePost) remain unchanged_
    - _Requirements: 2.4_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Admin Hub Queries Correct Collection & getStats Returns Real Counts
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1 via `yarn nx test brightchain-api-lib --testPathPatterns=adminHub`
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Public Post Operations & Other Stats Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2 via `yarn nx test brightchain-api-lib --testPathPatterns=postService`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `yarn nx test brightchain-api-lib`
  - Ensure all tests pass, ask the user if questions arise.
