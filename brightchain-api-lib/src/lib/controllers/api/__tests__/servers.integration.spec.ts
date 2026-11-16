/**
 * Integration tests for ServerController.
 *
 * Tests the controller's HTTP-level handler behavior using a real
 * ServerService with in-memory storage (no mocks on the service layer).
 *
 * Requirements: 2.1, 2.3, 2.6, 3.1, 3.2
 */

import {
  ChannelService,
  IAddServerMembersResponse,
  IApiEnvelope,
  IChatCollection,
  IChatStorageProvider,
  ICreateServerInviteResponse,
  ICreateServerResponse,
  IDeleteServerResponse,
  IGetServerResponse,
  IListServersResponse,
  IRedeemServerInviteResponse,
  IRemoveServerMemberResponse,
  IUpdateServerResponse,
  PermissionService,
  ServerService,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import { createMockControllerApplication } from '../../../__tests__/helpers/controller-application.mock';
import { IBrightChainControllerApplication } from '../../../interfaces/application';
import { ServerController } from '../servers';

// ─── Types ───────────────────────────────────────────────────────────────────

type HandlerResult<T> = Promise<{
  statusCode: number;
  response: T | ApiErrorResponse;
}>;

interface ServerControllerHandlers {
  handlers: {
    createServer: (req: unknown) => HandlerResult<ICreateServerResponse>;
    listServers: (req: unknown) => HandlerResult<IListServersResponse>;
    getServer: (req: unknown) => HandlerResult<IGetServerResponse>;
    updateServer: (req: unknown) => HandlerResult<IUpdateServerResponse>;
    deleteServer: (req: unknown) => HandlerResult<IDeleteServerResponse>;
    addMembers: (req: unknown) => HandlerResult<IAddServerMembersResponse>;
    removeMember: (req: unknown) => HandlerResult<IRemoveServerMemberResponse>;
    createInvite: (req: unknown) => HandlerResult<ICreateServerInviteResponse>;
    redeemInvite: (req: unknown) => HandlerResult<IRedeemServerInviteResponse>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Treat a handler response as the success envelope the test expects. */
function envelope<T>(
  response: IApiEnvelope<T> | ApiErrorResponse,
): IApiEnvelope<T> {
  return response as IApiEnvelope<T>;
}

/** Return the envelope's data, failing the test if it is missing. */
function dataOf<T>(response: IApiEnvelope<T> | ApiErrorResponse): T {
  const data = envelope(response).data;
  if (data === undefined) {
    throw new Error('Expected response data');
  }
  return data;
}

function createMockApplication(): IBrightChainControllerApplication {
  return createMockControllerApplication();
}

/** Documents are keyed by `id`, or `token` for invite tokens. */
interface IKeyedDocument {
  id?: string;
  token?: string;
  _id?: string;
}

function makeCol<T>(): IChatCollection<T> {
  const store = new Map<string, T>();
  return {
    create: async (doc: T) => {
      const keyed = doc as IKeyedDocument;
      store.set(String(keyed.id ?? keyed.token ?? keyed._id), doc);
    },
    findById: async (key: string) => store.get(key) ?? null,
    findMany: async () => Array.from(store.values()),
    update: async (key: string, doc: T) => {
      store.set(key, doc);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  };
}

function createTestSetup() {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);

  const storageProvider: IChatStorageProvider = {
    conversations: makeCol(),
    messages: makeCol(),
    groups: makeCol(),
    groupMessages: makeCol(),
    channels: makeCol(),
    channelMessages: makeCol(),
    inviteTokens: makeCol(),
    servers: makeCol(),
    serverInvites: makeCol(),
  };
  const serverService = new ServerService({ channelService, storageProvider });

  const app = createMockApplication();
  const controller = new ServerController(app);
  controller.setServerService(serverService);

  const handlers = (controller as unknown as ServerControllerHandlers).handlers;

  return { serverService, channelService, handlers };
}

function authReq(userId: string, extra: Record<string, unknown> = {}) {
  return { user: { id: userId }, ...extra };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ServerController — integration tests', () => {
  // ── 1. POST / — creates a server, returns 201 ────────────────────────
  describe('POST / — createServer', () => {
    it('creates a server and returns 201 with server data', async () => {
      const { handlers } = createTestSetup();
      const result = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Test Server' } }),
      );

      expect(result.statusCode).toBe(201);
      const body = envelope(result.response);
      expect(body.status).toBe('success');

      const data = dataOf(body);
      expect(data.name).toBe('Test Server');
      expect(data.ownerId).toBe('owner-1');
      expect(data.memberIds).toEqual(['owner-1']);
      expect(data.categories.length).toBe(1);
      expect(data.channelIds.length).toBe(1);
    });
  });

  // ── 2. GET / — lists servers for the authenticated user ──────────────
  describe('GET / — listServers', () => {
    it('returns servers the user is a member of', async () => {
      const { handlers } = createTestSetup();

      // Create a server — the owner is automatically a member
      const r1 = await handlers.createServer(
        authReq('user-1', { body: { name: 'Server A' } }),
      );
      expect(r1.statusCode).toBe(201);
      const serverId = dataOf(r1.response).id;

      // List servers for the owner
      const result = await handlers.listServers(
        authReq('user-1', { query: {} }),
      );

      expect(result.statusCode).toBe(200);
      const body = envelope(result.response);
      expect(body.status).toBe('success');

      const data = dataOf(body);
      expect(data.items.length).toBe(1);
      expect(data.items[0].id).toBe(serverId);
    });

    it('does not return servers the user is not a member of', async () => {
      const { handlers } = createTestSetup();

      await handlers.createServer(
        authReq('owner-1', { body: { name: 'Private Server' } }),
      );

      // A different user lists servers — should see none
      const result = await handlers.listServers(
        authReq('outsider', { query: {} }),
      );

      expect(result.statusCode).toBe(200);
      const data = dataOf(result.response);
      expect(data.items.length).toBe(0);
    });
  });

  // ── 3. GET /:serverId — returns server details ───────────────────────
  describe('GET /:serverId — getServer', () => {
    it('returns server details for a valid serverId', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Detail Server' } }),
      );
      const serverId = dataOf(createResult.response).id;

      const result = await handlers.getServer(
        authReq('owner-1', { params: { serverId } }),
      );

      expect(result.statusCode).toBe(200);
      const body = envelope(result.response);
      expect(body.status).toBe('success');
      expect(dataOf(body).id).toBe(serverId);
      expect(dataOf(body).name).toBe('Detail Server');
    });
  });

  // ── 4. PUT /:serverId — owner can update ─────────────────────────────
  describe('PUT /:serverId — updateServer', () => {
    it('owner can update the server name', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Original Name' } }),
      );
      const serverId = dataOf(createResult.response).id;

      const result = await handlers.updateServer(
        authReq('owner-1', {
          params: { serverId },
          body: { name: 'Updated Name' },
        }),
      );

      expect(result.statusCode).toBe(200);
      const body = envelope(result.response);
      expect(body.status).toBe('success');
      expect(dataOf(body).name).toBe('Updated Name');
    });

    // ── 5. PUT /:serverId — non-owner member gets 403 ──────────────────
    it('non-owner member gets 403 on update', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Protected Server' } }),
      );
      const serverId = dataOf(createResult.response).id;

      // Add a member
      await handlers.addMembers(
        authReq('owner-1', {
          params: { serverId },
          body: { memberIds: ['member-1'] },
        }),
      );

      // Non-owner tries to update
      const result = await handlers.updateServer(
        authReq('member-1', {
          params: { serverId },
          body: { name: 'Hacked Name' },
        }),
      );

      expect(result.statusCode).toBe(403);
    });
  });

  // ── 6. DELETE /:serverId — owner succeeds ────────────────────────────
  describe('DELETE /:serverId — deleteServer', () => {
    it('owner can delete the server', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Doomed Server' } }),
      );
      const serverId = dataOf(createResult.response).id;

      const result = await handlers.deleteServer(
        authReq('owner-1', { params: { serverId } }),
      );

      expect(result.statusCode).toBe(200);
      const body = envelope(result.response);
      expect(body.status).toBe('success');
      expect(dataOf(body).deleted).toBe(true);

      // Verify server is gone
      const getResult = await handlers.getServer(
        authReq('owner-1', { params: { serverId } }),
      );
      expect(getResult.statusCode).toBe(404);
    });

    // ── 7. DELETE /:serverId — non-owner gets 403 ──────────────────────
    it('non-owner gets 403 on delete', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Protected Server' } }),
      );
      const serverId = dataOf(createResult.response).id;

      // Add a member
      await handlers.addMembers(
        authReq('owner-1', {
          params: { serverId },
          body: { memberIds: ['member-1'] },
        }),
      );

      // Non-owner tries to delete
      const result = await handlers.deleteServer(
        authReq('member-1', { params: { serverId } }),
      );

      expect(result.statusCode).toBe(403);
    });
  });

  // ── 8. POST /:serverId/invites — creates invite token ────────────────
  describe('POST /:serverId/invites — createInvite', () => {
    it('creates an invite token for the server', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Invite Server' } }),
      );
      const serverId = dataOf(createResult.response).id;

      const result = await handlers.createInvite(
        authReq('owner-1', {
          params: { serverId },
          body: { maxUses: 5 },
        }),
      );

      expect(result.statusCode).toBe(201);
      const body = envelope(result.response);
      expect(body.status).toBe('success');

      const data = dataOf(body);
      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe('string');
      expect(data.serverId).toBe(serverId);
      expect(data.maxUses).toBe(5);
      expect(data.currentUses).toBe(0);
    });
  });

  // ── 9. POST /:serverId/invites/:token/redeem — redeems invite ────────
  describe('POST /:serverId/invites/:token/redeem — redeemInvite', () => {
    it('redeems an invite and adds user to server', async () => {
      const { handlers, serverService } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Join Server' } }),
      );
      const serverId = dataOf(createResult.response).id;

      // Create invite
      const inviteResult = await handlers.createInvite(
        authReq('owner-1', {
          params: { serverId },
          body: { maxUses: 3 },
        }),
      );
      const token = dataOf(inviteResult.response).token;

      // Redeem invite as a new user
      const redeemResult = await handlers.redeemInvite(
        authReq('joiner-1', { params: { serverId, token } }),
      );

      expect(redeemResult.statusCode).toBe(200);
      const body = envelope(redeemResult.response);
      expect(body.status).toBe('success');
      expect(dataOf(body).redeemed).toBe(true);

      // Verify user is now a member
      const server = await serverService.getServer(serverId);
      expect(server.memberIds).toContain('joiner-1');
    });

    // ── 10. Expired/exhausted invite returns 410 ───────────────────────
    it('exhausted invite returns 410', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Limited Server' } }),
      );
      const serverId = dataOf(createResult.response).id;

      // Create invite with maxUses=1
      const inviteResult = await handlers.createInvite(
        authReq('owner-1', {
          params: { serverId },
          body: { maxUses: 1 },
        }),
      );
      const token = dataOf(inviteResult.response).token;

      // First redemption succeeds
      const firstRedeem = await handlers.redeemInvite(
        authReq('joiner-1', { params: { serverId, token } }),
      );
      expect(firstRedeem.statusCode).toBe(200);

      // Second redemption should fail with 410
      const secondRedeem = await handlers.redeemInvite(
        authReq('joiner-2', { params: { serverId, token } }),
      );
      expect(secondRedeem.statusCode).toBe(410);
    });
  });
});
