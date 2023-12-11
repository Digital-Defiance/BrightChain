# BrightHub Admin Post Count Bugfix Design

## Overview

The admin dashboard and admin hub post list both report zero posts due to two independent bugs: (1) `AdminHubController` queries the wrong MongoDB collection name (`'posts'` instead of `'brighthub_posts'`), and (2) `PostService` is missing a `getStats()` method that the dashboard's `gatherHubStats()` expects. The fix corrects the collection name in the controller and adds the missing stats method to `PostService`.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — any admin request that touches posts via `AdminHubController` or any dashboard call to `postService.getStats()`
- **Property (P)**: The desired behavior — admin post list returns actual posts from `brighthub_posts`, and dashboard stats reflect real post counts
- **Preservation**: Existing public BrightHub post operations, other service stats, pagination, and filtering must remain unchanged
- **AdminHubController**: The controller in `brightchain-api-lib/src/lib/controllers/api/adminHub.ts` that handles admin post list and delete endpoints
- **PostService**: The service in `brightchain-api-lib/src/lib/services/brighthub/postService.ts` that manages post CRUD operations
- **gatherHubStats()**: The method in `DashboardController` (`brightchain-api-lib/src/lib/controllers/api/dashboard.ts`) that calls `postService.getStats()` to populate hub statistics

## Bug Details

### Bug Condition

The bug manifests in two independent scenarios:

1. When an admin requests the post list or deletes a post via `AdminHubController`, the controller queries `brightDb.collection('posts')` — a collection that doesn't contain BrightHub posts. The actual posts live in `'brighthub_posts'`.

2. When the dashboard calls `gatherHubStats()`, it attempts `postService.getStats()` which does not exist on `PostService`. The optional-chaining guard (`postService?.getStats`) evaluates to `undefined`, so the fallback `{ totalPosts: 0, activeUsersLast30Days: 0 }` is returned.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type AdminRequest | DashboardStatsCall
  OUTPUT: boolean

  IF input.type = 'AdminHubRequest' THEN
    RETURN input.endpoint IN {'/api/admin/hub/posts', '/api/admin/hub/posts/:postId'}
  ELSE IF input.type = 'DashboardStatsCall' THEN
    RETURN input.target = 'postService' AND input.method = 'getStats'
  END IF

  RETURN false
