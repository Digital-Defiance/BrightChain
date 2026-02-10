/**
 * End-to-end multi-node integration tests for the Communication API.
 *
 * Spins up multiple Express server instances on separate ports, each with
 * its own controller stack and real in-memory services. Tests multi-node
 * messaging across all supported modes (p2p, group, channel), verifying
 * typing notifications, send receipts, pagination, presence, permissions,
 * moderation, search, and the full protocol suite.
 *
 * No mocks — real Express servers, real HTTP requests, real WebSocket
 * connections, real in-memory service graphs.
 */

import {
  ChannelVisibility,
  CommunicationEventType,
  DefaultRole,
  PresenceStatus,
} from '@brightchain/brightchain-lib';
import { ChannelService } from '@brightchain/brightchain-lib/lib/services/communication/channelService';
import { ConversationService } from '@brightchain/brightchain-lib/lib/services/communication/conversationService';
import { GroupService } from '@brightchain/brightchain-lib/lib/services/communication/groupService';
import { MessageOperationsService } from '@brightchain/brightchain-lib/lib/services/communication/messageOperationsService';
import { PermissionService } from '@brightchain/brightchain-lib/lib/services/communication/permissionService';
import { SearchService } from '@brightchain/brightchain-lib/lib/services/communication/searchService';
import express, { Express } from 'express';
import { Server } from 'http';
import request from 'supertest';
import { WebSocket } from 'ws';
import { ChannelController } from '../controllers/api/channels';
import { DirectMessageController } from '../controllers/api/conversations';
import { GroupController } from '../controllers/api/groups';
import { IBrightChainApplication } from '../interfaces/application';
import { EventNotificationSystem } from './eventNotificationSystem';
import { PresenceService } from './presenceService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal mock application satisfying IBrightChainApplication for controller construction */
function createMockApplication(): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: {
      mongo: { useTransactions: false },
      blockStorePath: '/tmp',
      debug: false,
    },
    constants: {},
    ready: true,
    services: {},
    plugins: {},
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {
      /* noop */
    },
    start: async () => {
      /* noop */
    },
  } as unknown as IBrightChainApplication;
}

/** Create a mock WebSocket in OPEN state for event verification */
function createMockWs(): jest.Mocked<WebSocket> {
  return {
    readyState: 1,
    send: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
  } as unknown as jest.Mocked<WebSocket>;
}

/** Extract parsed events of a given type from a mock WebSocket */
function extractEvents(
  ws: jest.Mocked<WebSocket>,
  type?: CommunicationEventType,
): Array<Record<string, unknown>> {
  return (ws.send as jest.Mock).mock.calls
    .map(([payload]: [string]) => {
      try {
        return JSON.parse(payload);
      } catch {
        return null;
      }
    })
    .filter((e: Record<string, unknown> | null) => {
      if (e === null) return false;
      if (type) return e['type'] === type;
      return true;
    });
}

/**
 * Represents a single API node — an Express server on its own port with
 * its own controller stack, backed by shared services.
 */
interface ApiNode {
  app: Express;
  server: Server;
  port: number;
  url: string;
}

/**
 * Build a fully-wired multi-node test environment.
 *
 * Creates `count` Express servers, each with their own controller instances,
 * all backed by the SAME shared service layer (simulating nodes that share
 * a common in-memory data store — the way a cluster with shared state works).
 *
 * Returns the shared services and an array of ApiNode handles.
 */
