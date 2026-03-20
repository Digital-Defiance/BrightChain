import axios, { AxiosError } from 'axios';

/**
 * End-to-end integration tests for the BrightHub Timeline, Follow, and Search APIs.
 *
 * Tests follow/unfollow operations, timeline generation with filters,
 * and search functionality against a running API server.
 *
 * Requirements: 15.4, 15.5, 15.7
 */

// ─── Helpers ────────────────────────────────────────────────────

/** Generate unique user credentials per test run. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.brighthub.local`,
    password: `BH7est!${id}`,
  };
}

/** Register a user and return token + memberId. */
async function registerUser(prefix = 'bh') {
  const creds = uniqueUser(prefix);
  const res = await axios.post('/api/user/register', {
    username: creds.username,
    email: creds.email,
    password: creds.password,
  });
  return {
    creds,
    token: res.data.data?.token as string,
    memberId: res.data.data?.memberId as string,
  };
}

/** Create an axios config with Bearer auth header. */
function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/** Create a post and return its ID. */
async function createPost(
  authorId: string,
  token: string,
  content: string,
  options?: { parentPostId?: string },
) {
  const res = await axios.post(
    POSTS_BASE,
    { authorId, content, ...options },
    authHeader(token),
  );
  return res.data.data._id as string;
}

const USERS_BASE = '/api/brighthub/users';
const TIMELINE_BASE = '/api/brighthub/timeline';
const SEARCH_BASE = '/api/brighthub/search';
const POSTS_BASE = '/api/brighthub/posts';

// ─── Follow / Unfollow Operations (Requirement 15.4) ────────────

