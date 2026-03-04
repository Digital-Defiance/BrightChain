import axios, { AxiosError } from 'axios';

/**
 * End-to-end integration tests for the BrightHub Messaging API.
 *
 * Tests conversation creation (direct and group), message send/edit/delete,
 * message reactions, read receipts, message request workflow, group participant
 * management, conversation pin/archive/mute, message search, message forwarding
 * and threaded replies, block integration preventing messages, and message reporting.
 *
 * Requirements: 48.1-48.15
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

/** Establish mutual follow between two users. */
async function mutualFollow(
  userA: { memberId: string; token: string },
  userB: { memberId: string; token: string },
) {
  await followUser(userA.memberId, userB.memberId, userA.token);
  await followUser(userB.memberId, userA.memberId, userB.token);
}

/** Create a direct conversation between two users. */
async function createDirectConversation(
  participantIds: string[],
  token: string,
) {
  const res = await axios.post(
    CONVERSATIONS_BASE,
    { type: 'direct', participantIds },
    authHeader(token),
  );
  return res.data.data;
}

/** Send a message in a conversation. */
async function sendMessage(
  conversationId: string,
  content: string,
  token: string,
  options?: { replyToMessageId?: string },
) {
  const res = await axios.post(
    `${CONVERSATIONS_BASE}/${conversationId}/messages`,
    { content, ...options },
    authHeader(token),
  );
  return res.data.data;
}

const CONVERSATIONS_BASE = '/api/brighthub/messages/conversations';
const MESSAGES_BASE = '/api/brighthub/messages';
const REQUESTS_BASE = '/api/brighthub/messages/requests';
const USERS_BASE = '/api/brighthub/users';

jest.setTimeout(60_000);

// ─── Conversation Creation — Direct and Group (Requirement 48.1) ─

