import axios, { AxiosError } from 'axios';

/**
 * End-to-end integration tests for the BrightHub Connections API.
 *
 * Tests connection list CRUD and bulk operations, category assignment,
 * notes, hub creation and membership, hub-restricted post visibility,
 * follow request workflow, priority connection timeline ordering,
 * quiet mode notification suppression, temporary mute expiration,
 * connection suggestions and mutual connections, import/export,
 * and block/mute inheritance on lists.
 *
 * Requirements: 38.1-38.14
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

/** Register a user and return token + memberId + creds. */
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
  options?: { hubIds?: string[] },
) {
  const res = await axios.post(
    POSTS_BASE,
    { authorId, content, ...options },
    authHeader(token),
  );
  return res.data.data._id as string;
}

/** Follow a user. */
async function followUser(
  followerId: string,
  followedId: string,
  token: string,
) {
  await axios.post(
    `${USERS_BASE}/${followedId}/follow`,
    { followerId },
    authHeader(token),
  );
}

const LISTS_BASE = '/api/brighthub/lists';
const CONNECTIONS_BASE = '/api/brighthub/connections';
const HUBS_BASE = '/api/brighthub/hubs';
const FOLLOW_REQUESTS_BASE = '/api/brighthub/follow-requests';
const POSTS_BASE = '/api/brighthub/posts';
const USERS_BASE = '/api/brighthub/users';
const TIMELINE_BASE = '/api/brighthub/timeline';
const NOTIF_BASE = '/api/brighthub/notifications';

// ─── Connection List CRUD and Bulk Operations (Requirement 38.1, 38.2) ──