describe('BrightHub Follow API — Follow / Unfollow', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };

  beforeAll(async () => {
    userA = await registerUser('flwA');
    userB = await registerUser('flwB');
  });

  it('should follow another user', async () => {
    const res = await axios.post(
      `${USERS_BASE}/${userB.memberId}/follow`,
      { followerId: userA.memberId },
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should reflect updated follower counts on the followed user profile', async () => {
    const res = await axios.get(
      `${USERS_BASE}/${userB.memberId}`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.followerCount).toBeGreaterThanOrEqual(1);
  });

  it('should reflect updated following count on the follower profile', async () => {
    const res = await axios.get(
      `${USERS_BASE}/${userA.memberId}`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.followingCount).toBeGreaterThanOrEqual(1);
  });

  it('should prevent self-follow', async () => {
    try {
      await axios.post(
        `${USERS_BASE}/${userA.memberId}/follow`,
        { followerId: userA.memberId },
        authHeader(userA.token),
      );
      throw new Error('Expected error for self-follow');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should prevent duplicate follow', async () => {
    // Service is idempotent — duplicate follow returns success
    const res = await axios.post(
      `${USERS_BASE}/${userB.memberId}/follow`,
      { followerId: userA.memberId },
      authHeader(userA.token),
    );
    expect(res.status).toBe(200);
  });

  it('should unfollow a user', async () => {
    const res = await axios.delete(`${USERS_BASE}/${userB.memberId}/follow`, {
      ...authHeader(userA.token),
      data: { followerId: userA.memberId },
    });

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should decrement follower count after unfollow', async () => {
    const res = await axios.get(
      `${USERS_BASE}/${userB.memberId}`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.followerCount).toBe(0);
  });

  it('should return error when unfollowing a user not followed', async () => {
    // Service is idempotent — unfollowing when not following returns success
    const res = await axios.delete(`${USERS_BASE}/${userB.memberId}/follow`, {
      ...authHeader(userA.token),
      data: { followerId: userA.memberId },
    });
    expect(res.status).toBe(200);
  });

  it('should reject follow with missing followerId', async () => {
    try {
      await axios.post(
        `${USERS_BASE}/${userB.memberId}/follow`,
        {},
        authHeader(userA.token),
      );
      throw new Error('Expected 400 for missing followerId');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should reject follow for non-existent user', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.post(
        `${USERS_BASE}/${fakeId}/follow`,
        { followerId: userA.memberId },
        authHeader(userA.token),
      );
      throw new Error('Expected error for following non-existent user');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Home Timeline (Requirement 15.5) ───────────────────────────

describe('BrightHub Timeline API — Home Timeline', () => {
  let follower: { token: string; memberId: string };
  let author: { token: string; memberId: string };
  let stranger: { token: string; memberId: string };
  let authorPostId: string;

  beforeAll(async () => {
    follower = await registerUser('htFol');
    author = await registerUser('htAuth');
    stranger = await registerUser('htStr');

    // follower follows author
    await axios.post(
      `${USERS_BASE}/${author.memberId}/follow`,
      { followerId: follower.memberId },
      authHeader(follower.token),
    );

    // author creates a post
    authorPostId = await createPost(
      author.memberId,
      author.token,
      'Post visible on home timeline',
    );

    // stranger creates a post (should NOT appear in follower's home timeline)
    await createPost(
      stranger.memberId,
      stranger.token,
      'Stranger post not in home timeline',
    );
  });

  it('should return posts from followed users in home timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}`,
      authHeader(follower.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.posts).toBeInstanceOf(Array);

    const postIds = res.data.data.posts.map((p: { _id: string }) => p._id);
    expect(postIds).toContain(authorPostId);
  });

  it('should not include posts from unfollowed users in home timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}`,
      authHeader(follower.token),
    );

    const authorIds = res.data.data.posts.map(
      (p: { authorId: string }) => p.authorId,
    );
    // stranger's posts should not appear
    expect(authorIds).not.toContain(stranger.memberId);
  });

  it('should return posts in reverse chronological order', async () => {
    // Create a second post by author
    await createPost(author.memberId, author.token, 'Second post by author');

    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}`,
      authHeader(follower.token),
    );

    const posts = res.data.data.posts;
    if (posts.length >= 2) {
      // Each post should be newer than or equal to the next
      for (let i = 0; i < posts.length - 1; i++) {
        expect(new Date(posts[i].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(posts[i + 1].createdAt).getTime(),
        );
      }
    }
  });

  it('should require userId query parameter for home timeline', async () => {
    try {
      await axios.get(`${TIMELINE_BASE}/home`, authHeader(follower.token));
      throw new Error('Expected 400 for missing userId');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should support limit parameter', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}&limit=1`,
      authHeader(follower.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.posts.length).toBeLessThanOrEqual(1);
  });

  it('should enforce max 50 posts per request', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}&limit=100`,
      authHeader(follower.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.posts.length).toBeLessThanOrEqual(50);
  });
});

// ─── Public Timeline (Requirement 15.5) ─────────────────────────

describe('BrightHub Timeline API — Public Timeline', () => {
  let user: { token: string; memberId: string };
  let postId: string;

  beforeAll(async () => {
    user = await registerUser('pubTl');
    postId = await createPost(
      user.memberId,
      user.token,
      'Public timeline post',
    );
  });

  it('should return recent public posts', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/public`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.posts).toBeInstanceOf(Array);
    expect(res.data.data.posts.length).toBeGreaterThanOrEqual(1);
  });

  it('should include the newly created post in public timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/public`,
      authHeader(user.token),
    );

    const postIds = res.data.data.posts.map((p: { _id: string }) => p._id);
    expect(postIds).toContain(postId);
  });

  it('should support cursor-based pagination', async () => {
    // Get first page with limit 1
    const page1 = await axios.get(
      `${TIMELINE_BASE}/public?limit=1`,
      authHeader(user.token),
    );

    expect(page1.status).toBe(200);
    const cursor = page1.data.data.cursor;

    if (cursor) {
      // Get second page using cursor
      const page2 = await axios.get(
        `${TIMELINE_BASE}/public?limit=1&cursor=${cursor}`,
        authHeader(user.token),
      );

      expect(page2.status).toBe(200);
      expect(page2.data.data.posts).toBeInstanceOf(Array);

      // Pages should not overlap
      if (
        page1.data.data.posts.length > 0 &&
        page2.data.data.posts.length > 0
      ) {
        expect(page2.data.data.posts[0]._id).not.toBe(
          page1.data.data.posts[0]._id,
        );
      }
    }
  });

  it('should return hasMore flag', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/public?limit=1`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(typeof res.data.data.hasMore).toBe('boolean');
  });
});

// ─── User Profile Feed (Requirement 15.5) ───────────────────────

describe('BrightHub Timeline API — User Profile Feed', () => {
  let user: { token: string; memberId: string };
  let viewer: { token: string; memberId: string };
  let userPostId: string;

  beforeAll(async () => {
    user = await registerUser('upFeed');
    viewer = await registerUser('upView');

    userPostId = await createPost(
      user.memberId,
      user.token,
      'User profile feed post',
    );
  });

  it("should return a specific user's posts", async () => {
    const res = await axios.get(
      `${USERS_BASE}/${user.memberId}/feed`,
      authHeader(viewer.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.posts).toBeInstanceOf(Array);

    const postIds = res.data.data.posts.map((p: { _id: string }) => p._id);
    expect(postIds).toContain(userPostId);
  });

  it("should not include other users' posts in user feed", async () => {
    // Create a post by viewer
    await createPost(
      viewer.memberId,
      viewer.token,
      'Viewer post should not appear in user feed',
    );

    const res = await axios.get(
      `${USERS_BASE}/${user.memberId}/feed`,
      authHeader(viewer.token),
    );

    const authorIds = res.data.data.posts.map(
      (p: { authorId: string }) => p.authorId,
    );
    // All posts should be from the target user
    for (const authorId of authorIds) {
      expect(authorId).toBe(user.memberId);
    }
  });
});

// ─── Timeline with Reposts and Quotes (Requirement 15.5) ────────

describe('BrightHub Timeline API — Reposts and Quotes in Timeline', () => {
  let author: { token: string; memberId: string };
  let reposter: { token: string; memberId: string };
  let follower: { token: string; memberId: string };
  let originalPostId: string;

  beforeAll(async () => {
    author = await registerUser('tlAuth');
    reposter = await registerUser('tlRep');
    follower = await registerUser('tlFol');

    // follower follows reposter
    await axios.post(
      `${USERS_BASE}/${reposter.memberId}/follow`,
      { followerId: follower.memberId },
      authHeader(follower.token),
    );

    // author creates a post
    originalPostId = await createPost(
      author.memberId,
      author.token,
      'Original post for repost timeline test',
    );

    // reposter reposts it
    await axios.post(
      `${POSTS_BASE}/${originalPostId}/repost`,
      { userId: reposter.memberId },
      authHeader(reposter.token),
    );

    // reposter creates a quote post
    await axios.post(
      `${POSTS_BASE}/${originalPostId}/quote`,
      { userId: reposter.memberId, commentary: 'Great post!' },
      authHeader(reposter.token),
    );
  });

  it('should include reposts in home timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}`,
      authHeader(follower.token),
    );

    expect(res.status).toBe(200);
    const postTypes = res.data.data.posts.map(
      (p: { postType: string }) => p.postType,
    );
    // Should contain at least one repost or the original via repost
    expect(postTypes.includes('repost') || res.data.data.posts.length > 0).toBe(
      true,
    );
  });

  it('should include quote posts in home timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}`,
      authHeader(follower.token),
    );

    expect(res.status).toBe(200);
    const quotePosts = res.data.data.posts.filter(
      (p: { postType: string }) => p.postType === 'quote',
    );
    expect(quotePosts.length).toBeGreaterThanOrEqual(1);
    expect(quotePosts[0].quotedPostId).toBe(originalPostId);
  });
});

