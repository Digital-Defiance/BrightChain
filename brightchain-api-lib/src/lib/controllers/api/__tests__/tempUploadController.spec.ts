/**
 * Unit tests for TempUploadController.
 *
 * Tests each endpoint's happy path and error paths:
 * - Stage (POST /) → 201, 413, 401
 * - Preview (GET /:commitToken/preview) → 200, 404, 410
 * - Commit (POST /:commitToken/commit) → 200, 404, 410, 403, 422
 * - Discard (DELETE /:commitToken) → 204, 404, 403
 *
 * Requirements: 1.1, 1.8, 1.9, 2.1, 2.4, 2.5, 3.1, 3.7, 3.8, 3.9, 3.10,
 *               4.1, 4.3, 4.4, 4.5, 6.4, 6.5
 */

import type { IStagingConfig } from '@brightchain/brightchain-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { IStagingServiceDeps } from '../../../services/staging/stagingService';
import { StagingService } from '../../../services/staging/stagingService';
import type { ITempUploadControllerDeps } from '../tempUploadController';
import { TempUploadController } from '../tempUploadController';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function createConfig(
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

function createMockControllerDeps(
  stagingService: StagingService,
): ITempUploadControllerDeps {
  return {
    stagingService,
    vaultContainerService: {
      createContainer: async () => ({
        id: Buffer.from('container-id') as never,
        rootFolderId: Buffer.from('root-folder-id') as never,
      }),
    },
    uploadService: {
      createSession: async () => ({
        id: Buffer.from('session-id') as never,
      }),
      receiveChunk: async () => ({}),
      finalize: async () => ({
        id: Buffer.from('file-id') as never,
        vaultContainerId: Buffer.from('container-id') as never,
        fileName: 'test.png',
        mimeType: 'image/png',
        sizeBytes: 100,
      }),
    },
    parseId: (id: string) => Buffer.from(id) as never,
  };
}

function createMockApplication() {
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
  } as never;
}

// Type for accessing private handlers
interface ControllerHandlers {
  handlers: {
    stage: (req: unknown) => Promise<{ statusCode: number; response: unknown }>;
    preview: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: unknown }>;
    commit: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: unknown }>;
    discard: (
      req: unknown,
    ) => Promise<{ statusCode: number; response: unknown }>;
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

let tempDir: string;
let stagingService: StagingService;
let controller: TempUploadController;
let controllerDeps: ITempUploadControllerDeps;

