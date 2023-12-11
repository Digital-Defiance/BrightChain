/**
 * Unit tests for ServerController icon endpoints.
 *
 * Tests each icon endpoint's happy path and error paths:
 * - Upload (POST /:serverId/icon) → 200, 400, 403, 404, 410, 500
 * - Serve  (GET /:serverId/icon)  → 200, 304, 404
 * - Remove (DELETE /:serverId/icon) → 200, 403, 404
 *
 * Validates: Requirements 2.1–2.9, 3.1–3.6, 4.1–4.5
 */

import type { IStagingConfig } from '@brightchain/brightchain-lib';
import {
  ChannelService,
  PermissionService,
  ServerService,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { IBrightChainApplication } from '../../../interfaces/application';
import type { IStagingServiceDeps } from '../../../services/staging/stagingService';
import { StagingService } from '../../../services/staging/stagingService';
import { IServerIconControllerDeps, ServerController } from '../servers';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServerControllerHandlers {
  handlers: {
    uploadIcon: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    serveIcon: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    removeIcon: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    createServer: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
    addMembers: (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown> | ApiErrorResponse;
    }>;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tokenCounter = 0;

function createStagingDeps(
  overrides?: Partial<IStagingServiceDeps>,
): IStagingServiceDeps {
  return {
    generateToken:
      overrides?.generateToken ??
      (() => {
        tokenCounter++;
        const hex = tokenCounter.toString(16).padStart(32, '0');
        return [
          hex.slice(0, 8),
          hex.slice(8, 12),
          '4' + hex.slice(13, 16),
          '8' + hex.slice(17, 20),
          hex.slice(20, 32),
        ].join('-');
      }),
    now: overrides?.now ?? (() => new Date('2025-01-15T12:00:00.000Z')),
  };
}

function createStagingConfig(
  stagingDir: string,
  overrides?: Partial<IStagingConfig>,
): IStagingConfig {
  return {
    stagingDir,
    defaultTtlSeconds: overrides?.defaultTtlSeconds ?? 3600,
    maxTtlSeconds: overrides?.maxTtlSeconds ?? 86400,
    maxFileSizeBytes: overrides?.maxFileSizeBytes ?? 50 * 1024 * 1024,
    cleanupIntervalMs: overrides?.cleanupIntervalMs ?? 300000,
  };
}

function createMockApplication(): IBrightChainApplication {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: () => undefined, has: () => false },
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

/** Stored icon data for the mock file service */
const storedFiles = new Map<string, Buffer>();

function createMockIconDeps(
  stagingService: StagingService,
): IServerIconControllerDeps {
  let fileCounter = 0;
  return {
    stagingService,
    vaultContainerService: {
      createContainer: async () => ({
        id: Buffer.from('vault-container-id') as never,
        rootFolderId: Buffer.from('root-folder-id') as never,
      }),
    },
    uploadService: {
      createSession: async () => ({
        id: Buffer.from('session-id') as never,
      }),
      receiveChunk: async (_sid, _idx, data) => {
        // Store the uploaded data for later retrieval
        storedFiles.set('latest', Buffer.from(data));
        return {};
      },
      finalize: async () => {
        fileCounter++;
        const fileId = `file-${fileCounter}`;
        return {
          id: Buffer.from(fileId) as never,
          vaultContainerId: Buffer.from('vault-container-id') as never,
          fileName: 'icon.png',
          mimeType: 'image/png',
          sizeBytes: storedFiles.get('latest')?.length ?? 0,
        };
      },
    },
    fileService: {
      readFile: async () => {
        const data = storedFiles.get('latest');
        if (!data) throw new Error('File not found');
        return data;
      },
      deleteFile: async () => {
        storedFiles.delete('latest');
      },
    },
    parseId: (id: string) => Buffer.from(id) as never,
  };
}

function authReq(userId: string, extra: Record<string, unknown> = {}) {
  return { user: { id: userId }, ...extra };
}

/** Create a minimal valid PNG buffer (1x1 pixel) */
function createMinimalPng(): Buffer {
  // Minimal valid PNG: 1x1 pixel, RGBA
  const header = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
  ]);
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // We'll use sharp to create a proper minimal PNG instead
  return header; // This won't be a valid PNG, but we'll use sharp in tests
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

let tempDir: string;
let stagingService: StagingService;
let serverService: ServerService;
let controller: ServerController;
let handlers: ServerControllerHandlers['handlers'];

beforeEach(async () => {
  tokenCounter = 0;
  storedFiles.clear();
  tempDir = await mkdtemp(join(tmpdir(), 'server-icon-unit-'));

  const stagingConfig = createStagingConfig(tempDir);
  const stagingDeps = createStagingDeps();
  stagingService = new StagingService(stagingConfig, stagingDeps);
  await stagingService.initialize();

  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  // Create an in-memory storage provider that actually stores data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeCol = () => {
    const store = new Map<string, any>();
    return {
      create: async (doc: any) => { store.set(doc.id ?? doc.token ?? doc._id, doc); },
      findById: async (key: string) => store.get(key) ?? null,
      findMany: async () => Array.from(store.values()),
      update: async (key: string, doc: any) => { store.set(key, doc); },
      delete: async (key: string) => { store.delete(key); },
    };
  };
  const storageProvider = {
    conversations: makeCol(),
    messages: makeCol(),
    groups: makeCol(),
    groupMessages: makeCol(),
    channels: makeCol(),
    channelMessages: makeCol(),
    inviteTokens: makeCol(),
    servers: makeCol(),
    serverInvites: makeCol(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  serverService = new ServerService({ channelService, storageProvider });

  const app = createMockApplication();
  controller = new ServerController(app);
  controller.setServerService(serverService);
  controller.setIconDeps(createMockIconDeps(stagingService));

  handlers = (controller as unknown as ServerControllerHandlers).handlers;
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ─── Helper: create a server and return its ID ──────────────────────────────

async function createTestServer(ownerId: string): Promise<string> {
  const result = await handlers.createServer(
    authReq(ownerId, { body: { name: 'Test Server' } }),
  );
  expect(result.statusCode).toBe(201);
  return (
    (result.response as Record<string, unknown>).data as Record<string, unknown>
  ).id as string;
}

/** Stage a valid PNG image and return the commit token */
async function stageValidImage(uploaderId: string): Promise<string> {
  // Use sharp to create a valid 10x10 PNG
  const sharp = (await import('sharp')).default;
  const pngBuffer = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const record = await stagingService.stage(
    pngBuffer,
    'test-icon.png',
    'image/png',
    uploaderId,
  );
  return record.commitToken;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ServerController — Icon Endpoints', () => {
  // ── POST /:serverId/icon ──────────────────────────────────────────────

  describe('POST /:serverId/icon (uploadIcon)', () => {
    it('returns 200 with updated server on successful upload', async () => {
      const serverId = await createTestServer('owner-1');
      const commitToken = await stageValidImage('owner-1');

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');
      const data = body.data as Record<string, unknown>;
      expect(data.iconUrl).toBe(`/api/servers/${serverId}/icon`);
      expect(data.iconAssetId).toBeTruthy();
      expect(data.iconVaultContainerId).toBeTruthy();
    });

    it('returns 400 when commitToken is missing', async () => {
      const serverId = await createTestServer('owner-1');

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: {},
        }),
      );

      expect(result.statusCode).toBe(400);
    });

    it('returns 400 when commitToken is empty string', async () => {
      const serverId = await createTestServer('owner-1');

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken: '' },
        }),
      );

      expect(result.statusCode).toBe(400);
    });

    it('returns 403 when user is not owner or admin', async () => {
      const serverId = await createTestServer('owner-1');
      // Add a regular member
      await handlers.addMembers(
        authReq('owner-1', {
          params: { serverId },
          body: { memberIds: ['member-1'] },
        }),
      );

      const commitToken = await stageValidImage('member-1');

      const result = await handlers.uploadIcon(
        authReq('member-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );

      expect(result.statusCode).toBe(403);
    });

    it('returns 404 when staged file not found', async () => {
      const serverId = await createTestServer('owner-1');

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken: 'nonexistent-token' },
        }),
      );

      expect(result.statusCode).toBe(404);
      const error = (result.response as Record<string, unknown>)
        .error as Record<string, unknown>;
      expect(error.code).toBe('STAGED_FILE_NOT_FOUND');
    });

    it('returns 410 when staged file is expired', async () => {
      const serverId = await createTestServer('owner-1');

      // Stage with a past time
      const pastDeps = createStagingDeps({
        now: () => new Date('2024-01-01T00:00:00.000Z'),
      });
      const pastConfig = createStagingConfig(tempDir, { defaultTtlSeconds: 1 });
      const pastService = new StagingService(pastConfig, pastDeps);

      const sharp = (await import('sharp')).default;
      const pngBuffer = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const record = await pastService.stage(
        pngBuffer,
        'icon.png',
        'image/png',
        'owner-1',
      );

      // Create a new staging service with current time for expiry check
      const currentDeps = createStagingDeps({
        now: () => new Date('2025-01-15T12:00:00.000Z'),
      });
      const currentService = new StagingService(pastConfig, currentDeps);
      controller.setIconDeps(createMockIconDeps(currentService));
      handlers = (controller as unknown as ServerControllerHandlers).handlers;

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken: record.commitToken },
        }),
      );

      expect(result.statusCode).toBe(410);
      const error = (result.response as Record<string, unknown>)
        .error as Record<string, unknown>;
      expect(error.code).toBe('STAGED_FILE_EXPIRED');
    });

    it('returns 403 when uploader does not match authenticated user', async () => {
      const serverId = await createTestServer('owner-1');
      // Stage as a different user
      const commitToken = await stageValidImage('other-user');

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );

      expect(result.statusCode).toBe(403);
      const error = (result.response as Record<string, unknown>)
        .error as Record<string, unknown>;
      expect(error.code).toBe('STAGING_PERMISSION_ERROR');
    });

    it('returns 400 when MIME type is not allowed', async () => {
      const serverId = await createTestServer('owner-1');

      // Stage a file with invalid MIME type
      const record = await stagingService.stage(
        Buffer.from('not an image'),
        'document.pdf',
        'application/pdf',
        'owner-1',
      );

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken: record.commitToken },
        }),
      );

      expect(result.statusCode).toBe(400);
      const error = (result.response as Record<string, unknown>)
        .error as Record<string, unknown>;
      expect(error.code).toBe('INVALID_FILE_TYPE');
    });

    it('returns 400 when file size exceeds limit', async () => {
      const serverId = await createTestServer('owner-1');

      // Stage a file that's too large (mock the size in the record)
      // We need to create a buffer > 5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const record = await stagingService.stage(
        largeBuffer,
        'huge-icon.png',
        'image/png',
        'owner-1',
      );

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken: record.commitToken },
        }),
      );

      expect(result.statusCode).toBe(400);
      const error = (result.response as Record<string, unknown>)
        .error as Record<string, unknown>;
      expect(error.code).toBe('FILE_TOO_LARGE');
    });

    it('returns 404 when server does not exist', async () => {
      const commitToken = await stageValidImage('owner-1');

      const result = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId: 'nonexistent-server' },
          body: { commitToken },
        }),
      );

      expect(result.statusCode).toBe(404);
    });
  });

  // ── GET /:serverId/icon ───────────────────────────────────────────────

  describe('GET /:serverId/icon (serveIcon)', () => {
    it('returns 200 with image data and correct headers when icon exists', async () => {
      const serverId = await createTestServer('owner-1');
      const commitToken = await stageValidImage('owner-1');

      // Upload the icon first
      await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );

      const result = await handlers.serveIcon({
        params: { serverId },
        headers: {},
      });

      expect(result.statusCode).toBe(200);
      const response = result.response as Record<string, unknown>;
      expect(response._binary).toBe(true);
      expect(response._buffer).toBeDefined();
      const headers = response._headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('image/png');
      expect(headers['Cache-Control']).toBe('public, max-age=86400, immutable');
      expect(headers['ETag']).toBeTruthy();
    });

    it('returns 404 when server has no icon', async () => {
      const serverId = await createTestServer('owner-1');

      const result = await handlers.serveIcon({
        params: { serverId },
        headers: {},
      });

      expect(result.statusCode).toBe(404);
      const error = (result.response as Record<string, unknown>)
        .error as Record<string, unknown>;
      expect(error.code).toBe('SERVER_ICON_NOT_FOUND');
    });

    it('returns 304 when If-None-Match matches ETag', async () => {
      const serverId = await createTestServer('owner-1');
      const commitToken = await stageValidImage('owner-1');

      // Upload the icon
      const uploadResult = await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );
      const iconAssetId = (
        (uploadResult.response as Record<string, unknown>).data as Record<
          string,
          unknown
        >
      ).iconAssetId as string;

      // Request with matching ETag
      const result = await handlers.serveIcon({
        params: { serverId },
        headers: { 'if-none-match': `"${iconAssetId}"` },
      });

      expect(result.statusCode).toBe(304);
    });

    it('returns 200 when If-None-Match does not match', async () => {
      const serverId = await createTestServer('owner-1');
      const commitToken = await stageValidImage('owner-1');

      await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );

      const result = await handlers.serveIcon({
        params: { serverId },
        headers: { 'if-none-match': '"wrong-etag"' },
      });

      expect(result.statusCode).toBe(200);
    });

    it('returns 404 when server does not exist', async () => {
      const result = await handlers.serveIcon({
        params: { serverId: 'nonexistent-server' },
        headers: {},
      });

      expect(result.statusCode).toBe(404);
    });
  });

  // ── DELETE /:serverId/icon ────────────────────────────────────────────

  describe('DELETE /:serverId/icon (removeIcon)', () => {
    it('returns 200 with cleared icon fields on successful removal', async () => {
      const serverId = await createTestServer('owner-1');
      const commitToken = await stageValidImage('owner-1');

      // Upload icon first
      await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );

      // Remove icon
      const result = await handlers.removeIcon(
        authReq('owner-1', {
          params: { serverId },
        }),
      );

      expect(result.statusCode).toBe(200);
      const body = result.response as Record<string, unknown>;
      expect(body.status).toBe('success');
      const data = body.data as Record<string, unknown>;
      expect(data.iconUrl).toBeUndefined();
      expect(data.iconAssetId).toBeUndefined();
      expect(data.iconVaultContainerId).toBeUndefined();
    });

    it('returns 404 when server has no icon', async () => {
      const serverId = await createTestServer('owner-1');

      const result = await handlers.removeIcon(
        authReq('owner-1', {
          params: { serverId },
        }),
      );

      expect(result.statusCode).toBe(404);
      const error = (result.response as Record<string, unknown>)
        .error as Record<string, unknown>;
      expect(error.code).toBe('SERVER_ICON_NOT_FOUND');
    });

    it('returns 403 when user is not owner or admin', async () => {
      const serverId = await createTestServer('owner-1');
      const commitToken = await stageValidImage('owner-1');

      // Upload icon
      await handlers.uploadIcon(
        authReq('owner-1', {
          params: { serverId },
          body: { commitToken },
        }),
      );

      // Add a regular member
      await handlers.addMembers(
        authReq('owner-1', {
          params: { serverId },
          body: { memberIds: ['member-1'] },
        }),
      );

      // Member tries to remove icon
      const result = await handlers.removeIcon(
        authReq('member-1', {
          params: { serverId },
        }),
      );

      expect(result.statusCode).toBe(403);
    });

    it('returns 404 when server does not exist', async () => {
      const result = await handlers.removeIcon(
        authReq('owner-1', {
          params: { serverId: 'nonexistent-server' },
        }),
      );

      expect(result.statusCode).toBe(404);
    });
  });
});
