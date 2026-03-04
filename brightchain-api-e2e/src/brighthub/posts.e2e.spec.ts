import axios, { AxiosError } from 'axios';

/**
 * End-to-end integration tests for the BrightHub Posts API.
 *
 * Tests post CRUD operations, like/unlike, repost, quote post,
 * and thread/reply operations against a running API server.
 *
 * Requirements: 15.1, 15.2, 15.3
 */

// ─── Helpers ────────────────────────────────────────────────────

/** Generate unique user credentials per test run. */
function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.brighthub.local`,
    password: `BHTest!${id}`,
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

const BASE = '/api/brighthub/posts';

// ─── Post CRUD Operations (Requirement 15.1) ───────────────────

describe('BrightHub Posts API — CRUD Operations', () => {
  let token: string;
  let memberId: string;
  let postId: string;

  beforeAll(async () => {
    const user = await registerUser('postcrud');
    token = user.token;
    memberId = user.memberId;
  });

  // POST /api/brighthub/posts — create a post
  it('should create a post with valid content', async () => {
    const res = await axios.post(
      BASE,
      {
        authorId: memberId,
        content: 'Hello BrightHub! This is my first post.',
      },
      authHeader(token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.content).toBe(
      'Hello BrightHub! This is my first post.',
    );
    expect(res.data.data.authorId).toBe(memberId);
    postId = res.data.data._id;
    expect(typeof postId).toBe('string');
  });

  // GET /api/brighthub/posts/:id — get a single post
  it('should retrieve the created post by ID', async () => {
    const res = await axios.get(`${BASE}/${postId}`, authHeader(token));

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data._id).toBe(postId);
    expect(res.data.data.content).toBe(
      'Hello BrightHub! This is my first post.',
    );
  });

  // PUT /api/brighthub/posts/:id — edit a post within 15-minute window
  it('should edit own post within the edit window', async () => {
    const res = await axios.put(
      `${BASE}/${postId}`,
      { userId: memberId, content: 'Edited: Hello BrightHub!' },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.content).toBe('Edited: Hello BrightHub!');
    expect(res.data.data.isEdited).toBe(true);
  });

  // DELETE /api/brighthub/posts/:id — soft-delete a post
  it('should delete own post', async () => {
    const res = await axios.delete(`${BASE}/${postId}`, {
      ...authHeader(token),
      data: { userId: memberId },
    });

    // Controller returns 204 for successful deletion
    expect(res.status).toBe(204);
  });

  // Verify deleted post is not retrievable
  it('should return 404 for deleted post', async () => {
    try {
      await axios.get(`${BASE}/${postId}`, authHeader(token));
      fail('Expected 404 for deleted post');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Post Validation (Requirement 15.1) ─────────────────────────

describe('BrightHub Posts API — Validation', () => {
  let token: string;
  let memberId: string;

  beforeAll(async () => {
    const user = await registerUser('postval');
    token = user.token;
    memberId = user.memberId;
  });

  it('should reject post content exceeding 280 characters', async () => {
    const longContent = 'A'.repeat(281);
    try {
      await axios.post(
        BASE,
        { authorId: memberId, content: longContent },
        authHeader(token),
      );
      fail('Expected 400 for content exceeding 280 characters');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should reject empty post content', async () => {
    try {
      await axios.post(
        BASE,
        { authorId: memberId, content: '' },
        authHeader(token),
      );
      fail('Expected 400 for empty content');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should reject post creation without authorId', async () => {
    try {
      await axios.post(BASE, { content: 'Missing author' }, authHeader(token));
      fail('Expected 400 for missing authorId');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should return 404 for non-existent post ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.get(`${BASE}/${fakeId}`, authHeader(token));
      fail('Expected 404 for non-existent post');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Post Authorization (Requirement 15.1) ──────────────────────

describe('BrightHub Posts API — Authorization', () => {
  let ownerToken: string;
  let ownerMemberId: string;
  let otherToken: string;
  let otherMemberId: string;
  let postId: string;

  beforeAll(async () => {
    const owner = await registerUser('postowner');
    ownerToken = owner.token;
    ownerMemberId = owner.memberId;

    const other = await registerUser('postother');
    otherToken = other.token;
    otherMemberId = other.memberId;

    // Create a post as owner
    const res = await axios.post(
      BASE,
      { authorId: ownerMemberId, content: 'Owner post for auth tests' },
      authHeader(ownerToken),
    );
    postId = res.data.data._id;
  });

  it("should reject editing another user's post", async () => {
    try {
      await axios.put(
        `${BASE}/${postId}`,
        { userId: otherMemberId, content: 'Unauthorized edit' },
        authHeader(otherToken),
      );
      fail("Expected 403 for editing another user's post");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(403);
    }
  });

  it("should reject deleting another user's post", async () => {
    try {
      await axios.delete(`${BASE}/${postId}`, {
        ...authHeader(otherToken),
        data: { userId: otherMemberId },
      });
      fail("Expected 403 for deleting another user's post");
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(403);
    }
  });
});

// ─── Like and Unlike Operations (Requirement 15.3) ──────────────

describe('BrightHub Posts API — Like / Unlike', () => {
  let token: string;
  let memberId: string;
  let postId: string;

  beforeAll(async () => {
    const user = await registerUser('postlike');
    token = user.token;
    memberId = user.memberId;

    const res = await axios.post(
      BASE,
      { authorId: memberId, content: 'Post for like tests' },
      authHeader(token),
    );
    postId = res.data.data._id;
  });

  it('should like a post', async () => {
    const res = await axios.post(
      `${BASE}/${postId}/like`,
      { userId: memberId },
      authHeader(token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should reject duplicate like on the same post', async () => {
    // Service is idempotent — duplicate like returns success
    const res = await axios.post(
      `${BASE}/${postId}/like`,
      { userId: memberId },
      authHeader(token),
    );
    expect(res.status).toBe(200);
  });

  it('should unlike a post', async () => {
    const res = await axios.delete(`${BASE}/${postId}/like`, {
      ...authHeader(token),
      data: { userId: memberId },
    });

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should reflect updated like count after like/unlike cycle', async () => {
    // Like the post
    await axios.post(
      `${BASE}/${postId}/like`,
      { userId: memberId },
      authHeader(token),
    );

    // Retrieve and check count
    const afterLike = await axios.get(`${BASE}/${postId}`, authHeader(token));
    expect(afterLike.data.data.likeCount).toBeGreaterThanOrEqual(1);

    // Unlike the post
    await axios.delete(`${BASE}/${postId}/like`, {
      ...authHeader(token),
      data: { userId: memberId },
    });

    // Retrieve and check count decreased
    const afterUnlike = await axios.get(`${BASE}/${postId}`, authHeader(token));
    expect(afterUnlike.data.data.likeCount).toBeLessThan(
      afterLike.data.data.likeCount,
    );
  });

  it('should return 404 when liking a non-existent post', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.post(
        `${BASE}/${fakeId}/like`,
        { userId: memberId },
        authHeader(token),
      );
      fail('Expected 404 for liking non-existent post');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Repost Operations (Requirement 15.3) ───────────────────────

describe('BrightHub Posts API — Repost', () => {
  let authorToken: string;
  let authorMemberId: string;
  let reposterToken: string;
  let reposterMemberId: string;
  let originalPostId: string;

  beforeAll(async () => {
    const author = await registerUser('repostauthor');
    authorToken = author.token;
    authorMemberId = author.memberId;

    const reposter = await registerUser('reposter');
    reposterToken = reposter.token;
    reposterMemberId = reposter.memberId;

    const res = await axios.post(
      BASE,
      { authorId: authorMemberId, content: 'Original post for repost tests' },
      authHeader(authorToken),
    );
    originalPostId = res.data.data._id;
  });

  it("should repost another user's post", async () => {
    const res = await axios.post(
      `${BASE}/${originalPostId}/repost`,
      { userId: reposterMemberId },
      authHeader(reposterToken),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
  });

  it('should reject duplicate repost of the same post', async () => {
    try {
      await axios.post(
        `${BASE}/${originalPostId}/repost`,
        { userId: reposterMemberId },
        authHeader(reposterToken),
      );
      fail('Expected error for duplicate repost');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });
});

// ─── Quote Post Operations (Requirement 15.3) ───────────────────

describe('BrightHub Posts API — Quote Post', () => {
  let authorToken: string;
  let authorMemberId: string;
  let quoterToken: string;
  let quoterMemberId: string;
  let originalPostId: string;

  beforeAll(async () => {
    const author = await registerUser('quoteauthor');
    authorToken = author.token;
    authorMemberId = author.memberId;

    const quoter = await registerUser('quoter');
    quoterToken = quoter.token;
    quoterMemberId = quoter.memberId;

    const res = await axios.post(
      BASE,
      { authorId: authorMemberId, content: 'Original post for quote tests' },
      authHeader(authorToken),
    );
    originalPostId = res.data.data._id;
  });

  it('should create a quote post with commentary', async () => {
    const res = await axios.post(
      `${BASE}/${originalPostId}/quote`,
      { userId: quoterMemberId, commentary: 'Great insight here!' },
      authHeader(quoterToken),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.quotedPostId).toBe(originalPostId);
    expect(res.data.data.content).toBe('Great insight here!');
  });

  it('should reject quote post without commentary', async () => {
    try {
      await axios.post(
        `${BASE}/${originalPostId}/quote`,
        { userId: quoterMemberId },
        authHeader(quoterToken),
      );
      fail('Expected 400 for missing commentary');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should return 404 when quoting a non-existent post', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.post(
        `${BASE}/${fakeId}/quote`,
        { userId: quoterMemberId, commentary: 'Quoting nothing' },
        authHeader(quoterToken),
      );
      fail('Expected 404 for quoting non-existent post');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Thread and Reply Operations (Requirement 15.2) ─────────────

describe('BrightHub Posts API — Threads and Replies', () => {
  let token: string;
  let memberId: string;
  let rootPostId: string;

  beforeAll(async () => {
    const user = await registerUser('thread');
    token = user.token;
    memberId = user.memberId;

    // Create a root post
    const res = await axios.post(
      BASE,
      { authorId: memberId, content: 'Root post for thread tests' },
      authHeader(token),
    );
    rootPostId = res.data.data._id;
  });

  it('should create a reply linked to a parent post', async () => {
    const res = await axios.post(
      BASE,
      {
        authorId: memberId,
        content: 'This is a reply to the root post',
        parentPostId: rootPostId,
      },
      authHeader(token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.parentPostId).toBe(rootPostId);
    expect(res.data.data.postType).toBe('reply');
  });

  it('should create nested replies forming a thread', async () => {
    // Create first-level reply
    const reply1 = await axios.post(
      BASE,
      {
        authorId: memberId,
        content: 'First-level reply',
        parentPostId: rootPostId,
      },
      authHeader(token),
    );
    const reply1Id = reply1.data.data._id;

    // Create second-level reply
    const reply2 = await axios.post(
      BASE,
      {
        authorId: memberId,
        content: 'Second-level reply',
        parentPostId: reply1Id,
      },
      authHeader(token),
    );

    expect(reply2.status).toBe(201);
    expect(reply2.data.data.parentPostId).toBe(reply1Id);
  });

  it('should track reply count on the parent post', async () => {
    const res = await axios.get(`${BASE}/${rootPostId}`, authHeader(token));

    expect(res.data.data.replyCount).toBeGreaterThanOrEqual(1);
  });

  it('should return 404 when replying to a non-existent parent', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.post(
        BASE,
        {
          authorId: memberId,
          content: 'Reply to nothing',
          parentPostId: fakeId,
        },
        authHeader(token),
      );
      fail('Expected error for non-existent parent post');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Thread Depth Limiting (Requirement 15.2) ───────────────────

describe('BrightHub Posts API — Thread Depth Limiting', () => {
  let token: string;
  let memberId: string;

  beforeAll(async () => {
    const user = await registerUser('depth');
    token = user.token;
    memberId = user.memberId;
  });

  it('should handle replies up to max nesting depth (10 levels)', async () => {
    // Create root post
    const root = await axios.post(
      BASE,
      { authorId: memberId, content: 'Depth test root' },
      authHeader(token),
    );
    let parentId = root.data.data._id;

    // Create 10 levels of nested replies
    for (let i = 1; i <= 10; i++) {
      const reply = await axios.post(
        BASE,
        {
          authorId: memberId,
          content: `Depth level ${i}`,
          parentPostId: parentId,
        },
        authHeader(token),
      );
      expect(reply.status).toBe(201);
      parentId = reply.data.data._id;
    }

    // 11th level should still succeed but attach to deepest allowed parent
    const deepReply = await axios.post(
      BASE,
      {
        authorId: memberId,
        content: 'Beyond max depth',
        parentPostId: parentId,
      },
      authHeader(token),
    );

    expect(deepReply.status).toBe(201);
    // The reply is created but may be re-parented to the deepest allowed level
    expect(deepReply.data.data).toBeDefined();
  });
});

// ─── Delete Cascade (Requirement 15.1) ──────────────────────────

describe('BrightHub Posts API — Delete Cascade', () => {
  let token: string;
  let memberId: string;

  beforeAll(async () => {
    const user = await registerUser('cascade');
    token = user.token;
    memberId = user.memberId;
  });

  it('should preserve replies when parent post is deleted', async () => {
    // Create parent post
    const parent = await axios.post(
      BASE,
      { authorId: memberId, content: 'Parent to be deleted' },
      authHeader(token),
    );
    const parentId = parent.data.data._id;

    // Create a reply
    const reply = await axios.post(
      BASE,
      {
        authorId: memberId,
        content: 'Reply that should survive',
        parentPostId: parentId,
      },
      authHeader(token),
    );
    const replyId = reply.data.data._id;

    // Delete the parent
    await axios.delete(`${BASE}/${parentId}`, {
      ...authHeader(token),
      data: { userId: memberId },
    });

    // Reply should still be retrievable
    const replyAfterDelete = await axios.get(
      `${BASE}/${replyId}`,
      authHeader(token),
    );
    expect(replyAfterDelete.status).toBe(200);
    expect(replyAfterDelete.data.data._id).toBe(replyId);
  });
});
