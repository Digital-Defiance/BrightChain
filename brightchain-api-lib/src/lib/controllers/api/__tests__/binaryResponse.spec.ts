/**
 * Binary response serving tests.
 *
 * Both ServerController (icon) and PostImageController (post images) now send
 * binary image data directly via `this.res.set()` / `this.res.status(200).send()`
 * instead of returning `{ _binary: true, _buffer: Buffer }` which the framework
 * does not understand.
 *
 * These tests verify that the controllers call the Express response object
 * correctly when serving binary image data.
 */

import {
  ChannelService,
  PermissionService,
  ServerService,
} from '@brightchain/brightchain-lib';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { IStagingConfig } from '@brightchain/brightchain-lib';
import { IBrightChainApplication } from '../../../interfaces/application';
import type { IStagingServiceDeps } from '../../../services/staging/stagingService';
import { StagingService } from '../../../services/staging/stagingService';
import { IServerIconControllerDeps, ServerController } from '../servers';
import {
  PostImageController,
  IPostImageControllerDeps,
} from '../brighthub/postImageController';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ControllerHandlers {
  handlers: Record<
    string,
    (req: unknown) => Promise<{
      statusCode: number;
      response: Record<string, unknown>;
    }>
  >;
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
      listContainers: async () => [],
    },
    uploadService: {
      createSession: async () => ({
        id: Buffer.from('session-id') as never,
      }),
      receiveChunk: async (_sid, _idx, data) => {
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

function createMockRes() {
  const res = {
    set: jest.fn(),
    status: jest.fn().mockReturnThis() as jest.Mock,
    send: jest.fn(),
    headersSent: false,
  };
  return res;
}

/**
 * Set the mock response on a controller instance.
 *
 * The upstream BaseController exposes `this.res` as a getter backed by the
 * private `activeResponse` field. We cannot assign to the getter directly,
 * so we write to the backing field instead.
 */
function setMockRes(
  controller: unknown,
  mockRes: ReturnType<typeof createMockRes>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (controller as any).activeResponse = mockRes;
}

function authReq(userId: string, extra: Record<string, unknown> = {}) {
  return { user: { id: userId }, ...extra };
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

let tempDir: string;
let stagingService: StagingService;
let serverService: ServerService;

beforeEach(async () => {
  tokenCounter = 0;
  storedFiles.clear();
  tempDir = await mkdtemp(join(tmpdir(), 'binary-response-'));

  const stagingConfig = createStagingConfig(tempDir);
  const stagingDeps = createStagingDeps();
  stagingService = new StagingService(stagingConfig, stagingDeps);
  await stagingService.initialize();

  const permissionService = new PermissionService();
  const channelService = new ChannelService(permissionService);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeCol = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new Map<string, any>();
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      create: async (doc: any) => {
        store.set(doc.id ?? doc.token ?? doc._id, doc);
      },
      findById: async (key: string) => store.get(key) ?? null,
      findMany: async () => Array.from(store.values()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: async (key: string, doc: any) => {
        store.set(key, doc);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
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
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ─── Helper: create a server and upload an icon ─────────────────────────────

async function createServerWithIcon(
  controller: ServerController,
): Promise<string> {
  const handlers = (controller as unknown as ControllerHandlers).handlers;

  // Create server
  const createResult = await handlers['createServer'](
    authReq('owner-1', { body: { name: 'Test Server' } }),
  );
  expect(createResult.statusCode).toBe(201);
  const serverId = (
    createResult.response.data as Record<string, unknown>
  ).id as string;

  // Stage a valid PNG image
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
    'owner-1',
  );

  // Upload icon
  const uploadResult = await handlers['uploadIcon'](
    authReq('owner-1', {
      params: { serverId },
      body: { commitToken: record.commitToken },
    }),
  );
  expect(uploadResult.statusCode).toBe(200);

  return serverId;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Binary response serving pattern', () => {
  describe('ServerController — handleServeIcon', () => {
    let controller: ServerController;
    let handlers: ControllerHandlers['handlers'];

    beforeEach(() => {
      const app = createMockApplication();
      controller = new ServerController(app);
      controller.setServerService(serverService);
      controller.setIconDeps(createMockIconDeps(stagingService));
      handlers = (controller as unknown as ControllerHandlers).handlers;
    });

    it('sends binary data via res.status(200).send(), not as JSON', async () => {
      const serverId = await createServerWithIcon(controller);
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveIcon']({
        params: { serverId },
        headers: {},
      });

      // Verify res.status(200).send() was called with a Buffer
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledTimes(1);
      const sentData = mockRes.send.mock.calls[0][0];
      expect(Buffer.isBuffer(sentData)).toBe(true);
    });

    it('sets Content-Type to image/png', async () => {
      const serverId = await createServerWithIcon(controller);
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveIcon']({
        params: { serverId },
        headers: {},
      });

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'image/png');
    });

    it('sets Cache-Control header', async () => {
      const serverId = await createServerWithIcon(controller);
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveIcon']({
        params: { serverId },
        headers: {},
      });

      expect(mockRes.set).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=86400, immutable',
      );
    });

    it('sets ETag header', async () => {
      const serverId = await createServerWithIcon(controller);
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveIcon']({
        params: { serverId },
        headers: {},
      });

      // ETag should be the iconAssetId wrapped in quotes
      expect(mockRes.set).toHaveBeenCalledWith(
        'ETag',
        expect.stringMatching(/^".+"$/),
      );
    });
  });

  describe('PostImageController — handleServeImage', () => {
    let controller: PostImageController;
    let handlers: ControllerHandlers['handlers'];
    const fakeFileBuffer = Buffer.from('fake-png-data');

    beforeEach(() => {
      const app = createMockApplication();
      controller = new PostImageController(app);

      const deps: IPostImageControllerDeps = {
        fileService: {
          readFile: async () => fakeFileBuffer,
        },
        parseId: (id: string) => Buffer.from(id) as never,
        resolveFile: async (fileId: string) => ({
          vaultContainerId: 'vault-container-123',
          mimeType: 'image/png',
        }),
      };
      controller.setDeps(deps);
      handlers = (controller as unknown as ControllerHandlers).handlers;
    });

    it('sends binary data via res.status(200).send(), not as JSON', async () => {
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveImage']({
        params: { fileId: 'test-file-id' },
        headers: {},
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledTimes(1);
      const sentData = mockRes.send.mock.calls[0][0];
      expect(Buffer.isBuffer(sentData)).toBe(true);
    });

    it('sets Content-Type to the resolved MIME type', async () => {
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveImage']({
        params: { fileId: 'test-file-id' },
        headers: {},
      });

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'image/png');
    });

    it('sets Cache-Control header with immutable directive', async () => {
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveImage']({
        params: { fileId: 'test-file-id' },
        headers: {},
      });

      expect(mockRes.set).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=31536000, immutable',
      );
    });

    it('sets ETag header', async () => {
      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveImage']({
        params: { fileId: 'test-file-id' },
        headers: {},
      });

      expect(mockRes.set).toHaveBeenCalledWith('ETag', '"test-file-id"');
    });

    it('uses the MIME type from resolveFile, not hardcoded', async () => {
      // Override deps with a JPEG MIME type
      const jpegDeps: IPostImageControllerDeps = {
        fileService: {
          readFile: async () => fakeFileBuffer,
        },
        parseId: (id: string) => Buffer.from(id) as never,
        resolveFile: async () => ({
          vaultContainerId: 'vault-container-123',
          mimeType: 'image/jpeg',
        }),
      };
      controller.setDeps(jpegDeps);

      const mockRes = createMockRes();
      setMockRes(controller, mockRes);

      await handlers['serveImage']({
        params: { fileId: 'jpeg-file-id' },
        headers: {},
      });

      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
    });
  });
});