beforeEach(async () => {
  tokenCounter = 0;
  tempDir = await mkdtemp(join(tmpdir(), 'staging-ctrl-unit-'));
  const config = createConfig(tempDir);
  const deps = createStagingDeps();
  stagingService = new StagingService(config, deps);
  await stagingService.initialize();
  controllerDeps = createMockControllerDeps(stagingService);
  controller = new TempUploadController(
    createMockApplication(),
    controllerDeps,
    config,
  );
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('TempUploadController', () => {
  // ─── Stage (POST /) ─────────────────────────────────────────────────

  describe('POST / (stage)', () => {
    it('should return 201 with ITempUploadResponse on successful stage', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      // Stage a file directly via the staging service to test the response format
      const fileBuffer = Buffer.from('hello world');
      const record = await stagingService.stage(
        fileBuffer,
        'test.txt',
        'text/plain',
        'user-123',
      );

      // Verify the record was created correctly
      expect(record.commitToken).toBeTruthy();
      expect(record.originalFilename).toBe('test.txt');
      expect(record.mimeType).toBe('text/plain');
      expect(record.sizeBytes).toBe(fileBuffer.length);
      expect(record.uploaderId).toBe('user-123');

      // Test the handler with a mock request that simulates multer having already parsed the file
      const mockReq = {
        user: { id: 'user-123' },
        file: {
          buffer: fileBuffer,
          originalname: 'test.txt',
          mimetype: 'text/plain',
          size: fileBuffer.length,
        },
        body: {},
        params: {},
      };

      // We need to mock parseMultipartUpload since multer won't work in unit tests
      const originalParse = controller.parseMultipartUpload.bind(controller);
      controller.parseMultipartUpload = async () =>
        mockReq.file as Express.Multer.File;

      const result = await handlers.stage(mockReq);

      expect(result.statusCode).toBe(201);
      const response = result.response as {
        commitToken: string;
        previewUrl: string;
        expiresAt: string;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
      };
      expect(response.commitToken).toBeTruthy();
      expect(response.previewUrl).toContain('/api/temp-upload/');
      expect(response.previewUrl).toContain('/preview');
      expect(response.expiresAt).toBeTruthy();
      expect(response.originalFilename).toBe('test.txt');
      expect(response.mimeType).toBe('text/plain');
      expect(response.sizeBytes).toBe(fileBuffer.length);

      controller.parseMultipartUpload = originalParse;
    });

    it('should return 401 when user is not authenticated', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      controller.parseMultipartUpload = async () =>
        ({
          buffer: Buffer.from('test'),
          originalname: 'test.txt',
          mimetype: 'text/plain',
          size: 4,
        }) as Express.Multer.File;

      const result = await handlers.stage({
        user: undefined,
        body: {},
        params: {},
      });

      expect(result.statusCode).toBe(401);
    });

    it('should return error when no file is provided', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      controller.parseMultipartUpload = async () => null;

      const result = await handlers.stage({
        user: { id: 'user-123' },
        body: {},
        params: {},
      });

      expect(result.statusCode).toBe(400);
    });

    it('should return 413 when file exceeds size limit', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      controller.parseMultipartUpload = async () => {
        const err = new Error('File too large') as Error & { code: string };
        err.code = 'LIMIT_FILE_SIZE';
        throw err;
      };

      const result = await handlers.stage({
        user: { id: 'user-123' },
        body: {},
        params: {},
      });

      expect(result.statusCode).toBe(413);
    });
  });

  // ─── Preview (GET /:commitToken/preview) ────────────────────────────

  describe('GET /:commitToken/preview (preview)', () => {
    it('should return 404 for unknown commit token', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const result = await handlers.preview({
        params: { commitToken: 'nonexistent-token' },
      });

      expect(result.statusCode).toBe(404);
    });

    it('should return 410 for expired staged file', async () => {
      // Create a staging service with a time in the past
      const pastDeps = createStagingDeps({
        now: () => new Date('2024-01-01T00:00:00.000Z'),
      });
      const pastConfig = createConfig(tempDir, { defaultTtlSeconds: 1 });
      const pastService = new StagingService(pastConfig, pastDeps);
      await pastService.initialize();

      const record = await pastService.stage(
        Buffer.from('expired content'),
        'expired.txt',
        'text/plain',
        'user-123',
      );

      // Create a new controller with a staging service that reports current time
      const currentDeps = createStagingDeps({
        now: () => new Date('2025-01-15T12:00:00.000Z'),
        generateToken: pastDeps.generateToken,
      });
      const currentService = new StagingService(pastConfig, currentDeps);

      const currentControllerDeps = createMockControllerDeps(currentService);
      const currentController = new TempUploadController(
        createMockApplication(),
        currentControllerDeps,
        pastConfig,
      );

      const handlers = (currentController as unknown as ControllerHandlers)
        .handlers;

      const result = await handlers.preview({
        params: { commitToken: record.commitToken },
      });

      expect(result.statusCode).toBe(410);
    });
  });

  // ─── Commit (POST /:commitToken/commit) ─────────────────────────────

  describe('POST /:commitToken/commit (commit)', () => {
    it('should return 404 for unknown commit token', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const result = await handlers.commit({
        user: { id: 'user-123' },
        params: { commitToken: 'nonexistent-token' },
        body: { vaultContainerId: 'vault-123' },
      });

      expect(result.statusCode).toBe(404);
    });

    it('should return 401 when user is not authenticated', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const result = await handlers.commit({
        user: undefined,
        params: { commitToken: 'some-token' },
        body: { vaultContainerId: 'vault-123' },
      });

      expect(result.statusCode).toBe(401);
    });

    it('should return 403 when user does not match uploader', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const record = await stagingService.stage(
        Buffer.from('test content'),
        'test.txt',
        'text/plain',
        'user-123',
      );

      const result = await handlers.commit({
        user: { id: 'different-user' },
        params: { commitToken: record.commitToken },
        body: { vaultContainerId: 'vault-123' },
      });

      expect(result.statusCode).toBe(403);
    });

    it('should return 200 with ICommitResponse on successful commit', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const record = await stagingService.stage(
        Buffer.from('test content'),
        'test.txt',
        'text/plain',
        'user-123',
      );

      const result = await handlers.commit({
        user: { id: 'user-123' },
        params: { commitToken: record.commitToken },
        body: { vaultContainerId: 'vault-123', targetFolderId: 'folder-456' },
      });

      expect(result.statusCode).toBe(200);
      const response = result.response as {
        fileId: string;
        vaultContainerId: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
      };
      expect(response.fileId).toBeTruthy();
      expect(response.vaultContainerId).toBeTruthy();
      expect(response.fileName).toBeTruthy();
      expect(response.mimeType).toBeTruthy();
      expect(response.sizeBytes).toBeGreaterThan(0);
    });

    it('should return 422 when processing non-image file', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const record = await stagingService.stage(
        Buffer.from('not an image'),
        'document.pdf',
        'application/pdf',
        'user-123',
      );

      const result = await handlers.commit({
        user: { id: 'user-123' },
        params: { commitToken: record.commitToken },
        body: {
          vaultContainerId: 'vault-123',
          processingParams: { width: 256, height: 256, format: 'png' },
        },
      });

      expect(result.statusCode).toBe(422);
    });

    it('should return 410 for expired staged file', async () => {
      const pastDeps = createStagingDeps({
        now: () => new Date('2024-01-01T00:00:00.000Z'),
      });
      const pastConfig = createConfig(tempDir, { defaultTtlSeconds: 1 });
      const pastService = new StagingService(pastConfig, pastDeps);
      await pastService.initialize();

      const record = await pastService.stage(
        Buffer.from('expired content'),
        'expired.txt',
        'text/plain',
        'user-123',
      );

      const currentDeps = createStagingDeps({
        now: () => new Date('2025-01-15T12:00:00.000Z'),
        generateToken: pastDeps.generateToken,
      });
      const currentService = new StagingService(pastConfig, currentDeps);

      const currentControllerDeps = createMockControllerDeps(currentService);
      const currentController = new TempUploadController(
        createMockApplication(),
        currentControllerDeps,
        pastConfig,
      );

      const handlers = (currentController as unknown as ControllerHandlers)
        .handlers;

      const result = await handlers.commit({
        user: { id: 'user-123' },
        params: { commitToken: record.commitToken },
        body: { vaultContainerId: 'vault-123' },
      });

      expect(result.statusCode).toBe(410);
    });

    it('should return 200 with createContainer flow', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const record = await stagingService.stage(
        Buffer.from('test content'),
        'test.txt',
        'text/plain',
        'user-123',
      );

      const result = await handlers.commit({
        user: { id: 'user-123' },
        params: { commitToken: record.commitToken },
        body: {
          createContainer: {
            name: 'My Container',
            ownerId: 'user-123',
            visibility: 'private',
          },
        },
      });

      expect(result.statusCode).toBe(200);
      const response = result.response as {
        fileId: string;
        vaultContainerId: string;
      };
      expect(response.fileId).toBeTruthy();
      expect(response.vaultContainerId).toBeTruthy();
    });

    it('should return 400 when neither vaultContainerId nor createContainer is provided', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const record = await stagingService.stage(
        Buffer.from('test content'),
        'test.txt',
        'text/plain',
        'user-123',
      );

      const result = await handlers.commit({
        user: { id: 'user-123' },
        params: { commitToken: record.commitToken },
        body: {},
      });

      expect(result.statusCode).toBe(400);
    });
  });

  // ─── Discard (DELETE /:commitToken) ─────────────────────────────────

  describe('DELETE /:commitToken (discard)', () => {
    it('should return 204 on successful discard', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const record = await stagingService.stage(
        Buffer.from('test content'),
        'test.txt',
        'text/plain',
        'user-123',
      );

      const result = await handlers.discard({
        user: { id: 'user-123' },
        params: { commitToken: record.commitToken },
      });

      expect(result.statusCode).toBe(204);

      // Verify the file is actually removed
      const afterRecord = await stagingService.getRecord(record.commitToken);
      expect(afterRecord).toBeNull();
    });

    it('should return 404 for unknown commit token', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const result = await handlers.discard({
        user: { id: 'user-123' },
        params: { commitToken: 'nonexistent-token' },
      });

      expect(result.statusCode).toBe(404);
    });

    it('should return 403 when user does not match uploader', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const record = await stagingService.stage(
        Buffer.from('test content'),
        'test.txt',
        'text/plain',
        'user-123',
      );

      const result = await handlers.discard({
        user: { id: 'different-user' },
        params: { commitToken: record.commitToken },
      });

      expect(result.statusCode).toBe(403);
    });

    it('should return 401 when user is not authenticated', async () => {
      const handlers = (controller as unknown as ControllerHandlers).handlers;

      const result = await handlers.discard({
        user: undefined,
        params: { commitToken: 'some-token' },
      });

      expect(result.statusCode).toBe(401);
    });
  });
});