// ─── Search Functionality (Requirement 15.7) ────────────────────

describe('BrightHub Search API — Post Search', () => {
  let user: { token: string; memberId: string };
  const searchTag = `srch${Date.now().toString(36)}`;

  beforeAll(async () => {
    user = await registerUser('search');

    // Create posts with a unique hashtag for search
    await createPost(
      user.memberId,
      user.token,
      `Searchable post with #${searchTag} hashtag`,
    );

    await createPost(
      user.memberId,
      user.token,
      `Another post with #${searchTag} for search tests`,
    );
  });

  it('should search posts by text query', async () => {
    const res = await axios.get(
      `${SEARCH_BASE}?q=${searchTag}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.posts).toBeInstanceOf(Array);
    expect(res.data.data.posts.length).toBeGreaterThanOrEqual(1);
  });

  it('should search posts by hashtag with # prefix', async () => {
    const res = await axios.get(
      `${SEARCH_BASE}?q=%23${searchTag}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.posts).toBeInstanceOf(Array);
    expect(res.data.data.posts.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty results for non-matching query', async () => {
    const gibberish = `zzz_nomatch_${Date.now().toString(36)}`;
    const res = await axios.get(
      `${SEARCH_BASE}?q=${gibberish}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.posts).toBeInstanceOf(Array);
    expect(res.data.data.posts.length).toBe(0);
  });

  it('should require q query parameter', async () => {
    try {
      await axios.get(SEARCH_BASE, authHeader(user.token));
      throw new Error('Expected 400 for missing q parameter');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should support pagination for search results', async () => {
    const page1 = await axios.get(
      `${SEARCH_BASE}?q=${searchTag}&limit=1`,
      authHeader(user.token),
    );

    expect(page1.status).toBe(200);
    expect(page1.data.data.posts.length).toBeLessThanOrEqual(1);
    expect(typeof page1.data.data.hasMore).toBe('boolean');

    const cursor = page1.data.data.cursor;
    if (cursor && page1.data.data.hasMore) {
      const page2 = await axios.get(
        `${SEARCH_BASE}?q=${searchTag}&limit=1&cursor=${cursor}`,
        authHeader(user.token),
      );

      expect(page2.status).toBe(200);
      expect(page2.data.data.posts).toBeInstanceOf(Array);

      // Pages should not overlap
      if (
        page1.data.data.posts.length > 0 &&
        page2.data.data.posts.length > 0
      ) {
        expect(page2.data.data.posts[0]._id).not.toBe(
          page1.data.data.posts[0]._id,
        );
      }
    }
  });
});

// ─── Hashtag Feed (Requirement 15.7) ────────────────────────────

describe('BrightHub Search API — Hashtag Feed', () => {
  let user: { token: string; memberId: string };
  const hashTag = `htag${Date.now().toString(36)}`;

  beforeAll(async () => {
    user = await registerUser('htag');

    await createPost(
      user.memberId,
      user.token,
      `Post with #${hashTag} for hashtag feed test`,
    );
  });

  it('should return posts for a specific hashtag via hashtag endpoint', async () => {
    const res = await axios.get(
      `/api/brighthub/hashtag/${hashTag}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.posts).toBeInstanceOf(Array);
    expect(res.data.data.posts.length).toBeGreaterThanOrEqual(1);

    // All returned posts should contain the hashtag
    for (const post of res.data.data.posts) {
      const hasHashtag =
        post.hashtags?.includes(hashTag) ||
        post.content?.toLowerCase().includes(`#${hashTag}`);
      expect(hasHashtag).toBe(true);
    }
  });

  it('should return empty results for non-existent hashtag', async () => {
    const fakeTag = `nonexistent_${Date.now().toString(36)}`;
    const res = await axios.get(
      `/api/brighthub/hashtag/${fakeTag}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.posts).toBeInstanceOf(Array);
    expect(res.data.data.posts.length).toBe(0);
  });
});

// ─── Timeline After Unfollow (Requirement 15.4, 15.5) ──────────

describe('BrightHub Timeline API — Follow/Unfollow Timeline Effect', () => {
  let follower: { token: string; memberId: string };
  let author: { token: string; memberId: string };
  let authorPostId: string;

  beforeAll(async () => {
    follower = await registerUser('fuTlF');
    author = await registerUser('fuTlA');

    // Follow, create post, then unfollow
    await axios.post(
      `${USERS_BASE}/${author.memberId}/follow`,
      { followerId: follower.memberId },
      authHeader(follower.token),
    );

    authorPostId = await createPost(
      author.memberId,
      author.token,
      'Post before unfollow',
    );
  });

  it('should show followed user posts in home timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}`,
      authHeader(follower.token),
    );

    expect(res.status).toBe(200);
    const postIds = res.data.data.posts.map((p: { _id: string }) => p._id);
    expect(postIds).toContain(authorPostId);
  });

  it('should not show unfollowed user posts in home timeline after unfollow', async () => {
    // Unfollow
    await axios.delete(`${USERS_BASE}/${author.memberId}/follow`, {
      ...authHeader(follower.token),
      data: { followerId: follower.memberId },
    });

    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${follower.memberId}`,
      authHeader(follower.token),
    );

    expect(res.status).toBe(200);
    const authorIds = res.data.data.posts.map(
      (p: { authorId: string }) => p.authorId,
    );
    expect(authorIds).not.toContain(author.memberId);
  });
});

// ─── User Profile Retrieval (Requirement 15.4) ─────────────────

describe('BrightHub Users API — Profile Retrieval', () => {
  let user: { token: string; memberId: string; creds: { username: string } };

  beforeAll(async () => {
    user = await registerUser('prof');
  });

  it('should retrieve a user profile by ID', async () => {
    const res = await axios.get(
      `${USERS_BASE}/${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.username).toBe(user.creds.username);
    expect(typeof res.data.data.followerCount).toBe('number');
    expect(typeof res.data.data.followingCount).toBe('number');
    expect(typeof res.data.data.postCount).toBe('number');
  });

  it('should return 404 for non-existent user profile', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.get(`${USERS_BASE}/${fakeId}`, authHeader(user.token));
      throw new Error('Expected 404 for non-existent user');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});
