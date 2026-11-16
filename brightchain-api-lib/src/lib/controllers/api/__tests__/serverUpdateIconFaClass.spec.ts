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
  IApiEnvelope,
  IChatCollection,
  IChatStorageProvider,
  ICreateServerResponse,
  IGetServerResponse,
  IUpdateServerResponse,
  PermissionService,
  ServerService,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { IBrightChainApplication } from '../../../interfaces/application';
import { ServerController } from '../servers';

type HandlerResult<T> = Promise<{
  statusCode: number;
  response: T | ApiErrorResponse;
}>;

/** Return the envelope's data, failing the test if it is missing. */
function dataOf<T>(response: IApiEnvelope<T> | ApiErrorResponse): T {
  const data = (response as IApiEnvelope<T>).data;
  if (data === undefined) {
    throw new Error('Expected response data');
  }
  return data;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockApplication(): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: () => undefined, has: () => false },
    getModel: () => {
      throw new Error('not implemented');
    },
  } as unknown as IBrightChainApplication;
}
function authReq(userId: string, extra: Record<string, unknown> = {}) {
  return { user: { id: userId }, ...extra };
}

// ─── In-memory storage provider ──────────────────────────────────────────────

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

function createStorageProvider(): IChatStorageProvider {
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
  };
}
// ─── Test Setup ──────────────────────────────────────────────────────────────

let controller: ServerController;
let handlers: {
  createServer: (req: unknown) => HandlerResult<ICreateServerResponse>;
  updateServer: (req: unknown) => HandlerResult<IUpdateServerResponse>;
  getServer: (req: unknown) => HandlerResult<IGetServerResponse>;
};

beforeEach(() => {
  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  const storageProvider = createStorageProvider();
  const serverService = new ServerService({ channelService, storageProvider });

  const app = createMockApplication();
  controller = new ServerController(app);
  controller.setServerService(serverService);

  handlers = (controller as unknown as { handlers: typeof handlers }).handlers;
});

// ─── Helper: create a server and return its ID ──────────────────────────────

async function createTestServer(ownerId: string): Promise<string> {
  const result = await handlers.createServer(
    authReq(ownerId, { body: { name: 'Test' } }),
  );
  expect(result.statusCode).toBe(201);
  return dataOf(result.response).id;
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
    expect(dataOf(result.response).iconFaClass).toBe('fa-solid fa-gamepad');
  });

  it("updateServer with iconFaClass: '' clears it", async () => {
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
    expect(dataOf(result.response).iconFaClass).toBe('');
  });

  it("updateServer without iconFaClass doesn't change existing value", async () => {
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
    expect(dataOf(result.response).iconFaClass).toBe('fa-solid fa-gamepad');
    expect(dataOf(result.response).name).toBe('Renamed');
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
    expect(dataOf(result.response).iconFaClass).toBe('fa-solid fa-star');
  });
});