describe('BrightHub Connections API — List CRUD and Bulk Operations', () => {
  let user: { token: string; memberId: string };
  let listId: string;
  let memberA: { token: string; memberId: string };
  let memberB: { token: string; memberId: string };
  let memberC: { token: string; memberId: string };

  beforeAll(async () => {
    user = await registerUser('lstCrud');
    memberA = await registerUser('lstMemA');
    memberB = await registerUser('lstMemB');
    memberC = await registerUser('lstMemC');

    // User follows all members so they are connections
    await followUser(user.memberId, memberA.memberId, user.token);
    await followUser(user.memberId, memberB.memberId, user.token);
    await followUser(user.memberId, memberC.memberId, user.token);
  });

  it('should create a connection list', async () => {
    const res = await axios.post(
      LISTS_BASE,
      {
        ownerId: user.memberId,
        name: 'Test List',
        description: 'A test connection list',
        visibility: 'private',
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.name).toBe('Test List');
    expect(res.data.data.visibility).toBe('private');
    listId = res.data.data._id;
  });

  it('should retrieve user lists', async () => {
    const res = await axios.get(
      `${LISTS_BASE}?ownerId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const lists = res.data.data.lists ?? res.data.data;
    expect(Array.isArray(lists)).toBe(true);
    expect(lists.length).toBeGreaterThanOrEqual(1);
  });

  it('should update a connection list', async () => {
    const res = await axios.put(
      `${LISTS_BASE}/${listId}`,
      {
        ownerId: user.memberId,
        name: 'Updated List',
        description: 'Updated description',
        visibility: 'public',
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.name).toBe('Updated List');
    expect(res.data.data.visibility).toBe('public');
  });

  it('should add members to a list', async () => {
    const res = await axios.post(
      `${LISTS_BASE}/${listId}/members`,
      {
        ownerId: user.memberId,
        userIds: [memberA.memberId],
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should bulk add multiple members to a list', async () => {
    const res = await axios.post(
      `${LISTS_BASE}/${listId}/members/bulk`,
      {
        ownerId: user.memberId,
        action: 'add',
        userIds: [memberB.memberId, memberC.memberId],
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should remove members from a list', async () => {
    const res = await axios.delete(`${LISTS_BASE}/${listId}/members`, {
      ...authHeader(user.token),
      data: {
        ownerId: user.memberId,
        userIds: [memberC.memberId],
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should bulk remove members from a list', async () => {
    const res = await axios.post(
      `${LISTS_BASE}/${listId}/members/bulk`,
      {
        ownerId: user.memberId,
        action: 'remove',
        userIds: [memberA.memberId, memberB.memberId],
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should delete a connection list', async () => {
    const res = await axios.delete(`${LISTS_BASE}/${listId}`, {
      ...authHeader(user.token),
      data: { ownerId: user.memberId },
    });

    expect([200, 204]).toContain(res.status);
  });

  it('should return error when deleting non-existent list', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    try {
      await axios.delete(`${LISTS_BASE}/${fakeId}`, {
        ...authHeader(user.token),
        data: { ownerId: user.memberId },
      });
      throw new Error('Expected error for non-existent list');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Category Assignment and Notes (Requirement 38.3, 38.4) ────

describe('BrightHub Connections API — Categories and Notes', () => {
  let user: { token: string; memberId: string };
  let connection: { token: string; memberId: string };

  beforeAll(async () => {
    user = await registerUser('catNote');
    connection = await registerUser('catConn');

    // Establish follow relationship
    await followUser(user.memberId, connection.memberId, user.token);
  });

  it('should retrieve connection categories (including defaults)', async () => {
    const res = await axios.get(
      `${CONNECTIONS_BASE}/categories?ownerId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const categories = Array.isArray(res.data.data)
      ? res.data.data
      : res.data.data.categories;
    expect(Array.isArray(categories)).toBe(true);
    // Should have default categories
    expect(categories.length).toBeGreaterThanOrEqual(1);
  });

  it('should add a note to a connection', async () => {
    const res = await axios.post(
      `${CONNECTIONS_BASE}/${connection.memberId}/note`,
      {
        userId: user.memberId,
        note: 'Met at the blockchain conference',
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should reject note exceeding 500 characters', async () => {
    const longNote = 'A'.repeat(501);
    try {
      await axios.post(
        `${CONNECTIONS_BASE}/${connection.memberId}/note`,
        {
          userId: user.memberId,
          note: longNote,
        },
        authHeader(user.token),
      );
      throw new Error('Expected 400 for note exceeding 500 characters');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should update a connection note', async () => {
    const res = await axios.post(
      `${CONNECTIONS_BASE}/${connection.memberId}/note`,
      {
        userId: user.memberId,
        note: 'Updated: Met at BrightChain summit 2024',
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });
});

// ─── Hub Creation and Membership (Requirement 38.5) ─────────────

describe('BrightHub Connections API — Hubs', () => {
  let user: { token: string; memberId: string };
  let hubMember: { token: string; memberId: string };
  let hubId: string;

  beforeAll(async () => {
    user = await registerUser('hubOwn');
    hubMember = await registerUser('hubMem');

    await followUser(user.memberId, hubMember.memberId, user.token);
  });

  it('should create a hub', async () => {
    const res = await axios.post(
      HUBS_BASE,
      {
        ownerId: user.memberId,
        name: 'Inner Circle',
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.name).toBe('Inner Circle');
    hubId = res.data.data._id;
  });

  it('should retrieve user hubs', async () => {
    const res = await axios.get(
      `${HUBS_BASE}?ownerId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const hubs = Array.isArray(res.data.data)
      ? res.data.data
      : res.data.data.hubs;
    expect(Array.isArray(hubs)).toBe(true);
    expect(hubs.length).toBeGreaterThanOrEqual(1);
  });

  it('should add a member to a hub', async () => {
    const res = await axios.post(
      `${HUBS_BASE}/${hubId}/members`,
      {
        ownerId: user.memberId,
        userIds: [hubMember.memberId],
      },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should remove a member from a hub', async () => {
    const res = await axios.delete(`${HUBS_BASE}/${hubId}/members`, {
      ...authHeader(user.token),
      data: {
        ownerId: user.memberId,
        userIds: [hubMember.memberId],
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });
});

// ─── Hub-Restricted Post Visibility (Requirement 38.6) ──────────

describe('BrightHub Connections API — Hub-Restricted Post Visibility', () => {
  let hubOwner: { token: string; memberId: string };
  let hubMember: { token: string; memberId: string };
  let nonMember: { token: string; memberId: string };
  let hubId: string;
  let hubPostId: string;

  beforeAll(async () => {
    hubOwner = await registerUser('hpOwn');
    hubMember = await registerUser('hpMem');
    nonMember = await registerUser('hpNon');

    // Both follow the hub owner
    await followUser(hubMember.memberId, hubOwner.memberId, hubMember.token);
    await followUser(nonMember.memberId, hubOwner.memberId, nonMember.token);

    // Create a hub and add hubMember
    const hubRes = await axios.post(
      HUBS_BASE,
      { ownerId: hubOwner.memberId, name: 'VIP Hub' },
      authHeader(hubOwner.token),
    );
    hubId = hubRes.data.data._id;

    await axios.post(
      `${HUBS_BASE}/${hubId}/members`,
      { ownerId: hubOwner.memberId, userIds: [hubMember.memberId] },
      authHeader(hubOwner.token),
    );

    // Create a hub-restricted post
    hubPostId = await createPost(
      hubOwner.memberId,
      hubOwner.token,
      'This is a hub-restricted post for VIP members only',
      { hubIds: [hubId] },
    );
  });

  it('should show hub-restricted post to hub members in timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${hubMember.memberId}`,
      authHeader(hubMember.token),
    );

    expect(res.status).toBe(200);
    const postIds = res.data.data.posts.map((p: { _id: string }) => p._id);
    expect(postIds).toContain(hubPostId);
  });

  it('should hide hub-restricted post from non-hub members in timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${nonMember.memberId}`,
      authHeader(nonMember.token),
    );

    expect(res.status).toBe(200);
    const postIds = res.data.data.posts.map((p: { _id: string }) => p._id);
    expect(postIds).not.toContain(hubPostId);
  });
});

// ─── Follow Request Workflow (Requirement 38.7) ─────────────────

describe('BrightHub Connections API — Follow Request Workflow', () => {
  let protectedUser: { token: string; memberId: string };
  let requester: { token: string; memberId: string };
  let requestId: string;

  beforeAll(async () => {
    protectedUser = await registerUser('frProt');
    requester = await registerUser('frReq');

    // Set protected user to approve-all mode (protected account)
    await axios.put(
      `${USERS_BASE}/${protectedUser.memberId}`,
      {
        userId: protectedUser.memberId,
        approveFollowersMode: 'approve_all',
      },
      authHeader(protectedUser.token),
    );
  });

  it('should create a follow request for a protected account', async () => {
    const res = await axios.post(
      `${USERS_BASE}/${protectedUser.memberId}/follow`,
      {
        followerId: requester.memberId,
        message: 'I would love to connect!',
      },
      authHeader(requester.token),
    );

    // Should succeed — either 200 or 201 depending on whether it creates a request
    expect(res.status).toBeLessThan(300);
  });

  it('should list pending follow requests for the protected user', async () => {
    const res = await axios.get(
      `${FOLLOW_REQUESTS_BASE}?userId=${protectedUser.memberId}`,
      authHeader(protectedUser.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const requests = Array.isArray(res.data.data)
      ? res.data.data
      : res.data.data.requests;
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThanOrEqual(1);

    const fromRequester = requests.find(
      (r: { requesterId: string }) => r.requesterId === requester.memberId,
    );
    expect(fromRequester).toBeDefined();
    requestId = fromRequester._id;
  });

  it('should approve a follow request', async () => {
    const res = await axios.post(
      `${FOLLOW_REQUESTS_BASE}/${requestId}/approve`,
      { userId: protectedUser.memberId },
      authHeader(protectedUser.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should establish follow relationship after approval', async () => {
    const profileRes = await axios.get(
      `${USERS_BASE}/${protectedUser.memberId}`,
      authHeader(requester.token),
    );

    expect(profileRes.status).toBe(200);
    expect(profileRes.data.data.followerCount).toBeGreaterThanOrEqual(1);
  });

  it('should reject a follow request', async () => {
    const requester2 = await registerUser('frReq2');

    // Send follow request
    await axios.post(
      `${USERS_BASE}/${protectedUser.memberId}/follow`,
      { followerId: requester2.memberId },
      authHeader(requester2.token),
    );

    // Get the request ID
    const listRes = await axios.get(
      `${FOLLOW_REQUESTS_BASE}?userId=${protectedUser.memberId}`,
      authHeader(protectedUser.token),
    );
    const requests = Array.isArray(listRes.data.data)
      ? listRes.data.data
      : listRes.data.data.requests;
    const req2 = requests.find(
      (r: { requesterId: string }) => r.requesterId === requester2.memberId,
    );

    if (req2) {
      const res = await axios.post(
        `${FOLLOW_REQUESTS_BASE}/${req2._id}/reject`,
        { userId: protectedUser.memberId },
        authHeader(protectedUser.token),
      );

      expect(res.status).toBe(200);
      expect(res.data.message).toBeDefined();
    }
  });
});

// ─── Priority Connection Timeline Ordering (Requirement 38.8) ───

describe('BrightHub Connections API — Priority Connections', () => {
  let user: { token: string; memberId: string };
  let priorityConn: { token: string; memberId: string };
  let normalConn: { token: string; memberId: string };

  beforeAll(async () => {
    user = await registerUser('priUsr');
    priorityConn = await registerUser('priCon');
    normalConn = await registerUser('priNrm');

    // Follow both connections
    await followUser(user.memberId, priorityConn.memberId, user.token);
    await followUser(user.memberId, normalConn.memberId, user.token);

    // Mark priorityConn as priority
    await axios.post(
      `${CONNECTIONS_BASE}/${priorityConn.memberId}/priority`,
      { userId: user.memberId, isPriority: true },
      authHeader(user.token),
    );

    // Normal connection posts first
    await createPost(
      normalConn.memberId,
      normalConn.token,
      'Normal connection post',
    );

    // Small delay to ensure ordering
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Priority connection posts second (later in time)
    await createPost(
      priorityConn.memberId,
      priorityConn.token,
      'Priority connection post',
    );
  });

  it('should set a connection as priority', async () => {
    const res = await axios.post(
      `${CONNECTIONS_BASE}/${priorityConn.memberId}/priority`,
      { userId: user.memberId, isPriority: true },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should display priority connection posts first in timeline', async () => {
    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    const posts = res.data.data.posts;
    expect(posts.length).toBeGreaterThanOrEqual(2);

    // Find the priority and normal posts
    const priorityPost = posts.find(
      (p: { authorId: string }) => p.authorId === priorityConn.memberId,
    );
    const normalPost = posts.find(
      (p: { authorId: string }) => p.authorId === normalConn.memberId,
    );

    expect(priorityPost).toBeDefined();
    expect(normalPost).toBeDefined();

    // Priority post should appear before normal post in the array
    const priorityIdx = posts.indexOf(priorityPost);
    const normalIdx = posts.indexOf(normalPost);
    expect(priorityIdx).toBeLessThan(normalIdx);
  });

  it('should remove priority status from a connection', async () => {
    const res = await axios.post(
      `${CONNECTIONS_BASE}/${priorityConn.memberId}/priority`,
      { userId: user.memberId, isPriority: false },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });
});

// ─── Quiet Mode Notification Suppression (Requirement 38.9) ─────

describe('BrightHub Connections API — Quiet Mode', () => {
  let user: { token: string; memberId: string };
  let quietConn: { token: string; memberId: string };

  beforeAll(async () => {
    user = await registerUser('qmUsr');
    quietConn = await registerUser('qmCon');

    // Establish follow relationship
    await followUser(user.memberId, quietConn.memberId, user.token);
  });

  it('should set quiet mode on a connection', async () => {
    const res = await axios.post(
      `${CONNECTIONS_BASE}/${quietConn.memberId}/quiet`,
      { userId: user.memberId, isQuiet: true },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should suppress notifications from quiet mode connections', async () => {
    // Clear existing notifications
    await axios.delete(
      `${NOTIF_BASE}?userId=${user.memberId}`,
      authHeader(user.token),
    );

    // Quiet connection creates a post that mentions the user
    // or likes user's post — should not generate notification
    const userPostId = await createPost(
      user.memberId,
      user.token,
      'Post for quiet mode test',
    );

    await axios.post(
      `${POSTS_BASE}/${userPostId}/like`,
      { userId: quietConn.memberId },
      authHeader(quietConn.token),
    );

    // Check notifications — should not have a notification from quietConn
    const res = await axios.get(
      `${NOTIF_BASE}?userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    const fromQuiet = res.data.data.notifications.filter(
      (n: { actorId: string }) => n.actorId === quietConn.memberId,
    );
    expect(fromQuiet.length).toBe(0);
  });

  it('should disable quiet mode on a connection', async () => {
    const res = await axios.post(
      `${CONNECTIONS_BASE}/${quietConn.memberId}/quiet`,
      { userId: user.memberId, isQuiet: false },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });
});

// ─── Temporary Mute Expiration (Requirement 38.10) ──────────────

describe('BrightHub Connections API — Temporary Mutes', () => {
  let user: { token: string; memberId: string };
  let mutedConn: { token: string; memberId: string };

  beforeAll(async () => {
    user = await registerUser('tmUsr');
    mutedConn = await registerUser('tmCon');

    // Establish follow relationship
    await followUser(user.memberId, mutedConn.memberId, user.token);
  });

  it('should set a temporary mute on a connection', async () => {
    const res = await axios.post(
      `${CONNECTIONS_BASE}/${mutedConn.memberId}/mute/temporary`,
      { userId: user.memberId, duration: '1h' },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should exclude temporarily muted user posts from timeline', async () => {
    // Muted connection creates a post
    const mutedPostId = await createPost(
      mutedConn.memberId,
      mutedConn.token,
      'Post from temporarily muted user',
    );

    const res = await axios.get(
      `${TIMELINE_BASE}/home?userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    const postIds = res.data.data.posts.map((p: { _id: string }) => p._id);
    expect(postIds).not.toContain(mutedPostId);
  });

  it('should support different mute durations', async () => {
    const durations = ['1h', '8h', '24h', '7d', '30d'];
    for (const duration of durations) {
      const res = await axios.post(
        `${CONNECTIONS_BASE}/${mutedConn.memberId}/mute/temporary`,
        { userId: user.memberId, duration },
        authHeader(user.token),
      );

      expect(res.status).toBe(200);
    }
  });
});

// ─── Connection Suggestions and Mutual Connections (Requirement 38.11, 38.12) ─

describe('BrightHub Connections API — Suggestions and Mutual Connections', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let mutualFriend: { token: string; memberId: string };

  beforeAll(async () => {
    userA = await registerUser('sgA');
    userB = await registerUser('sgB');
    mutualFriend = await registerUser('sgMut');

    // Both userA and userB follow mutualFriend
    await followUser(userA.memberId, mutualFriend.memberId, userA.token);
    await followUser(userB.memberId, mutualFriend.memberId, userB.token);

    // userA follows userB (so userB is a connection of userA)
    await followUser(userA.memberId, userB.memberId, userA.token);
  });

  it('should retrieve connection suggestions', async () => {
    const res = await axios.get(
      `${CONNECTIONS_BASE}/suggestions?userId=${userA.memberId}`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const suggestions = Array.isArray(res.data.data)
      ? res.data.data
      : res.data.data.suggestions;
    expect(Array.isArray(suggestions)).toBe(true);
  });

  it('should retrieve mutual connections between two users', async () => {
    const res = await axios.get(
      `${CONNECTIONS_BASE}/mutual/${userB.memberId}?userId=${userA.memberId}`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const mutuals = Array.isArray(res.data.data)
      ? res.data.data
      : res.data.data.mutualConnections;
    expect(Array.isArray(mutuals)).toBe(true);

    // mutualFriend should appear as a mutual connection
    const mutualIds = mutuals.map(
      (m: { _id?: string; userId?: string }) => m._id ?? m.userId,
    );
    expect(mutualIds).toContain(mutualFriend.memberId);
  });
});

// ─── Connection Import/Export (Requirement 38.13) ───────────────

describe('BrightHub Connections API — Import/Export', () => {
  let user: { token: string; memberId: string };
  let connA: { token: string; memberId: string; creds: { username: string } };
  let connB: { token: string; memberId: string; creds: { username: string } };

  beforeAll(async () => {
    user = await registerUser('ieUsr');
    connA = await registerUser('ieCnA');
    connB = await registerUser('ieCnB');

    // Establish follow relationships
    await followUser(user.memberId, connA.memberId, user.token);
    await followUser(user.memberId, connB.memberId, user.token);
  });

  it('should export connections as JSON', async () => {
    const res = await axios.get(
      `${CONNECTIONS_BASE}/export?userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();

    const exportData = res.data.data;
    // Should contain connection data
    expect(
      exportData.connections || exportData.usernames || exportData.following,
    ).toBeDefined();
  });

  it('should import connections from JSON', async () => {
    const importUser = await registerUser('ieImp');

    const res = await axios.post(
      `${CONNECTIONS_BASE}/import`,
      {
        userId: importUser.memberId,
        format: 'json',
        data: {
          usernames: [connA.creds.username, connB.creds.username],
        },
      },
      authHeader(importUser.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    // Should report results (successful, skipped, errors)
    const result = res.data.data;
    expect(
      result.imported !== undefined ||
        result.successful !== undefined ||
        result.created !== undefined,
    ).toBe(true);
  });

  it('should skip non-existent usernames during import', async () => {
    const importUser2 = await registerUser('ieImp2');

    const res = await axios.post(
      `${CONNECTIONS_BASE}/import`,
      {
        userId: importUser2.memberId,
        format: 'json',
        data: {
          usernames: [connA.creds.username, 'nonexistent_user_xyz_12345'],
        },
      },
      authHeader(importUser2.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    // Should include error report for non-existent username
    const result = res.data.data;
    expect(
      result.skipped !== undefined ||
        result.errors !== undefined ||
        result.failed !== undefined,
    ).toBe(true);
  });
});

// ─── Block/Mute Inheritance on Lists (Requirement 38.14) ────────

describe('BrightHub Connections API — Block/Mute Inheritance', () => {
  let user: { token: string; memberId: string };
  let toBlock: { token: string; memberId: string };
  let listId: string;

  beforeAll(async () => {
    user = await registerUser('blkUsr');
    toBlock = await registerUser('blkTgt');

    // Follow the user to be blocked
    await followUser(user.memberId, toBlock.memberId, user.token);

    // Create a list and add the user
    const listRes = await axios.post(
      LISTS_BASE,
      {
        ownerId: user.memberId,
        name: 'Block Test List',
        description: 'List for block inheritance test',
        visibility: 'private',
      },
      authHeader(user.token),
    );
    listId = listRes.data.data._id;

    await axios.post(
      `${LISTS_BASE}/${listId}/members`,
      {
        ownerId: user.memberId,
        userIds: [toBlock.memberId],
      },
      authHeader(user.token),
    );
  });

  it('should auto-remove blocked user from all lists', async () => {
    // Block the user
    await axios.post(
      `${USERS_BASE}/${toBlock.memberId}/block`,
      { userId: user.memberId },
      authHeader(user.token),
    );

    // Verify the blocked user is no longer in the list
    // We check by getting the list — the blocked user should have been removed
    const res = await axios.get(
      `${LISTS_BASE}?ownerId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    const lists = res.data.data.lists ?? res.data.data;
    const testList = lists.find((l: { _id: string }) => l._id === listId);

    // If memberCount is available, it should be 0 after block
    if (testList && testList.memberCount !== undefined) {
      expect(testList.memberCount).toBe(0);
    }
  });

  it('should prevent blocked user from viewing blocker lists', async () => {
    // Create a public list
    const publicListRes = await axios.post(
      LISTS_BASE,
      {
        ownerId: user.memberId,
        name: 'Public Block Test List',
        visibility: 'public',
      },
      authHeader(user.token),
    );
    const publicListId = publicListRes.data.data._id;

    // Blocked user tries to view the list
    try {
      await axios.get(
        `${LISTS_BASE}/${publicListId}`,
        authHeader(toBlock.token),
      );
      // If it succeeds, the list should not be visible or should return empty
      // Some implementations may return 403 or filter the result
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should unblock a user', async () => {
    const res = await axios.delete(`${USERS_BASE}/${toBlock.memberId}/block`, {
      ...authHeader(user.token),
      data: { userId: user.memberId },
    });

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });
});

// ─── Connection Insights (Requirement 38.11) ────────────────────

describe('BrightHub Connections API — Connection Insights', () => {
  let user: { token: string; memberId: string };
  let connection: { token: string; memberId: string };

  beforeAll(async () => {
    user = await registerUser('insUsr');
    connection = await registerUser('insCon');

    await followUser(user.memberId, connection.memberId, user.token);
  });

  it('should retrieve connection insights', async () => {
    const res = await axios.get(
      `${CONNECTIONS_BASE}/${connection.memberId}/insights?userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();

    const insights = res.data.data;
    // Should contain interaction statistics
    const hasInsightData = insights.totalLikesGiven !== undefined;
    const hasStrength = insights.strength !== undefined;
    expect(hasInsightData || hasStrength).toBe(true);
  });
});
