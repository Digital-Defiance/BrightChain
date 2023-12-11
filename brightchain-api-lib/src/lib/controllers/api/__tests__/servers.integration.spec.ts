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
  PermissionService,
  ServerService,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../../interfaces/application';
import { ServerController } from '../servers';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServerControllerHandlers {
  handlers: {
    createServer: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    listServers: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    getServer: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    updateServer: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    deleteServer: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    addMembers: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    removeMember: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    createInvite: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    redeemInvite: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockApplication(): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: () => undefined },
    plugins: {},
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
}

function createTestSetup() {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  const serverService = new ServerService({ channelService });

  const app = createMockApplication();
  const controller = new ServerController(app);
  controller.setServerService(serverService);

  const handlers = (controller as unknown as ServerControllerHandlers)
    .handlers;

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
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');

      const data = body.data as Record<string, unknown>;
      expect(data.name).toBe('Test Server');
      expect(data.ownerId).toBe('owner-1');
      expect(data.memberIds).toEqual(['owner-1']);
      expect((data.categories as unknown[]).length).toBe(1);
      expect((data.channelIds as unknown[]).length).toBe(1);
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
      const serverId = (
        (r1.response as Record<string, unknown>).data as Record<string, unknown>
      ).id as string;

      // List servers for the owner
      const result = await handlers.listServers(
        authReq('user-1', { query: {} }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');

      const data = body.data as { items: Array<Record<string, unknown>> };
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
      const data = (result.response as Record<string, unknown>).data as {
        items: unknown[];
      };
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
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

      const result = await handlers.getServer(
        authReq('owner-1', { params: { serverId } }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');
      expect((body.data as Record<string, unknown>).id).toBe(serverId);
      expect((body.data as Record<string, unknown>).name).toBe(
        'Detail Server',
      );
    });
  });

  // ── 4. PUT /:serverId — owner can update ─────────────────────────────
  describe('PUT /:serverId — updateServer', () => {
    it('owner can update the server name', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Original Name' } }),
      );
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

      const result = await handlers.updateServer(
        authReq('owner-1', {
          params: { serverId },
          body: { name: 'Updated Name' },
        }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');
      expect((body.data as Record<string, unknown>).name).toBe('Updated Name');
    });

    // ── 5. PUT /:serverId — non-owner member gets 403 ──────────────────
    it('non-owner member gets 403 on update', async () => {
      const { handlers } = createTestSetup();

      const createResult = await handlers.createServer(
        authReq('owner-1', { body: { name: 'Protected Server' } }),
      );
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

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
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

      const result = await handlers.deleteServer(
        authReq('owner-1', { params: { serverId } }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');
      expect((body.data as Record<string, unknown>).deleted).toBe(true);

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
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

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
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

      const result = await handlers.createInvite(
        authReq('owner-1', {
          params: { serverId },
          body: { maxUses: 5 },
        }),
      );

      expect(result.statusCode).toBe(201);
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');

      const data = body.data as Record<string, unknown>;
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
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

      // Create invite
      const inviteResult = await handlers.createInvite(
        authReq('owner-1', {
          params: { serverId },
          body: { maxUses: 3 },
        }),
      );
      const token = (
        (inviteResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).token as string;

      // Redeem invite as a new user
      const redeemResult = await handlers.redeemInvite(
        authReq('joiner-1', { params: { serverId, token } }),
      );

      expect(redeemResult.statusCode).toBe(200);
      const body = redeemResult.response as Record<string, unknown>;
      expect(body.status).toBe('success');
      expect((body.data as Record<string, unknown>).redeemed).toBe(true);

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
      const serverId = (
        (createResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).id as string;

      // Create invite with maxUses=1
      const inviteResult = await handlers.createInvite(
        authReq('owner-1', {
          params: { serverId },
          body: { maxUses: 1 },
        }),
      );
      const token = (
        (inviteResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).token as string;

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