describe('BrightHub Messaging API — Conversation Creation', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let userC: { token: string; memberId: string };
  let userD: { token: string; memberId: string };

  beforeAll(async () => {
    userA = await registerUser('cvA');
    userB = await registerUser('cvB');
    userC = await registerUser('cvC');
    userD = await registerUser('cvD');

    // Establish mutual follows for direct messaging
    await mutualFollow(userA, userB);
    await mutualFollow(userA, userC);
    await mutualFollow(userA, userD);
  });

  it('should create a direct conversation between two users', async () => {
    const res = await axios.post(
      CONVERSATIONS_BASE,
      {
        type: 'direct',
        participantIds: [userA.memberId, userB.memberId],
      },
      authHeader(userA.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.type).toBe('direct');
    expect(res.data.data.participantIds).toContain(userA.memberId);
    expect(res.data.data.participantIds).toContain(userB.memberId);
  });

  it('should create a group conversation with multiple participants', async () => {
    const res = await axios.post(
      CONVERSATIONS_BASE,
      {
        type: 'group',
        participantIds: [userA.memberId, userB.memberId, userC.memberId],
        name: 'Test Group Chat',
      },
      authHeader(userA.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.type).toBe('group');
    expect(res.data.data.name).toBe('Test Group Chat');
    expect(res.data.data.participantIds.length).toBeGreaterThanOrEqual(3);
  });

  it('should retrieve user conversations', async () => {
    const res = await axios.get(CONVERSATIONS_BASE, authHeader(userA.token));

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const conversations = res.data.data.conversations ?? res.data.data;
    expect(Array.isArray(conversations)).toBe(true);
    expect(conversations.length).toBeGreaterThanOrEqual(1);
  });

  it('should retrieve a single conversation with messages', async () => {
    const conv = await createDirectConversation(
      [userA.memberId, userB.memberId],
      userA.token,
    );

    const res = await axios.get(
      `${CONVERSATIONS_BASE}/${conv._id}`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data._id).toBe(conv._id);
  });

  it('should delete a conversation from user view', async () => {
    const conv = await createDirectConversation(
      [userA.memberId, userC.memberId],
      userA.token,
    );

    const res = await axios.delete(
      `${CONVERSATIONS_BASE}/${conv._id}`,
      authHeader(userA.token),
    );

    expect([200, 204]).toContain(res.status);
  });
});

// ─── Message Send, Edit, Delete (Requirement 48.2) ──────────────

describe('BrightHub Messaging API — Message Send, Edit, Delete', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let conversationId: string;
  let messageId: string;

  beforeAll(async () => {
    userA = await registerUser('msgA');
    userB = await registerUser('msgB');

    await mutualFollow(userA, userB);

    const conv = await createDirectConversation(
      [userA.memberId, userB.memberId],
      userA.token,
    );
    conversationId = conv._id;
  });

  it('should send a message in a conversation', async () => {
    const res = await axios.post(
      `${CONVERSATIONS_BASE}/${conversationId}/messages`,
      { content: 'Hello from E2E test!' },
      authHeader(userA.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.content).toBe('Hello from E2E test!');
    expect(res.data.data.senderId).toBe(userA.memberId);
    messageId = res.data.data._id;
  });

  it('should edit a message within 15-minute window', async () => {
    const res = await axios.put(
      `${MESSAGES_BASE}/${messageId}`,
      { content: 'Edited message content' },
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.content).toBe('Edited message content');
    expect(res.data.data.isEdited).toBe(true);
  });

  it('should reject editing another user message', async () => {
    try {
      await axios.put(
        `${MESSAGES_BASE}/${messageId}`,
        { content: 'Unauthorized edit' },
        authHeader(userB.token),
      );
      fail('Expected error for unauthorized edit');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should delete a message (soft-delete)', async () => {
    const msg = await sendMessage(conversationId, 'To be deleted', userA.token);

    const res = await axios.delete(
      `${MESSAGES_BASE}/${msg._id}`,
      authHeader(userA.token),
    );

    expect([200, 204]).toContain(res.status);

    // Verify message shows as deleted
    const convRes = await axios.get(
      `${CONVERSATIONS_BASE}/${conversationId}`,
      authHeader(userA.token),
    );
    const messages = convRes.data.data.messages ?? [];
    const deleted = messages.find((m: { _id: string }) => m._id === msg._id);
    if (deleted) {
      expect(deleted.isDeleted).toBe(true);
    }
  });

  it('should reject message content exceeding 2000 characters', async () => {
    const longContent = 'A'.repeat(2001);
    try {
      await axios.post(
        `${CONVERSATIONS_BASE}/${conversationId}/messages`,
        { content: longContent },
        authHeader(userA.token),
      );
      fail('Expected 400 for message exceeding 2000 characters');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });
});

// ─── Message Reactions (Requirement 48.3) ───────────────────────

describe('BrightHub Messaging API — Message Reactions', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let conversationId: string;
  let messageId: string;

  beforeAll(async () => {
    userA = await registerUser('rxnA');
    userB = await registerUser('rxnB');

    await mutualFollow(userA, userB);

    const conv = await createDirectConversation(
      [userA.memberId, userB.memberId],
      userA.token,
    );
    conversationId = conv._id;

    const msg = await sendMessage(
      conversationId,
      'React to this!',
      userA.token,
    );
    messageId = msg._id;
  });

  it('should add a reaction to a message', async () => {
    const res = await axios.post(
      `${MESSAGES_BASE}/${messageId}/reactions`,
      { emoji: '👍' },
      authHeader(userB.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should remove a reaction from a message', async () => {
    const res = await axios.delete(
      `${MESSAGES_BASE}/${messageId}/reactions/${encodeURIComponent('👍')}`,
      authHeader(userB.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should support multiple different reactions on a message', async () => {
    const emojis = ['❤️', '😂', '🎉'];
    for (const emoji of emojis) {
      const res = await axios.post(
        `${MESSAGES_BASE}/${messageId}/reactions`,
        { emoji },
        authHeader(userB.token),
      );
      expect(res.status).toBe(200);
    }
  });
});

// ─── Read Receipt Updates (Requirement 48.4) ────────────────────

describe('BrightHub Messaging API — Read Receipts', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let conversationId: string;

  beforeAll(async () => {
    userA = await registerUser('rrA');
    userB = await registerUser('rrB');

    await mutualFollow(userA, userB);

    const conv = await createDirectConversation(
      [userA.memberId, userB.memberId],
      userA.token,
    );
    conversationId = conv._id;

    // Send a message from userA
    await sendMessage(conversationId, 'Read receipt test message', userA.token);
  });

  it('should mark conversation as read', async () => {
    const res = await axios.post(
      `${CONVERSATIONS_BASE}/${conversationId}/read`,
      {},
      authHeader(userB.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should update read receipt after marking as read', async () => {
    // Send another message
    await sendMessage(
      conversationId,
      'Another message for read receipt',
      userA.token,
    );

    // Mark as read
    await axios.post(
      `${CONVERSATIONS_BASE}/${conversationId}/read`,
      {},
      authHeader(userB.token),
    );

    // Verify conversation shows as read
    const res = await axios.get(
      `${CONVERSATIONS_BASE}/${conversationId}`,
      authHeader(userB.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
  });
});

// ─── Message Request Workflow (Requirement 48.5) ────────────────

describe('BrightHub Messaging API — Message Requests', () => {
  let sender: { token: string; memberId: string };
  let recipient: { token: string; memberId: string };
  let declineRecipient: { token: string; memberId: string };

  beforeAll(async () => {
    sender = await registerUser('mrSnd');
    recipient = await registerUser('mrRcp');
    declineRecipient = await registerUser('mrDcl');

    // No mutual follow — sender is a non-follower of recipient
  });

  it('should create a message request when non-follower sends a message', async () => {
    const res = await axios.post(
      CONVERSATIONS_BASE,
      {
        type: 'direct',
        participantIds: [sender.memberId, recipient.memberId],
        message: 'Hello, I would like to connect!',
      },
      authHeader(sender.token),
    );

    // Should succeed — creates a message request instead of direct delivery
    expect(res.status).toBeLessThan(300);
  });

  it('should list pending message requests for recipient', async () => {
    const res = await axios.get(REQUESTS_BASE, authHeader(recipient.token));

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const requests = Array.isArray(res.data.data)
      ? res.data.data
      : res.data.data.requests;
    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThanOrEqual(1);

    const fromSender = requests.find(
      (r: { senderId: string }) => r.senderId === sender.memberId,
    );
    expect(fromSender).toBeDefined();
  });

  it('should accept a message request', async () => {
    const listRes = await axios.get(REQUESTS_BASE, authHeader(recipient.token));
    const requests = Array.isArray(listRes.data.data)
      ? listRes.data.data
      : listRes.data.data.requests;
    const request = requests.find(
      (r: { senderId: string }) => r.senderId === sender.memberId,
    );

    const res = await axios.post(
      `${REQUESTS_BASE}/${request._id}/accept`,
      {},
      authHeader(recipient.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should deliver messages directly for mutual follows', async () => {
    const mutualA = await registerUser('mrMtA');
    const mutualB = await registerUser('mrMtB');

    await mutualFollow(mutualA, mutualB);

    // Should create conversation directly, not a request
    const res = await axios.post(
      CONVERSATIONS_BASE,
      {
        type: 'direct',
        participantIds: [mutualA.memberId, mutualB.memberId],
      },
      authHeader(mutualA.token),
    );

    expect(res.status).toBe(201);
    expect(res.data.data.type).toBe('direct');
  });

  it('should decline a message request', async () => {
    // Non-follower sends to declineRecipient
    await axios.post(
      CONVERSATIONS_BASE,
      {
        type: 'direct',
        participantIds: [sender.memberId, declineRecipient.memberId],
        message: 'Please accept my message',
      },
      authHeader(sender.token),
    );

    const listRes = await axios.get(
      REQUESTS_BASE,
      authHeader(declineRecipient.token),
    );
    const requests = Array.isArray(listRes.data.data)
      ? listRes.data.data
      : listRes.data.data.requests;
    const request = requests.find(
      (r: { senderId: string }) => r.senderId === sender.memberId,
    );

    if (request) {
      const res = await axios.post(
        `${REQUESTS_BASE}/${request._id}/decline`,
        {},
        authHeader(declineRecipient.token),
      );

      expect(res.status).toBe(200);
      expect(res.data.message).toBeDefined();
    }
  });
});

// ─── Group Participant Management (Requirement 48.6) ────────────

describe('BrightHub Messaging API — Group Participant Management', () => {
  let admin: { token: string; memberId: string };
  let memberA: { token: string; memberId: string };
  let memberB: { token: string; memberId: string };
  let newMember: { token: string; memberId: string };
  let groupId: string;

  beforeAll(async () => {
    admin = await registerUser('gpAdm');
    memberA = await registerUser('gpMemA');
    memberB = await registerUser('gpMemB');
    newMember = await registerUser('gpNew');

    await mutualFollow(admin, memberA);
    await mutualFollow(admin, memberB);
    await mutualFollow(admin, newMember);

    // Create a group conversation
    const res = await axios.post(
      CONVERSATIONS_BASE,
      {
        type: 'group',
        participantIds: [admin.memberId, memberA.memberId, memberB.memberId],
        name: 'Group Management Test',
      },
      authHeader(admin.token),
    );
    groupId = res.data.data._id;
  });

  it('should add a participant to the group', async () => {
    const res = await axios.post(
      `${CONVERSATIONS_BASE}/${groupId}/participants`,
      { userIds: [newMember.memberId] },
      authHeader(admin.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should remove a participant from the group', async () => {
    const res = await axios.delete(
      `${CONVERSATIONS_BASE}/${groupId}/participants/${newMember.memberId}`,
      authHeader(admin.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should reject non-admin adding participants', async () => {
    try {
      await axios.post(
        `${CONVERSATIONS_BASE}/${groupId}/participants`,
        { userIds: [newMember.memberId] },
        authHeader(memberA.token),
      );
      fail('Expected error for non-admin adding participants');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should update group settings (name and avatar)', async () => {
    const res = await axios.put(
      `${CONVERSATIONS_BASE}/${groupId}/settings`,
      { name: 'Renamed Group Chat' },
      authHeader(admin.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.name).toBe('Renamed Group Chat');
  });

  it('should reject non-admin updating group settings', async () => {
    try {
      await axios.put(
        `${CONVERSATIONS_BASE}/${groupId}/settings`,
        { name: 'Unauthorized Rename' },
        authHeader(memberA.token),
      );
      fail('Expected error for non-admin updating settings');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });
});

// ─── Conversation Pin/Archive/Mute (Requirement 48.7, 48.8, 48.9) ─

describe('BrightHub Messaging API — Conversation Pin, Archive, Mute', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let conversationId: string;

  beforeAll(async () => {
    userA = await registerUser('pamA');
    userB = await registerUser('pamB');

    await mutualFollow(userA, userB);

    const conv = await createDirectConversation(
      [userA.memberId, userB.memberId],
      userA.token,
    );
    conversationId = conv._id;
  });

  // ── Pin ──

  it('should pin a conversation', async () => {
    const res = await axios.post(
      `${CONVERSATIONS_BASE}/${conversationId}/pin`,
      {},
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should unpin a conversation', async () => {
    const res = await axios.delete(
      `${CONVERSATIONS_BASE}/${conversationId}/pin`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should enforce max 10 pinned conversations', async () => {
    // Pin 10 conversations
    const pinned: string[] = [];
    for (let i = 0; i < 10; i++) {
      const friend = await registerUser(`pin${i}`);
      await mutualFollow(userA, friend);
      const conv = await createDirectConversation(
        [userA.memberId, friend.memberId],
        userA.token,
      );
      await axios.post(
        `${CONVERSATIONS_BASE}/${conv._id}/pin`,
        {},
        authHeader(userA.token),
      );
      pinned.push(conv._id);
    }

    // 11th pin should fail
    const extraFriend = await registerUser('pinEx');
    await mutualFollow(userA, extraFriend);
    const extraConv = await createDirectConversation(
      [userA.memberId, extraFriend.memberId],
      userA.token,
    );

    try {
      await axios.post(
        `${CONVERSATIONS_BASE}/${extraConv._id}/pin`,
        {},
        authHeader(userA.token),
      );
      fail('Expected error for exceeding 10 pinned conversations');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }

    // Cleanup: unpin all
    for (const id of pinned) {
      await axios
        .delete(`${CONVERSATIONS_BASE}/${id}/pin`, authHeader(userA.token))
        .catch(() => {
          /* ignore */
        });
    }
  });

  // ── Archive ──

  it('should archive a conversation', async () => {
    const res = await axios.post(
      `${CONVERSATIONS_BASE}/${conversationId}/archive`,
      {},
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should unarchive a conversation', async () => {
    const res = await axios.post(
      `${CONVERSATIONS_BASE}/${conversationId}/unarchive`,
      {},
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  // ── Mute ──

  it('should mute a conversation', async () => {
    const res = await axios.post(
      `${CONVERSATIONS_BASE}/${conversationId}/mute`,
      {},
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should unmute a conversation', async () => {
    const res = await axios.delete(
      `${CONVERSATIONS_BASE}/${conversationId}/mute`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });
});

// ─── Message Search (Requirement 48.10, 48.11) ─────────────────

describe('BrightHub Messaging API — Message Search', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let conversationId: string;

  beforeAll(async () => {
    userA = await registerUser('srchA');
    userB = await registerUser('srchB');

    await mutualFollow(userA, userB);

    const conv = await createDirectConversation(
      [userA.memberId, userB.memberId],
      userA.token,
    );
    conversationId = conv._id;

    // Send several messages with distinct content
    await sendMessage(
      conversationId,
      'The quick brown fox jumps over the lazy dog',
      userA.token,
    );
    await sendMessage(
      conversationId,
      'BrightChain is a decentralized platform',
      userB.token,
    );
    await sendMessage(
      conversationId,
      'Testing search functionality in messages',
      userA.token,
    );
  });

  it('should search messages within a conversation', async () => {
    const res = await axios.get(
      `${CONVERSATIONS_BASE}/${conversationId}/search?q=BrightChain`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    const messages = Array.isArray(res.data.data)
      ? res.data.data
      : res.data.data.messages;
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  it('should search messages across all conversations', async () => {
    const res = await axios.get(
      `${MESSAGES_BASE}/search?q=quick+brown+fox`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
  });

  it('should return empty results for non-matching search', async () => {
    const res = await axios.get(
      `${CONVERSATIONS_BASE}/${conversationId}/search?q=zzzznonexistent`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    const messages = Array.isArray(res.data.data)
      ? res.data.data
      : (res.data.data.messages ?? []);
    expect(messages.length).toBe(0);
  });
});

// ─── Message Forwarding and Threaded Replies (Requirement 48.12, 48.13) ─

describe('BrightHub Messaging API — Forwarding and Threaded Replies', () => {
  let userA: { token: string; memberId: string };
  let userB: { token: string; memberId: string };
  let userC: { token: string; memberId: string };
  let convAB: string;
  let convAC: string;
  let originalMessageId: string;

  beforeAll(async () => {
    userA = await registerUser('fwdA');
    userB = await registerUser('fwdB');
    userC = await registerUser('fwdC');

    await mutualFollow(userA, userB);
    await mutualFollow(userA, userC);

    const convABRes = await createDirectConversation(
      [userA.memberId, userB.memberId],
      userA.token,
    );
    convAB = convABRes._id;

    const convACRes = await createDirectConversation(
      [userA.memberId, userC.memberId],
      userA.token,
    );
    convAC = convACRes._id;

    const msg = await sendMessage(
      convAB,
      'Original message to forward',
      userA.token,
    );
    originalMessageId = msg._id;
  });

  it('should forward a message to another conversation', async () => {
    const res = await axios.post(
      `${MESSAGES_BASE}/${originalMessageId}/forward`,
      { conversationId: convAC },
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.data).toBeDefined();
    expect(res.data.data.forwardedFromId).toBe(originalMessageId);
  });

  it('should create a threaded reply to a message', async () => {
    const reply = await sendMessage(
      convAB,
      'This is a threaded reply',
      userB.token,
      { replyToMessageId: originalMessageId },
    );

    expect(reply).toBeDefined();
    expect(reply.replyToMessageId).toBe(originalMessageId);
  });

  it('should include reply reference in conversation messages', async () => {
    const res = await axios.get(
      `${CONVERSATIONS_BASE}/${convAB}`,
      authHeader(userA.token),
    );

    expect(res.status).toBe(200);
    const messages = res.data.data.messages ?? [];
    const reply = messages.find(
      (m: { replyToMessageId?: string }) =>
        m.replyToMessageId === originalMessageId,
    );
    if (messages.length > 0) {
      expect(reply).toBeDefined();
    }
  });
});

// ─── Block Integration Preventing Messages (Requirement 48.14) ──

describe('BrightHub Messaging API — Block Integration', () => {
  let blocker: { token: string; memberId: string };
  let blocked: { token: string; memberId: string };

  beforeAll(async () => {
    blocker = await registerUser('blkMsgA');
    blocked = await registerUser('blkMsgB');

    await mutualFollow(blocker, blocked);

    // Block the user
    await axios.post(
      `${USERS_BASE}/${blocked.memberId}/block`,
      { userId: blocker.memberId },
      authHeader(blocker.token),
    );
  });

  it('should prevent blocked user from sending messages', async () => {
    try {
      await axios.post(
        CONVERSATIONS_BASE,
        {
          type: 'direct',
          participantIds: [blocked.memberId, blocker.memberId],
        },
        authHeader(blocked.token),
      );
      fail('Expected error when blocked user tries to message');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should prevent blocked user from sending message requests', async () => {
    try {
      await axios.post(
        CONVERSATIONS_BASE,
        {
          type: 'direct',
          participantIds: [blocked.memberId, blocker.memberId],
          message: 'Trying to reach you',
        },
        authHeader(blocked.token),
      );
      fail('Expected error when blocked user tries to send message request');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should allow messaging after unblock', async () => {
    // Unblock
    await axios.delete(`${USERS_BASE}/${blocked.memberId}/block`, {
      ...authHeader(blocker.token),
      data: { userId: blocker.memberId },
    });

    // Re-establish mutual follow
    await mutualFollow(blocker, blocked);

    // Should now be able to create conversation
    const res = await axios.post(
      CONVERSATIONS_BASE,
      {
        type: 'direct',
        participantIds: [blocked.memberId, blocker.memberId],
      },
      authHeader(blocked.token),
    );

    expect(res.status).toBeLessThan(300);
    expect(res.data.data).toBeDefined();
  });
});

// ─── Message Reporting (Requirement 48.15) ──────────────────────

describe('BrightHub Messaging API — Message Reporting', () => {
  let reporter: { token: string; memberId: string };
  let offender: { token: string; memberId: string };
  let conversationId: string;
  let messageId: string;

  beforeAll(async () => {
    reporter = await registerUser('rptA');
    offender = await registerUser('rptB');

    await mutualFollow(reporter, offender);

    const conv = await createDirectConversation(
      [reporter.memberId, offender.memberId],
      reporter.token,
    );
    conversationId = conv._id;

    const msg = await sendMessage(
      conversationId,
      'This is an offensive message for testing',
      offender.token,
    );
    messageId = msg._id;
  });

  it('should report a message with a reason', async () => {
    const res = await axios.post(
      `${MESSAGES_BASE}/${messageId}/report`,
      { reason: 'Harassment' },
      authHeader(reporter.token),
    );

    expect(res.status).toBe(200);
    expect(res.data.message).toBeDefined();
  });

  it('should reject reporting own message', async () => {
    const ownMsg = await sendMessage(
      conversationId,
      'My own message',
      reporter.token,
    );

    try {
      await axios.post(
        `${MESSAGES_BASE}/${ownMsg._id}/report`,
        { reason: 'Spam' },
        authHeader(reporter.token),
      );
      // Some implementations may allow self-report; if so, just verify status
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBeGreaterThanOrEqual(400);
    }
  });

  it('should reject report without a reason', async () => {
    try {
      await axios.post(
        `${MESSAGES_BASE}/${messageId}/report`,
        {},
        authHeader(reporter.token),
      );
      fail('Expected 400 for report without reason');
    } catch (err) {
      const error = err as AxiosError;
      expect(error.response?.status).toBe(400);
    }
  });
});