END FUNCTION
```

### Examples

- **Admin list posts**: `GET /api/admin/hub/posts` returns `{ posts: [], total: 0 }` even though 50 posts exist in `brighthub_posts`. Expected: returns the 50 posts with correct total.
- **Admin list with author filter**: `GET /api/admin/hub/posts?authorId=abc123` returns `{ posts: [], total: 0 }`. Expected: returns posts by that author from `brighthub_posts`.
- **Admin delete post**: `DELETE /api/admin/hub/posts/post-uuid` returns 404 "Post not found". Expected: soft-deletes the post in `brighthub_posts` and returns success.
- **Dashboard hub stats**: `GET /api/admin/dashboard` returns `hub: { totalPosts: 0, activeUsersLast30Days: 0 }`. Expected: returns actual counts from `brighthub_posts`.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Public BrightHub post creation, editing, deletion, likes, reposts, and quotes via `PostService` must continue to work exactly as before
- `FeedService`, `ThreadService`, `DiscoveryService`, and `ConnectionController` queries must continue to use `brighthub_posts` and return correct results
- Admin hub list pagination (`page`, `limit` parameters) must continue to be respected
- Admin hub list `isDeleted` filter must continue to work
- Dashboard statistics for other services (conversations, vaults/pass, mail) must remain unchanged
- Mouse/UI interactions with the admin dashboard must remain unchanged

**Scope:**
All inputs that do NOT involve the admin hub post endpoints or the dashboard hub stats call should be completely unaffected by this fix. This includes:
- Public post operations through `PostService`
- Other admin dashboard stat sections (chat, pass, mail, block store)
- Non-admin API endpoints

## Hypothesized Root Cause

Based on the bug description and code analysis, the confirmed root causes are:

1. **Wrong Collection Name in AdminHubController**: In `adminHub.ts`, both `handleListPosts` (line ~97) and `handleDeletePost` (line ~148) call `brightDb.collection('posts')`. The correct collection name is `'brighthub_posts'` — this is what `PostService` uses via `application.getModel<PostRecord>('brighthub_posts')`. The `'posts'` collection is empty or non-existent, so all queries return zero results and all updates match zero documents.

2. **Missing `getStats()` Method on PostService**: The `DashboardController.gatherHubStats()` method casts `postService` and checks `postService?.getStats`. Since `PostService` does not implement a `getStats()` method, the optional-chaining check fails silently and the fallback zeros are returned. Other services like `conversationService` and `passService` have their own `getStats()` methods, but `PostService` was never given one.

## Correctness Properties

Property 1: Bug Condition - Admin Hub Queries Correct Collection

_For any_ admin hub request (list posts or delete post) where the bug condition holds, the fixed `AdminHubController` SHALL query the `'brighthub_posts'` collection, returning actual post data and correct totals for list requests, and successfully soft-deleting posts for delete requests.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - Dashboard Stats Returns Real Counts

_For any_ dashboard stats call where `gatherHubStats()` is invoked, the fixed `PostService.getStats()` method SHALL return `{ totalPosts, activeUsersLast30Days }` with values derived from actual queries against the `'brighthub_posts'` collection.

**Validates: Requirements 2.4**

Property 3: Preservation - Public Post Operations Unchanged

_For any_ input that is NOT an admin hub request or dashboard stats call (i.e., public post creation, editing, deletion, likes, reposts, quotes), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing `PostService` functionality.

**Validates: Requirements 3.1, 3.2**

Property 4: Preservation - Other Dashboard Stats Unchanged

_For any_ dashboard stats call targeting services other than `postService` (conversations, vaults/pass, mail), the fixed code SHALL produce exactly the same results as the original code.

**Validates: Requirements 3.5**

## Fix Implementation

### Changes Required

**File**: `brightchain-api-lib/src/lib/controllers/api/adminHub.ts`

**Function**: `handleListPosts`

**Specific Changes**:
1. **Fix collection name**: Change `brightDb.collection('posts')` to `brightDb.collection('brighthub_posts')` in `handleListPosts` (around line 97)

**Function**: `handleDeletePost`

**Specific Changes**:
2. **Fix collection name**: Change `brightDb.collection('posts')` to `brightDb.collection('brighthub_posts')` in `handleDeletePost` (around line 148)

---

**File**: `brightchain-api-lib/src/lib/services/brighthub/postService.ts`

**Method to add**: `getStats()`

**Specific Changes**:
3. **Add `getStats()` method** to `PostService` class that:
   - Queries `postsCollection` (which already points to `'brighthub_posts'`) for `totalPosts` count (non-deleted posts)
   - Queries `postsCollection` for `activeUsersLast30Days` — count of distinct `authorId` values with `createdAt` within the last 30 days
   - Returns `{ totalPosts: number, activeUsersLast30Days: number }`

4. **Handle collection interface**: The existing `Collection<T>` interface in `postService.ts` uses `find` and `findOne` with `.exec()`. The `getStats()` method will use `find` to get posts and compute counts in-memory, or if a `countDocuments`-style method is available, use that. Given the existing interface, the method will use `find` with appropriate filters and count results.

5. **Fallback safety**: If the query fails, return `{ totalPosts: 0, activeUsersLast30Days: 0 }` to match the dashboard's existing fallback behavior.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write unit tests that mock the database and verify which collection name `AdminHubController` uses, and whether `PostService` has a `getStats()` method. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Admin List Posts Collection Test**: Verify `handleListPosts` queries `'brighthub_posts'` (will fail on unfixed code — it queries `'posts'`)
2. **Admin Delete Post Collection Test**: Verify `handleDeletePost` updates `'brighthub_posts'` (will fail on unfixed code — it updates `'posts'`)
3. **PostService getStats Existence Test**: Verify `PostService` has a `getStats()` method (will fail on unfixed code — method doesn't exist)
4. **Dashboard Hub Stats Integration Test**: Verify `gatherHubStats()` returns non-zero counts when posts exist (will fail on unfixed code)

**Expected Counterexamples**:
- `AdminHubController` calls `brightDb.collection('posts')` instead of `brightDb.collection('brighthub_posts')`
- `PostService` instance has no `getStats` property/method
- Dashboard returns `{ totalPosts: 0, activeUsersLast30Days: 0 }` regardless of actual post count

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  IF request.type = 'AdminHubRequest' THEN
    collectionUsed := getCollectionName(AdminHubController_fixed, request)
    ASSERT collectionUsed = 'brighthub_posts'
    result := handleRequest_fixed(request)
    ASSERT result.posts.length >= 0 AND result.total matches actual count
  ELSE IF request.type = 'DashboardStatsCall' THEN
    result := PostService_fixed.getStats()
    ASSERT method_exists(PostService_fixed, 'getStats')
    ASSERT result.totalPosts >= 0
    ASSERT result.activeUsersLast30Days >= 0
  END IF
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for public post operations (create, edit, delete, like, repost, quote), then write property-based tests capturing that behavior continues after the fix.

**Test Cases**:
1. **Public Post CRUD Preservation**: Verify creating, editing, and deleting posts through `PostService` continues to work identically after the fix
2. **Like/Repost/Quote Preservation**: Verify interaction operations continue to work identically
3. **Other Dashboard Stats Preservation**: Verify chat, pass, and mail stats are unaffected
4. **Pagination Preservation**: Verify admin hub pagination parameters continue to be respected

### Unit Tests

- Test that `AdminHubController.handleListPosts` uses `'brighthub_posts'` collection
- Test that `AdminHubController.handleDeletePost` uses `'brighthub_posts'` collection
- Test that `PostService.getStats()` returns correct `totalPosts` count
- Test that `PostService.getStats()` returns correct `activeUsersLast30Days` count
- Test that `PostService.getStats()` excludes deleted posts from `totalPosts`
- Test edge case: `getStats()` returns zeros when no posts exist

### Property-Based Tests

- Generate random sets of post records and verify `getStats()` always returns counts consistent with the data
- Generate random admin list requests with various filter combinations and verify results come from `brighthub_posts`
- Generate random post operations (create, like, delete) and verify `PostService` behavior is unchanged

### Integration Tests

- Test full admin dashboard flow: create posts via `PostService`, then verify dashboard stats reflect them
- Test admin hub list: create posts via `PostService`, then verify admin list endpoint returns them
- Test admin hub delete: create a post, delete via admin endpoint, verify it's soft-deleted in `brighthub_posts`
