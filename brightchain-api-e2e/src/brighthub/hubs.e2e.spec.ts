import axios, { AxiosError } from 'axios';

/**
 * End-to-end integration tests for the BrightHub Community Hubs API.
 *
 * Tests hub CRUD, join/leave, explore/discover, hub feed with sorting,
 * moderator management, hub settings, ban, and ownership transfer.
 *
 * Requirements: Hub community features
 */

// ─── Helpers ────────────────────────────────────────────────────

function uniqueUser(prefix: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return {
    username: `${prefix}_${id}`,
    email: `${prefix}_${id}@test.brighthub.local`,
    password: `BH7est!${id}`,
  };
}

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

function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

const HUBS_BASE = '/api/brighthub/hubs';
const POSTS_BASE = '/api/brighthub/posts';
const HUB_FEED_BASE = '/api/brighthub/hubs';

// ─── Hub CRUD ───────────────────────────────────────────────────

describe('BrightHub Hubs API — Hub CRUD', () => {
  let owner: { token: string; memberId: string };
  let hubId: string;
  let hubSlug: string;

  beforeAll(async () => {
    owner = await registerUser('hubOwner');
  });

  it('should create a hub with full fields', async () => {
    const slug = `test-hub-${Date.now()}`;
    const res = await axios.post(
      HUBS_BASE,
      {
        ownerId: owner.memberId,
        name: 'Test Programming Hub',
        slug,
        description: 'A hub for testing',
        rules: '1. Be nice\n2. No spam',
        trustTier: 'open',
      },
      authHeader(owner.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.name).toBe('Test Programming Hub');
    expect(res.data.data.slug).toBe(slug);
    expect(res.data.data.description).toBe('A hub for testing');
    expect(res.data.data.trustTier).toBe('open');
    expect(res.data.data.memberCount).toBe(1); // Owner auto-joined
    expect(res.data.data.moderatorIds).toContain(owner.memberId);
    hubId = res.data.data._id;
    hubSlug = slug;
  });

  it('should get hub detail by slug', async () => {
    const res = await axios.get(
      `${HUBS_BASE}/${hubSlug}?userId=${owner.memberId}`,
      authHeader(owner.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.hub).toBeDefined();
    expect(res.data.data.hub.name).toBe('Test Programming Hub');
    expect(res.data.data.isMember).toBe(true);
    expect(res.data.data.subHubs).toBeDefined();
  });

  it('should update hub settings', async () => {
    const res = await axios.put(
      `${HUBS_BASE}/${hubId}`,
      {
        userId: owner.memberId,
        description: 'Updated description',
        rules: 'Updated rules',
      },
      authHeader(owner.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.description).toBe('Updated description');
  });

  it('should return 404 for non-existent hub', async () => {
    try {
      await axios.get(
        `${HUBS_BASE}/nonexistent-slug-12345`,
        authHeader(owner.token),
      );
      throw new Error('Expected 404');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(404);
    }
  });
});

// ─── Hub Join/Leave ─────────────────────────────────────────────

describe('BrightHub Hubs API — Join/Leave', () => {
  let owner: { token: string; memberId: string };
  let joiner: { token: string; memberId: string };
  let hubId: string;
  let hubSlug: string;

  beforeAll(async () => {
    owner = await registerUser('joinOwner');
    joiner = await registerUser('joinUser');

    const slug = `join-hub-${Date.now()}`;
    const res = await axios.post(
      HUBS_BASE,
      { ownerId: owner.memberId, name: 'Join Test Hub', slug, trustTier: 'open' },
      authHeader(owner.token),
    );
    hubId = res.data.data._id;
    hubSlug = slug;
  });

  it('should allow a user to join an open hub', async () => {
    const res = await axios.post(
      `${HUBS_BASE}/${hubSlug}/join`,
      { userId: joiner.memberId },
      authHeader(joiner.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toContain('Joined');
  });

  it('should show the user as a member after joining', async () => {
    const res = await axios.get(
      `${HUBS_BASE}/${hubSlug}?userId=${joiner.memberId}`,
      authHeader(joiner.token),
    );

    expect(res.data.data.isMember).toBe(true);
    expect(res.data.data.hub.memberCount).toBeGreaterThanOrEqual(2);
  });

  it('should reject duplicate join', async () => {
    try {
      await axios.post(
        `${HUBS_BASE}/${hubSlug}/join`,
        { userId: joiner.memberId },
        authHeader(joiner.token),
      );
      throw new Error('Expected 400');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });

  it('should allow a user to leave a hub', async () => {
    const res = await axios.post(
      `${HUBS_BASE}/${hubSlug}/leave`,
      { userId: joiner.memberId },
      authHeader(joiner.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toContain('Left');
  });

  it('should prevent the owner from leaving', async () => {
    try {
      await axios.post(
        `${HUBS_BASE}/${hubSlug}/leave`,
        { userId: owner.memberId },
        authHeader(owner.token),
      );
      throw new Error('Expected 403');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(403);
    }
  });
});

// ─── Hub Explore ────────────────────────────────────────────────

describe('BrightHub Hubs API — Explore', () => {
  let user: { token: string; memberId: string };

  beforeAll(async () => {
    user = await registerUser('exploreUser');
    // Create a few hubs to explore
    for (let i = 0; i < 3; i++) {
      await axios.post(
        HUBS_BASE,
        {
          ownerId: user.memberId,
          name: `Explore Hub ${i}`,
          slug: `explore-hub-${i}-${Date.now()}`,
          description: `Hub number ${i}`,
          trustTier: 'open',
        },
        authHeader(user.token),
      );
    }
  });

  it('should return hubs sorted by trending (member count)', async () => {
    const res = await axios.get(
      `${HUBS_BASE}/explore?sort=trending&userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.hubs).toBeDefined();
    expect(res.data.data.hubs.length).toBeGreaterThanOrEqual(3);
  });

  it('should return hubs sorted by new', async () => {
    const res = await axios.get(
      `${HUBS_BASE}/explore?sort=new&userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.hubs.length).toBeGreaterThanOrEqual(3);
  });

  it('should filter hubs by search query', async () => {
    const res = await axios.get(
      `${HUBS_BASE}/explore?q=Explore+Hub+0&userId=${user.memberId}`,
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    const hubs = res.data.data.hubs;
    expect(hubs.length).toBeGreaterThanOrEqual(1);
    expect(hubs[0].name).toContain('Explore Hub 0');
  });
});

// ─── Hub Feed with Sorting ──────────────────────────────────────

describe('BrightHub Hubs API — Hub Feed', () => {
  let owner: { token: string; memberId: string };
  let hubId: string;

  beforeAll(async () => {
    owner = await registerUser('feedOwner');
    const slug = `feed-hub-${Date.now()}`;
    const hubRes = await axios.post(
      HUBS_BASE,
      { ownerId: owner.memberId, name: 'Feed Test Hub', slug, trustTier: 'open' },
      authHeader(owner.token),
    );
    hubId = hubRes.data.data._id;

    // Create posts in the hub
    for (let i = 0; i < 5; i++) {
      await axios.post(
        POSTS_BASE,
        {
          authorId: owner.memberId,
          content: `Hub post number ${i} with enough content to be valid`,
          hubIds: [hubId],
        },
        authHeader(owner.token),
      );
    }
  });

  it('should return posts in the hub sorted by new', async () => {
    const res = await axios.get(
      `${HUB_FEED_BASE}/${hubId}/posts?sort=new&userId=${owner.memberId}`,
      authHeader(owner.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.posts).toBeDefined();
    expect(res.data.data.posts.length).toBe(5);

    // Verify newest first
    for (let i = 1; i < res.data.data.posts.length; i++) {
      const prev = new Date(res.data.data.posts[i - 1].createdAt).getTime();
      const curr = new Date(res.data.data.posts[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('should accept hub posts exceeding 280 characters', async () => {
    const longContent = 'A'.repeat(500);
    const res = await axios.post(
      POSTS_BASE,
      {
        authorId: owner.memberId,
        content: longContent,
        hubIds: [hubId],
      },
      authHeader(owner.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data.content).toBe(longContent);
  });

  it('should still reject timeline posts exceeding 280 characters', async () => {
    const longContent = 'A'.repeat(281);
    try {
      await axios.post(
        POSTS_BASE,
        { authorId: owner.memberId, content: longContent },
        authHeader(owner.token),
      );
      throw new Error('Expected 400');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });
});

// ─── Moderator Management ───────────────────────────────────────

describe('BrightHub Hubs API — Moderators', () => {
  let owner: { token: string; memberId: string };
  let mod: { token: string; memberId: string };
  let hubId: string;
  let hubSlug: string;

  beforeAll(async () => {
    owner = await registerUser('modOwner');
    mod = await registerUser('modUser');

    const slug = `mod-hub-${Date.now()}`;
    const res = await axios.post(
      HUBS_BASE,
      { ownerId: owner.memberId, name: 'Mod Test Hub', slug, trustTier: 'open' },
      authHeader(owner.token),
    );
    hubId = res.data.data._id;
    hubSlug = slug;

    // Mod joins the hub
    await axios.post(
      `${HUBS_BASE}/${hubSlug}/join`,
      { userId: mod.memberId },
      authHeader(mod.token),
    );
  });

  it('should add a moderator', async () => {
    const res = await axios.post(
      `${HUBS_BASE}/${hubId}/moderators`,
      { ownerId: owner.memberId, userId: mod.memberId },
      authHeader(owner.token),
    );

    expect(res.status).toBe(200);
  });

  it('should remove a moderator', async () => {
    const res = await axios.delete(`${HUBS_BASE}/${hubId}/moderators`, {
      ...authHeader(owner.token),
      data: { ownerId: owner.memberId, userId: mod.memberId },
    });

    expect(res.status).toBe(200);
  });
});

// ─── Ban and Transfer ───────────────────────────────────────────

describe('BrightHub Hubs API — Ban and Transfer', () => {
  let owner: { token: string; memberId: string };
  let member: { token: string; memberId: string };
  let newOwner: { token: string; memberId: string };
  let hubId: string;
  let hubSlug: string;

  beforeAll(async () => {
    owner = await registerUser('banOwner');
    member = await registerUser('banMember');
    newOwner = await registerUser('newOwner');

    const slug = `ban-hub-${Date.now()}`;
    const res = await axios.post(
      HUBS_BASE,
      { ownerId: owner.memberId, name: 'Ban Test Hub', slug, trustTier: 'open' },
      authHeader(owner.token),
    );
    hubId = res.data.data._id;
    hubSlug = slug;

    // Members join
    await axios.post(
      `${HUBS_BASE}/${hubSlug}/join`,
      { userId: member.memberId },
      authHeader(member.token),
    );
    await axios.post(
      `${HUBS_BASE}/${hubSlug}/join`,
      { userId: newOwner.memberId },
      authHeader(newOwner.token),
    );
  });

  it('should ban a user from a hub', async () => {
    const res = await axios.post(
      `${HUBS_BASE}/${hubId}/ban`,
      { moderatorId: owner.memberId, userId: member.memberId },
      authHeader(owner.token),
    );

    expect(res.status).toBe(200);
  });

  it('should show banned user is no longer a member', async () => {
    const res = await axios.get(
      `${HUBS_BASE}/${hubSlug}?userId=${member.memberId}`,
      authHeader(member.token),
    );

    expect(res.data.data.isMember).toBe(false);
  });

  it('should transfer hub ownership', async () => {
    const res = await axios.post(
      `${HUBS_BASE}/${hubId}/transfer`,
      { ownerId: owner.memberId, newOwnerId: newOwner.memberId },
      authHeader(owner.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.ownerId).toBe(newOwner.memberId);
  });
});

// ─── Sub-hubs ───────────────────────────────────────────────────

describe('BrightHub Hubs API — Sub-hubs', () => {
  let owner: { token: string; memberId: string };
  let parentHubId: string;

  beforeAll(async () => {
    owner = await registerUser('subOwner');

    const parentRes = await axios.post(
      HUBS_BASE,
      {
        ownerId: owner.memberId,
        name: 'Parent Hub',
        slug: `parent-hub-${Date.now()}`,
        trustTier: 'open',
      },
      authHeader(owner.token),
    );
    parentHubId = parentRes.data.data._id;
  });

  it('should create a sub-hub', async () => {
    const res = await axios.post(
      HUBS_BASE,
      {
        ownerId: owner.memberId,
        name: 'Child Hub',
        slug: `child-hub-${Date.now()}`,
        parentHubId,
        trustTier: 'open',
      },
      authHeader(owner.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data.parentHubId).toBe(parentHubId);
  });

  it('should list sub-hubs of a parent', async () => {
    const res = await axios.get(
      `${HUBS_BASE}/${parentHubId}/sub-hubs`,
      authHeader(owner.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data.hubs.length).toBeGreaterThanOrEqual(1);
    expect(res.data.data.hubs[0].parentHubId).toBe(parentHubId);
  });

  it('should reject nesting deeper than one level', async () => {
    const childRes = await axios.post(
      HUBS_BASE,
      {
        ownerId: owner.memberId,
        name: 'Another Child',
        slug: `child2-${Date.now()}`,
        parentHubId,
        trustTier: 'open',
      },
      authHeader(owner.token),
    );
    const childId = childRes.data.data._id;

    try {
      await axios.post(
        HUBS_BASE,
        {
          ownerId: owner.memberId,
          name: 'Grandchild Hub',
          slug: `grandchild-${Date.now()}`,
          parentHubId: childId,
          trustTier: 'open',
        },
        authHeader(owner.token),
      );
      throw new Error('Expected 400 for nested sub-hub');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });
});

// ─── Voting ─────────────────────────────────────────────────────

describe('BrightHub Hubs API — Post Voting', () => {
  let user: { token: string; memberId: string };
  let postId: string;

  beforeAll(async () => {
    user = await registerUser('voteUser');

    const hubRes = await axios.post(
      HUBS_BASE,
      {
        ownerId: user.memberId,
        name: 'Vote Hub',
        slug: `vote-hub-${Date.now()}`,
        trustTier: 'open',
      },
      authHeader(user.token),
    );
    const hubId = hubRes.data.data._id;

    const postRes = await axios.post(
      POSTS_BASE,
      { authorId: user.memberId, content: 'Vote on this post', hubIds: [hubId] },
      authHeader(user.token),
    );
    postId = postRes.data.data._id;
  });

  it('should upvote a post', async () => {
    const res = await axios.post(
      `${POSTS_BASE}/${postId}/upvote`,
      { userId: user.memberId },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
  });

  it('should downvote a post', async () => {
    const res = await axios.post(
      `${POSTS_BASE}/${postId}/downvote`,
      { userId: user.memberId },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
  });

  it('should report a post', async () => {
    const res = await axios.post(
      `${POSTS_BASE}/${postId}/report`,
      { userId: user.memberId, reason: 'Spam' },
      authHeader(user.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toContain('reported');
  });
});
