/**
 * Unit tests for ServerController — iconFaClass via updateServer.
 *
 * Verifies that handleUpdateServer correctly passes iconFaClass through
 * to the ServerService and that getServer returns the updated value.
 *
 * Tests:
 * 1. updateServer with iconFaClass sets it on the server
 * 2. updateServer with iconFaClass: '' clears it
 * 3. updateServer without iconFaClass doesn't change existing value
 * 4. getServer returns the updated iconFaClass
 */

import {
  ChannelService,
  PermissionService,
  ServerService,
} from '@brightchain/brightchain-lib';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { ServerController } from '../servers';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockApplication() {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: () => undefined, has: () => false },
    getModel: () => {
      throw new Error('not implemented');
    },
  } as any;
}

function authReq(userId: string, extra: Record<string, unknown> = {}) {
  return { user: { id: userId }, ...extra };
}

// ─── In-memory storage provider ──────────────────────────────────────────────

function makeCol() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const store = new Map<string, any>();
  return {
    create: async (doc: any) => {
      store.set(doc.id ?? doc.token ?? doc._id, doc);
    },
    findById: async (key: string) => store.get(key) ?? null,
    findMany: async () => Array.from(store.values()),
    update: async (key: string, doc: any) => {
      store.set(key, doc);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  };
}

function createStorageProvider() {
  return {
    conversations: makeCol(),
    messages: makeCol(),
    groups: makeCol(),
    groupMessages: makeCol(),
    channels: makeCol(),
    channelMessages: makeCol(),
    inviteTokens: makeCol(),
    servers: makeCol(),
    serverInvites: makeCol(),
  } as any;
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

let controller: ServerController;
let handlers: {
  createServer: (req: unknown) => Promise<{ statusCode: number; response: any }>;
  updateServer: (req: unknown) => Promise<{ statusCode: number; response: any }>;
  getServer: (req: unknown) => Promise<{ statusCode: number; response: any }>;
};

beforeEach(() => {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  const storageProvider = createStorageProvider();
  const serverService = new ServerService({ channelService, storageProvider });

  const app = createMockApplication();
  controller = new ServerController(app);
  controller.setServerService(serverService);

  handlers = (controller as any).handlers;
});

// ─── Helper: create a server and return its ID ──────────────────────────────

async function createTestServer(ownerId: string): Promise<string> {
  const result = await handlers.createServer(
    authReq(ownerId, { body: { name: 'Test' } }),
  );
  expect(result.statusCode).toBe(201);
  return (result.response as any).data.id as string;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ServerController — iconFaClass via updateServer', () => {
  it('updateServer with iconFaClass sets it on the server', async () => {
    const serverId = await createTestServer('owner-1');

    const result = await handlers.updateServer(
      authReq('owner-1', {
        params: { serverId },
        body: { iconFaClass: 'fa-solid fa-gamepad' },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.data.iconFaClass).toBe('fa-solid fa-gamepad');
  });

  it('updateServer with iconFaClass: \'\' clears it', async () => {
    const serverId = await createTestServer('owner-1');

    // Set it first
    await handlers.updateServer(
      authReq('owner-1', {
        params: { serverId },
        body: { iconFaClass: 'fa-solid fa-gamepad' },
      }),
    );

    // Clear it
    const result = await handlers.updateServer(
      authReq('owner-1', {
        params: { serverId },
        body: { iconFaClass: '' },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.data.iconFaClass).toBe('');
  });

  it('updateServer without iconFaClass doesn\'t change existing value', async () => {
    const serverId = await createTestServer('owner-1');

    // Set iconFaClass
    await handlers.updateServer(
      authReq('owner-1', {
        params: { serverId },
        body: { iconFaClass: 'fa-solid fa-gamepad' },
      }),
    );

    // Update name only — iconFaClass should remain
    const result = await handlers.updateServer(
      authReq('owner-1', {
        params: { serverId },
        body: { name: 'Renamed' },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.data.iconFaClass).toBe('fa-solid fa-gamepad');
    expect(result.response.data.name).toBe('Renamed');
  });

  it('getServer returns the updated iconFaClass', async () => {
    const serverId = await createTestServer('owner-1');

    // Set iconFaClass via update
    await handlers.updateServer(
      authReq('owner-1', {
        params: { serverId },
        body: { iconFaClass: 'fa-solid fa-star' },
      }),
    );

    // Retrieve via getServer
    const result = await handlers.getServer(
      authReq('owner-1', {
        params: { serverId },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(result.response.data.iconFaClass).toBe('fa-solid fa-star');
  });
});
