# Bugfix Requirements Document

## Introduction

The BrightHub admin dashboard and admin hub post list both report zero posts, even though posts exist and display correctly on the public BrightHub page. Two independent bugs cause this:

1. The `AdminHubController` queries the wrong MongoDB collection (`'posts'` instead of `'brighthub_posts'`), so it always finds an empty result set.
2. The dashboard's `gatherHubStats()` method calls `postService.getStats()`, which does not exist on `PostService`. The optional-chaining guard silently falls back to `{ totalPosts: 0, activeUsersLast30Days: 0 }`.

Together these bugs make it appear to administrators that no BrightHub posts exist, while regular users see posts normally.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin requests the post list via `GET /api/admin/hub/posts` THEN the system queries the `'posts'` collection instead of `'brighthub_posts'`, returning zero results and a total of 0 even when posts exist in the correct collection.

1.2 WHEN an admin requests the post list via `GET /api/admin/hub/posts` with an `authorId` filter THEN the system queries the wrong `'posts'` collection, returning zero results regardless of the filter value.

1.3 WHEN an admin soft-deletes a post via `DELETE /api/admin/hub/posts/:postId` THEN the system attempts to update the `'posts'` collection instead of `'brighthub_posts'`, so the actual post is never marked as deleted and a "not found" response is returned.

1.4 WHEN the admin dashboard calls `gatherHubStats()` THEN the system attempts to call `postService.getStats()` which does not exist on `PostService`, causing the optional-chaining check to fail silently and return `{ totalPosts: 0, activeUsersLast30Days: 0 }`.

### Expected Behavior (Correct)

2.1 WHEN an admin requests the post list via `GET /api/admin/hub/posts` THEN the system SHALL query the `'brighthub_posts'` collection, returning the actual posts and correct total count.

2.2 WHEN an admin requests the post list via `GET /api/admin/hub/posts` with an `authorId` filter THEN the system SHALL query the `'brighthub_posts'` collection and return only posts matching the given author.

2.3 WHEN an admin soft-deletes a post via `DELETE /api/admin/hub/posts/:postId` THEN the system SHALL update the `isDeleted` flag on the document in the `'brighthub_posts'` collection and return a success response.

2.4 WHEN the admin dashboard calls `gatherHubStats()` THEN the system SHALL obtain accurate post statistics (at minimum `totalPosts` and `activeUsersLast30Days`) from `PostService` via a `getStats()` method that queries the `'brighthub_posts'` collection.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user creates, edits, deletes, likes, reposts, or quotes a post through the public BrightHub interface THEN the system SHALL CONTINUE TO store and retrieve posts from the `'brighthub_posts'` collection via `PostService`.

3.2 WHEN `FeedService`, `ThreadService`, `DiscoveryService`, or `ConnectionController` query posts THEN the system SHALL CONTINUE TO use the `'brighthub_posts'` collection and return correct results.

3.3 WHEN the admin hub list endpoint is called with pagination parameters (`page`, `limit`) THEN the system SHALL CONTINUE TO respect pagination and return at most `limit` results per page.

3.4 WHEN the admin hub list endpoint is called with the `isDeleted` filter THEN the system SHALL CONTINUE TO filter posts by their deletion status.

3.5 WHEN the dashboard gathers statistics for other services (conversations, vaults/pass) THEN the system SHALL CONTINUE TO call their respective `getStats()` methods without any change in behavior.

---

### Bug Condition (Formal)

**Bug Condition 1 — Wrong Collection Name:**

```pascal
FUNCTION isBugCondition_Collection(request)
  INPUT: request of type AdminHubRequest
  OUTPUT: boolean

  // Any admin hub request that touches the posts collection triggers the bug
  RETURN request.endpoint IN {'/api/admin/hub/posts', '/api/admin/hub/posts/:postId'}
END FUNCTION
```

**Property: Fix Checking — Collection Name**

```pascal
FOR ALL request WHERE isBugCondition_Collection(request) DO
  collectionUsed ← getCollectionName(AdminHubController', request)
  ASSERT collectionUsed = 'brighthub_posts'
END FOR
```

**Bug Condition 2 — Missing getStats Method:**

```pascal
FUNCTION isBugCondition_GetStats(call)
  INPUT: call of type DashboardStatsCall
  OUTPUT: boolean

  // The dashboard hub stats gathering always triggers this bug
  RETURN call.target = 'postService' AND call.method = 'getStats'
END FUNCTION
```

**Property: Fix Checking — getStats Exists and Returns Real Data**

```pascal
FOR ALL call WHERE isBugCondition_GetStats(call) DO
  result ← PostService'.getStats()
  ASSERT result.totalPosts >= 0
  ASSERT method_exists(PostService', 'getStats')
END FOR
```

**Preservation Goal:**

```pascal
// For all non-admin post operations, the fixed code behaves identically to the original
FOR ALL X WHERE NOT isBugCondition_Collection(X) AND NOT isBugCondition_GetStats(X) DO
  ASSERT F(X) = F'(X)
END FOR
```