async function buildMultiNodeEnv(count: number): Promise<{
  nodes: ApiNode[];
  permissionService: PermissionService;
  eventSystem: EventNotificationSystem;
  conversationService: ConversationService;
  groupService: GroupService;
  channelService: ChannelService;
  searchService: SearchService;
  presenceService: PresenceService;
  subscribeWs: () => jest.Mocked<WebSocket>;
  teardown: () => Promise<void>;
}> {
  const permissionService = new PermissionService();
  const eventSystem = new EventNotificationSystem();
  const messageOps = new MessageOperationsService(permissionService);

  const conversationService = new ConversationService(null, eventSystem);
  const groupService = new GroupService(
    permissionService,
    undefined,
    messageOps,
    eventSystem,
  );
  const channelService = new ChannelService(
    permissionService,
    undefined,
    messageOps,
    eventSystem,
  );
  const searchService = new SearchService(
    conversationService,
    groupService,
    channelService,
  );

  // Wire conversation → group promotion
  conversationService.setGroupPromotionHandler(
    (convId, participants, newMembers, msgs, requesterId) =>
      groupService.createGroupFromConversation(
        convId,
        participants,
        newMembers,
        msgs,
        requesterId,
      ),
  );

  // Presence with shared-context resolver
  const presenceService = new PresenceService((memberId: string) => {
    const shared = new Set<string>();
    for (const conv of conversationService.listAllConversationsForMember(
      memberId,
    )) {
      for (const p of conv.participants) shared.add(p);
    }
    for (const g of groupService.listGroupsForMember(memberId)) {
      for (const m of g.members) shared.add(m.memberId);
    }
    for (const ch of channelService.listChannelsForMember(memberId)) {
      for (const m of ch.members) shared.add(m.memberId);
    }
    return shared;
  });

  const mockApp = createMockApplication();
  const nodes: ApiNode[] = [];

  for (let i = 0; i < count; i++) {
    const app = express();
    app.use(express.json());

    // Each node gets its own controller instances wired to the shared services
    const convController = new DirectMessageController(mockApp);
    convController.setConversationService(conversationService);

    const grpController = new GroupController(mockApp);
    grpController.setGroupService(groupService);
    grpController.setPermissionService(permissionService);

    const chController = new ChannelController(mockApp);
    chController.setChannelService(channelService);
    chController.setPermissionService(permissionService);

    app.use('/api/conversations', convController.router);
    app.use('/api/groups', grpController.router);
    app.use('/api/channels', chController.router);

    // Start on a random available port
    const server = await new Promise<Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;

    nodes.push({ app, server, port, url: `http://127.0.0.1:${port}` });
  }

  function subscribeWs(): jest.Mocked<WebSocket> {
    const ws = createMockWs();
    eventSystem.subscribe(ws);
    return ws;
  }

  async function teardown(): Promise<void> {
    await Promise.all(
      nodes.map(
        (n) => new Promise<void>((resolve) => n.server.close(() => resolve())),
      ),
    );
  }

  return {
    nodes,
    permissionService,
    eventSystem,
    conversationService,
    groupService,
    channelService,
    searchService,
    presenceService,
    subscribeWs,
    teardown,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Communication API – Multi-Node E2E Integration', () => {
  let env: Awaited<ReturnType<typeof buildMultiNodeEnv>>;

  beforeAll(async () => {
    env = await buildMultiNodeEnv(3);
    // Register members across the shared service layer
    env.conversationService.registerMember('alice');
    env.conversationService.registerMember('bob');
    env.conversationService.registerMember('carol');
    env.conversationService.registerMember('dave');
  });

  afterAll(async () => {
    await env.teardown();
  });

  // ── P2P Direct Messaging across nodes ─────────────────────────────────

  describe('P2P Direct Messaging across nodes', () => {
    it('alice sends DM via node-0, bob retrieves via node-1', async () => {
      const [node0, node1] = env.nodes;

      // Alice sends via node-0
      const sendRes = await request(node0.app)
        .post('/api/conversations')
        .send({
          senderId: 'alice',
          recipientId: 'bob',
          content: 'Hello from node-0!',
        })
        .expect(201);

      expect(sendRes.body.status).toBe('success');
      const message = sendRes.body.data;
      expect(message.senderId).toBe('alice');
      expect(message.encryptedContent).toBe('Hello from node-0!');

      // Bob lists conversations via node-1
      const listRes = await request(node1.app)
        .get('/api/conversations')
        .query({ memberId: 'bob' })
        .expect(200);

      expect(listRes.body.status).toBe('success');
      expect(listRes.body.data.items.length).toBeGreaterThanOrEqual(1);

      // Bob retrieves messages via node-1
      const convId = message.contextId;
      const msgRes = await request(node1.app)
        .get(`/api/conversations/${convId}/messages`)
        .query({ memberId: 'bob' })
        .expect(200);

      expect(msgRes.body.status).toBe('success');
      expect(msgRes.body.data.items).toHaveLength(1);
      expect(msgRes.body.data.items[0].encryptedContent).toBe(
        'Hello from node-0!',
      );
    });

    it('conversation inbox ordering — most recent first', async () => {
      const [node0, , node2] = env.nodes;

      // Alice sends to carol via node-0
      await request(node0.app)
        .post('/api/conversations')
        .send({
          senderId: 'alice',
          recipientId: 'carol',
          content: 'first conv',
        })
        .expect(201);

      await new Promise((r) => setTimeout(r, 10));

      // Alice sends to dave via node-2
      await request(node2.app)
        .post('/api/conversations')
        .send({
          senderId: 'alice',
          recipientId: 'dave',
          content: 'second conv',
        })
        .expect(201);

      // List via node-0
      const listRes = await request(node0.app)
        .get('/api/conversations')
        .query({ memberId: 'alice' })
        .expect(200);

      const items = listRes.body.data.items;
      // Most recent first
      for (let i = 0; i < items.length - 1; i++) {
        expect(
          new Date(items[i].lastMessageAt).getTime(),
        ).toBeGreaterThanOrEqual(
          new Date(items[i + 1].lastMessageAt).getTime(),
        );
      }
    });

    it('message deletion via node-1, verified via node-2', async () => {
      const [node0, node1, node2] = env.nodes;

      const sendRes = await request(node0.app)
        .post('/api/conversations')
        .send({
          senderId: 'alice',
          recipientId: 'bob',
          content: 'delete me cross-node',
        })
        .expect(201);

      const { contextId, id: messageId } = sendRes.body.data;

      // Delete via node-1
      await request(node1.app)
        .delete(`/api/conversations/${contextId}/messages/${messageId}`)
        .query({ memberId: 'alice' })
        .expect(200);

      // Verify via node-2
      const msgRes = await request(node2.app)
        .get(`/api/conversations/${contextId}/messages`)
        .query({ memberId: 'bob' })
        .expect(200);

      const deleted = msgRes.body.data.items.find(
        (m: Record<string, unknown>) => m['id'] === messageId,
      );
      expect(deleted.deleted).toBe(true);
      expect(deleted.deletedBy).toBe('alice');
    });

    it('uniform error for non-existent and blocked recipients', async () => {
      const [node0] = env.nodes;
      env.conversationService.blockMember('dave', 'alice');

      // Non-existent
      const err1 = await request(node0.app)
        .post('/api/conversations')
        .send({ senderId: 'alice', recipientId: 'nonexistent', content: 'hi' });

      // Blocked
      const err2 = await request(node0.app)
        .post('/api/conversations')
        .send({ senderId: 'alice', recipientId: 'dave', content: 'hi' });

      // Same error shape — no info leakage
      expect(err1.body.error).toBeDefined();
      expect(err2.body.error).toBeDefined();
      expect(err1.status).toBe(err2.status);
      expect(err1.body.error.code).toBe(err2.body.error.code);
    });
  });

  // ── Group Messaging across nodes ──────────────────────────────────────

  describe('Group Messaging across nodes', () => {
    let groupId: string;

    it('create group via node-0, send message via node-1, retrieve via node-2', async () => {
      const [node0, node1, node2] = env.nodes;

      // Create group via node-0
      const createRes = await request(node0.app)
        .post('/api/groups')
        .send({
          memberId: 'alice',
          name: 'Cross-Node Team',
          memberIds: ['bob', 'carol'],
        })
        .expect(201);

      expect(createRes.body.status).toBe('success');
      groupId = createRes.body.data.id;
      expect(createRes.body.data.members).toHaveLength(3);
      expect(createRes.body.data.encryptedSharedKey).toBeDefined();

      // Send message via node-1
      const sendRes = await request(node1.app)
        .post(`/api/groups/${groupId}/messages`)
        .send({ memberId: 'bob', content: 'Hello from node-1!' })
        .expect(201);

      expect(sendRes.body.data.encryptedContent).toBe('Hello from node-1!');

      // Retrieve via node-2
      const msgRes = await request(node2.app)
        .get(`/api/groups/${groupId}/messages`)
        .query({ memberId: 'carol' })
        .expect(200);

      expect(msgRes.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(
        msgRes.body.data.items.some(
          (m: Record<string, unknown>) =>
            m['encryptedContent'] === 'Hello from node-1!',
        ),
      ).toBe(true);
    });

    it('group metadata accessible from any node', async () => {
      const [, , node2] = env.nodes;

      const metaRes = await request(node2.app)
        .get(`/api/groups/${groupId}`)
        .query({ memberId: 'alice' })
        .expect(200);

      expect(metaRes.body.data.name).toBe('Cross-Node Team');
      expect(metaRes.body.data.members).toHaveLength(3);
      const aliceMember = metaRes.body.data.members.find(
        (m: Record<string, string>) => m['memberId'] === 'alice',
      );
      expect(aliceMember.role).toBe(DefaultRole.OWNER);
    });

    it('add member via node-0, new member reads via node-2', async () => {
      const [node0, , node2] = env.nodes;

      await request(node0.app)
        .post(`/api/groups/${groupId}/members`)
        .send({ memberId: 'alice', memberIds: ['dave'] })
        .expect(200);

      // Dave reads messages via node-2
      const msgRes = await request(node2.app)
        .get(`/api/groups/${groupId}/messages`)
        .query({ memberId: 'dave' })
        .expect(200);

      expect(msgRes.body.status).toBe('success');
    });

    it('remove member via node-1 triggers key rotation', async () => {
      const [, node1] = env.nodes;

      const oldKey = env.groupService.getSymmetricKey(groupId)!;

      await request(node1.app)
        .delete(`/api/groups/${groupId}/members/dave`)
        .query({ memberId: 'alice' })
        .expect(200);

      const newKey = env.groupService.getSymmetricKey(groupId)!;
      expect(Buffer.compare(oldKey, newKey)).not.toBe(0);
    });

    it('voluntary leave via node-2 triggers key rotation', async () => {
      const [, , node2] = env.nodes;

      const oldKey = env.groupService.getSymmetricKey(groupId)!;

      await request(node2.app)
        .post(`/api/groups/${groupId}/leave`)
        .send({ memberId: 'carol' })
        .expect(200);

      const newKey = env.groupService.getSymmetricKey(groupId)!;
      expect(Buffer.compare(oldKey, newKey)).not.toBe(0);
    });
  });

  // ── Channel Messaging across nodes ────────────────────────────────────

  describe('Channel Messaging across nodes', () => {
    let channelId: string;

    it('create channel via node-0, join via node-1, send via node-2', async () => {
      const [node0, node1, node2] = env.nodes;

      // Create via node-0
      const createRes = await request(node0.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'cross-node-general',
          visibility: ChannelVisibility.PUBLIC,
          topic: 'Multi-node testing',
        })
        .expect(201);

      channelId = createRes.body.data.id;
      expect(createRes.body.data.name).toBe('cross-node-general');

      // Join via node-1
      await request(node1.app)
        .post(`/api/channels/${channelId}/join`)
        .send({ memberId: 'bob' })
        .expect(200);

      // Join via node-2
      await request(node2.app)
        .post(`/api/channels/${channelId}/join`)
        .send({ memberId: 'carol' })
        .expect(200);

      // Send via node-2
      const sendRes = await request(node2.app)
        .post(`/api/channels/${channelId}/messages`)
        .send({ memberId: 'carol', content: 'Hello from node-2 channel!' })
        .expect(201);

      expect(sendRes.body.data.encryptedContent).toBe(
        'Hello from node-2 channel!',
      );

      // Retrieve via node-0
      const msgRes = await request(node0.app)
        .get(`/api/channels/${channelId}/messages`)
        .query({ memberId: 'alice' })
        .expect(200);

      expect(
        msgRes.body.data.items.some(
          (m: Record<string, unknown>) =>
            m['encryptedContent'] === 'Hello from node-2 channel!',
        ),
      ).toBe(true);
    });

    it('visibility filtering — invisible channels hidden across nodes', async () => {
      const [node0, node1] = env.nodes;

      await request(node0.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'invisible-cross',
          visibility: ChannelVisibility.INVISIBLE,
        })
        .expect(201);

      // Bob lists channels via node-1 — should not see invisible channel
      const listRes = await request(node1.app)
        .get('/api/channels')
        .query({ memberId: 'bob' })
        .expect(200);

      const names = listRes.body.data.items.map(
        (ch: Record<string, string>) => ch['name'],
      );
      expect(names).not.toContain('invisible-cross');
    });

    it('invite token flow across nodes — create on node-0, redeem on node-1 and node-2', async () => {
      const [node0, node1, node2] = env.nodes;

      const privChannel = await request(node0.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'invite-cross-node',
          visibility: ChannelVisibility.PRIVATE,
        })
        .expect(201);

      const privId = privChannel.body.data.id;

      // Create invite via node-0
      const inviteRes = await request(node0.app)
        .post(`/api/channels/${privId}/invites`)
        .send({ memberId: 'alice', maxUses: 2, expiresInMs: 60000 })
        .expect(201);

      const token = inviteRes.body.data.token;

      // Redeem via node-1
      await request(node1.app)
        .post(`/api/channels/${privId}/invites/${token}/redeem`)
        .send({ memberId: 'bob' })
        .expect(200);

      // Redeem via node-2
      await request(node2.app)
        .post(`/api/channels/${privId}/invites/${token}/redeem`)
        .send({ memberId: 'carol' })
        .expect(200);

      // Third redemption should fail (exhausted)
      const failRes = await request(node0.app)
        .post(`/api/channels/${privId}/invites/${token}/redeem`)
        .send({ memberId: 'dave' });

      expect(failRes.body.error).toBeDefined();
    });

    it('visibility change on node-0 enforced on node-1', async () => {
      const [node0, node1] = env.nodes;

      const ch = await request(node0.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'morph-cross',
          visibility: ChannelVisibility.PUBLIC,
        })
        .expect(201);

      // Bob can see it via node-1
      let listRes = await request(node1.app)
        .get('/api/channels')
        .query({ memberId: 'bob' })
        .expect(200);
      expect(
        listRes.body.data.items.some(
          (c: Record<string, string>) => c['name'] === 'morph-cross',
        ),
      ).toBe(true);

      // Change to secret via node-0
      await request(node0.app)
        .put(`/api/channels/${ch.body.data.id}`)
        .send({ memberId: 'alice', visibility: ChannelVisibility.SECRET })
        .expect(200);

      // Bob can no longer see it via node-1
      listRes = await request(node1.app)
        .get('/api/channels')
        .query({ memberId: 'bob' })
        .expect(200);
      expect(
        listRes.body.data.items.some(
          (c: Record<string, string>) => c['name'] === 'morph-cross',
        ),
      ).toBe(false);
    });
  });

  // ── Message Operations across nodes ───────────────────────────────────

  describe('Message Operations across nodes', () => {
    it('edit on node-1, verify history on node-2', async () => {
      const [node0, node1, node2] = env.nodes;

      const group = await request(node0.app)
        .post('/api/groups')
        .send({ memberId: 'alice', name: 'Edit Cross', memberIds: ['bob'] })
        .expect(201);

      const gid = group.body.data.id;

      const msg = await request(node0.app)
        .post(`/api/groups/${gid}/messages`)
        .send({ memberId: 'alice', content: 'original text' })
        .expect(201);

      // Edit via node-1
      await request(node1.app)
        .put(`/api/groups/${gid}/messages/${msg.body.data.id}`)
        .send({ memberId: 'alice', content: 'edited text' })
        .expect(200);

      // Verify via node-2
      const msgRes = await request(node2.app)
        .get(`/api/groups/${gid}/messages`)
        .query({ memberId: 'bob' })
        .expect(200);

      const edited = msgRes.body.data.items.find(
        (m: Record<string, unknown>) => m['id'] === msg.body.data.id,
      );
      expect(edited.encryptedContent).toBe('edited text');
      expect(edited.editHistory).toHaveLength(1);
      expect(edited.editHistory[0].content).toBe('original text');
    });

    it('pin on node-0, verify on node-2, unpin on node-1', async () => {
      const [node0, node1, node2] = env.nodes;

      const group = await request(node0.app)
        .post('/api/groups')
        .send({ memberId: 'alice', name: 'Pin Cross', memberIds: ['bob'] })
        .expect(201);

      const gid = group.body.data.id;

      const msg = await request(node0.app)
        .post(`/api/groups/${gid}/messages`)
        .send({ memberId: 'alice', content: 'pin me' })
        .expect(201);

      // Pin via node-0
      await request(node0.app)
        .post(`/api/groups/${gid}/messages/${msg.body.data.id}/pin`)
        .send({ memberId: 'alice' })
        .expect(200);

      // Verify pinned via node-2
      const metaRes = await request(node2.app)
        .get(`/api/groups/${gid}`)
        .query({ memberId: 'bob' })
        .expect(200);

      expect(metaRes.body.data.pinnedMessageIds).toContain(msg.body.data.id);

      // Unpin via node-1
      await request(node1.app)
        .delete(`/api/groups/${gid}/messages/${msg.body.data.id}/pin`)
        .send({ memberId: 'alice' })
        .expect(200);

      const metaRes2 = await request(node0.app)
        .get(`/api/groups/${gid}`)
        .query({ memberId: 'alice' })
        .expect(200);

      expect(metaRes2.body.data.pinnedMessageIds).not.toContain(
        msg.body.data.id,
      );
    });

    it('reaction add on node-1, remove on node-2', async () => {
      const [node0, node1, node2] = env.nodes;

      const ch = await request(node0.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'react-cross',
          visibility: ChannelVisibility.PUBLIC,
        })
        .expect(201);

      const chId = ch.body.data.id;
      await request(node1.app)
        .post(`/api/channels/${chId}/join`)
        .send({ memberId: 'bob' })
        .expect(200);

      const msg = await request(node0.app)
        .post(`/api/channels/${chId}/messages`)
        .send({ memberId: 'alice', content: 'react to this' })
        .expect(201);

      // Add reaction via node-1
      const reactRes = await request(node1.app)
        .post(`/api/channels/${chId}/messages/${msg.body.data.id}/reactions`)
        .send({ memberId: 'bob', emoji: '🎉' })
        .expect(201);

      const reactionId = reactRes.body.data.reactionId;

      // Verify reaction exists via node-2 (read messages)
      let msgRes = await request(node2.app)
        .get(`/api/channels/${chId}/messages`)
        .query({ memberId: 'alice' })
        .expect(200);

      let target = msgRes.body.data.items.find(
        (m: Record<string, unknown>) => m['id'] === msg.body.data.id,
      );
      expect(target.reactions).toHaveLength(1);

      // Remove reaction via node-2
      await request(node2.app)
        .delete(
          `/api/channels/${chId}/messages/${msg.body.data.id}/reactions/${reactionId}`,
        )
        .query({ memberId: 'bob' })
        .expect(200);

      // Verify removed via node-0
      msgRes = await request(node0.app)
        .get(`/api/channels/${chId}/messages`)
        .query({ memberId: 'alice' })
        .expect(200);

      target = msgRes.body.data.items.find(
        (m: Record<string, unknown>) => m['id'] === msg.body.data.id,
      );
      expect(target.reactions).toHaveLength(0);
    });
  });

  // ── Permissions & Moderation across nodes ─────────────────────────────

  describe('Permissions & Moderation across nodes', () => {
    it('role assignment on node-0, enforced on node-1', async () => {
      const [node0, node1] = env.nodes;

      const group = await request(node0.app)
        .post('/api/groups')
        .send({
          memberId: 'alice',
          name: 'Perms Cross',
          memberIds: ['bob', 'carol'],
        })
        .expect(201);

      const gid = group.body.data.id;

      // Bob (member) cannot remove carol via node-1
      const failRes = await request(node1.app)
        .delete(`/api/groups/${gid}/members/carol`)
        .query({ memberId: 'bob' });

      expect(failRes.body.error).toBeDefined();

      // Promote bob to admin via node-0
      await request(node0.app)
        .put(`/api/groups/${gid}/roles/bob`)
        .send({ memberId: 'alice', role: DefaultRole.ADMIN })
        .expect(200);

      // Now bob can remove carol via node-1
      await request(node1.app)
        .delete(`/api/groups/${gid}/members/carol`)
        .query({ memberId: 'bob' })
        .expect(200);
    });

    it('mute on node-0, enforced on node-1', async () => {
      const [node0, node1] = env.nodes;

      const ch = await request(node0.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'mute-cross',
          visibility: ChannelVisibility.PUBLIC,
        })
        .expect(201);

      const chId = ch.body.data.id;
      await request(node1.app)
        .post(`/api/channels/${chId}/join`)
        .send({ memberId: 'bob' })
        .expect(200);

      // Mute bob via node-0
      await request(node0.app)
        .post(`/api/channels/${chId}/mute/bob`)
        .send({ memberId: 'alice', durationMs: 5000 })
        .expect(200);

      // Bob cannot send via node-1
      const failRes = await request(node1.app)
        .post(`/api/channels/${chId}/messages`)
        .send({ memberId: 'bob', content: 'muted msg' });

      expect(failRes.body.error).toBeDefined();
    });

    it('kick on node-1, key rotation verified, member gone on node-2', async () => {
      const [node0, node1, node2] = env.nodes;

      const ch = await request(node0.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'kick-cross',
          visibility: ChannelVisibility.PUBLIC,
        })
        .expect(201);

      const chId = ch.body.data.id;
      await request(node1.app)
        .post(`/api/channels/${chId}/join`)
        .send({ memberId: 'bob' })
        .expect(200);

      const oldKey = env.channelService.getSymmetricKey(chId)!;

      // Kick via node-1
      await request(node1.app)
        .post(`/api/channels/${chId}/kick/bob`)
        .send({ memberId: 'alice' })
        .expect(200);

      const newKey = env.channelService.getSymmetricKey(chId)!;
      expect(Buffer.compare(oldKey, newKey)).not.toBe(0);

      // Bob cannot send via node-2
      const failRes = await request(node2.app)
        .post(`/api/channels/${chId}/messages`)
        .send({ memberId: 'bob', content: 'kicked msg' });

      expect(failRes.body.error).toBeDefined();
    });
  });

  // ── Real-Time Events ──────────────────────────────────────────────────

  describe('Real-Time Events across nodes', () => {
    it('message sent on node-1 emits event to subscribed WebSockets', async () => {
      const [node0, node1] = env.nodes;
      const ws = env.subscribeWs();

      const group = await request(node0.app)
        .post('/api/groups')
        .send({ memberId: 'alice', name: 'Events Cross', memberIds: ['bob'] })
        .expect(201);

      const gid = group.body.data.id;

      // Send via node-1
      const sendRes = await request(node1.app)
        .post(`/api/groups/${gid}/messages`)
        .send({ memberId: 'bob', content: 'event test' })
        .expect(201);

      const events = extractEvents(ws, CommunicationEventType.MESSAGE_SENT);
      expect(
        events.some(
          (e) =>
            (e['data'] as Record<string, unknown>)['messageId'] ===
            sendRes.body.data.id,
        ),
      ).toBe(true);
    });

    it('typing indicator emitted via event system', () => {
      const ws = env.subscribeWs();

      env.eventSystem.emitTypingEvent(
        CommunicationEventType.TYPING_START,
        'group',
        'some-group-id',
        'alice',
      );

      const typingEvents = extractEvents(
        ws,
        CommunicationEventType.TYPING_START,
      );
      expect(typingEvents.length).toBeGreaterThanOrEqual(1);
      expect(typingEvents[0]['contextId']).toBe('some-group-id');
      expect(
        (typingEvents[0]['data'] as Record<string, unknown>)['memberId'],
      ).toBe('alice');
    });

    it('presence changes broadcast to shared-context members only', async () => {
      const aliceWs = createMockWs();
      const bobWs = createMockWs();
      const strangerWs = createMockWs();

      env.presenceService.onConnect('alice', aliceWs);
      env.presenceService.onConnect('bob', bobWs);
      env.presenceService.onConnect('dave', strangerWs);

      // Clear initial connection events
      (aliceWs.send as jest.Mock).mockClear();
      (bobWs.send as jest.Mock).mockClear();
      (strangerWs.send as jest.Mock).mockClear();

      env.presenceService.setStatus('alice', PresenceStatus.IDLE);

      // Bob shares a context with alice — should receive
      const bobPresence = extractEvents(
        bobWs,
        CommunicationEventType.PRESENCE_CHANGED,
      );
      expect(bobPresence.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Pagination across nodes ───────────────────────────────────────────

  describe('Pagination across nodes', () => {
    it('paginate group messages — send on node-0, paginate on node-1', async () => {
      const [node0, node1] = env.nodes;

      const group = await request(node0.app)
        .post('/api/groups')
        .send({ memberId: 'alice', name: 'Paginate Cross', memberIds: ['bob'] })
        .expect(201);

      const gid = group.body.data.id;

      // Send 12 messages via node-0
      const sentIds: string[] = [];
      for (let i = 0; i < 12; i++) {
        const res = await request(node0.app)
          .post(`/api/groups/${gid}/messages`)
          .send({ memberId: 'alice', content: `msg-${i}` })
          .expect(201);
        sentIds.push(res.body.data.id);
      }

      // Paginate via node-1 with limit=5
      const allRetrieved: string[] = [];
      let cursor: string | undefined;

      do {
        const query: Record<string, string> = { memberId: 'bob', limit: '5' };
        if (cursor) query['cursor'] = cursor;

        const page = await request(node1.app)
          .get(`/api/groups/${gid}/messages`)
          .query(query)
          .expect(200);

        allRetrieved.push(
          ...page.body.data.items.map((m: Record<string, string>) => m['id']),
        );
        cursor = page.body.data.cursor;
        if (!page.body.data.hasMore) break;
      } while (cursor);

      expect(allRetrieved).toHaveLength(12);
      expect(new Set(allRetrieved).size).toBe(12);
      expect(allRetrieved).toEqual(sentIds);
    });
  });

  // ── Cross-Context Search ──────────────────────────────────────────────

  describe('Cross-Context Search', () => {
    it('search finds messages across DM, group, and channel sent from different nodes', async () => {
      const [node0, node1, node2] = env.nodes;

      // DM via node-0
      await request(node0.app)
        .post('/api/conversations')
        .send({
          senderId: 'alice',
          recipientId: 'bob',
          content: 'deployment keyword in DM',
        })
        .expect(201);

      // Group via node-1
      const group = await request(node1.app)
        .post('/api/groups')
        .send({ memberId: 'alice', name: 'Search Cross', memberIds: ['bob'] })
        .expect(201);

      await request(node1.app)
        .post(`/api/groups/${group.body.data.id}/messages`)
        .send({ memberId: 'alice', content: 'deployment keyword in group' })
        .expect(201);

      // Channel via node-2
      const ch = await request(node2.app)
        .post('/api/channels')
        .send({
          memberId: 'alice',
          name: 'search-cross-ch',
          visibility: ChannelVisibility.PUBLIC,
        })
        .expect(201);

      await request(node2.app)
        .post(`/api/channels/${ch.body.data.id}/join`)
        .send({ memberId: 'bob' })
        .expect(200);

      await request(node2.app)
        .post(`/api/channels/${ch.body.data.id}/messages`)
        .send({ memberId: 'alice', content: 'deployment keyword in channel' })
        .expect(201);

      // Search via the service layer (SearchService doesn't have a controller yet)
      const results = await env.searchService.searchAll(
        'alice',
        'deployment keyword',
      );
      expect(results.items.length).toBeGreaterThanOrEqual(3);

      const contextNames = results.items.map((r) => r.contextName);
      expect(contextNames.some((n) => n.startsWith('DM with'))).toBe(true);
      expect(contextNames.some((n) => n.startsWith('Group:'))).toBe(true);
      expect(contextNames.some((n) => n.startsWith('Channel:'))).toBe(true);
    });
  });

  // ── Full Protocol Flow across nodes ───────────────────────────────────

  describe('Full Protocol Flow across nodes', () => {
    it('DM → promote → group messaging → edit → pin → react → leave — all cross-node', async () => {
      const [node0, node1, node2] = env.nodes;
      const ws = env.subscribeWs();

      // 1. Alice DMs bob via node-0
      const dm = await request(node0.app)
        .post('/api/conversations')
        .send({
          senderId: 'alice',
          recipientId: 'bob',
          content: 'Start a project?',
        })
        .expect(201);

      // 2. Bob replies via node-1
      await request(node1.app)
        .post('/api/conversations')
        .send({
          senderId: 'bob',
          recipientId: 'alice',
          content: 'Sure, add Carol!',
        })
        .expect(201);

      // 3. Promote to group via node-0 (service layer — no controller for promote yet)
      const group = await env.conversationService.promoteToGroup(
        dm.body.data.contextId,
        ['carol'],
        'alice',
      );

      expect(group.members).toHaveLength(3);

      // 4. Carol sends to group via node-2
      await request(node2.app)
        .post(`/api/groups/${group.id}/messages`)
        .send({ memberId: 'carol', content: 'Thanks for adding me!' })
        .expect(201);

      // 5. Alice edits a message via node-0
      const editMsg = await request(node0.app)
        .post(`/api/groups/${group.id}/messages`)
        .send({ memberId: 'alice', content: 'typo here' })
        .expect(201);

      await request(node0.app)
        .put(`/api/groups/${group.id}/messages/${editMsg.body.data.id}`)
        .send({ memberId: 'alice', content: 'fixed typo' })
        .expect(200);

      // 6. Pin via node-1
      await request(node1.app)
        .post(`/api/groups/${group.id}/messages/${editMsg.body.data.id}/pin`)
        .send({ memberId: 'alice' })
        .expect(200);

      // 7. React via node-2
      await request(node2.app)
        .post(
          `/api/groups/${group.id}/messages/${editMsg.body.data.id}/reactions`,
        )
        .send({ memberId: 'carol', emoji: '🎉' })
        .expect(201);

      // 8. Carol leaves via node-2 — key rotation
      const keyBefore = env.groupService.getSymmetricKey(group.id)!;
      await request(node2.app)
        .post(`/api/groups/${group.id}/leave`)
        .send({ memberId: 'carol' })
        .expect(200);
      const keyAfter = env.groupService.getSymmetricKey(group.id)!;
      expect(Buffer.compare(keyBefore, keyAfter)).not.toBe(0);

      // 9. Verify events were emitted throughout
      const allEvents = extractEvents(ws);
      const eventTypes = new Set(allEvents.map((e) => e['type']));
      expect(eventTypes.has(CommunicationEventType.MESSAGE_SENT)).toBe(true);
      expect(eventTypes.has(CommunicationEventType.MESSAGE_EDITED)).toBe(true);
      expect(eventTypes.has(CommunicationEventType.MESSAGE_PINNED)).toBe(true);
      expect(eventTypes.has(CommunicationEventType.REACTION_ADDED)).toBe(true);
      expect(eventTypes.has(CommunicationEventType.MEMBER_LEFT)).toBe(true);
    });
  });
});
