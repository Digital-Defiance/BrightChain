/**
 * Unit tests for StagingCleanupScheduler.
 *
 * Tests specific examples, edge cases, and lifecycle operations.
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type { IStagingConfig } from '@brightchain/brightchain-lib';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type {
  IBatchCleanedPayload,
  ICleanupErrorPayload,
  IFileCleanedPayload,
} from '../stagingCleanupScheduler';
import {
  StagingCleanupEvent,
  StagingCleanupScheduler,
} from '../stagingCleanupScheduler';
import type { IStagingServiceDeps } from '../stagingService';
import { StagingService } from '../stagingService';

// ─── Helpers ────────────────────────────────────────────────────────────────

let tokenCounter = 0;

function createDeps(
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

// ─── Test Suite ─────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(async () => {
  tokenCounter = 0;
  tempDir = await mkdtemp(join(tmpdir(), 'staging-cleanup-unit-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('StagingCleanupScheduler', () => {
  // ─── start() / stop() lifecycle and isRunning state ────────────────────

  describe('start() / stop() lifecycle', () => {
    it('isRunning is false before start', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      expect(scheduler.isRunning).toBe(false);
    });

    it('isRunning is true after start', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      scheduler.start();
      expect(scheduler.isRunning).toBe(true);

      scheduler.stop();
    });

    it('isRunning is false after stop', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      scheduler.start();
      scheduler.stop();
      expect(scheduler.isRunning).toBe(false);
    });

    it('emits STARTED event on start', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      const startedHandler = jest.fn();
      scheduler.on(StagingCleanupEvent.STARTED, startedHandler);

      scheduler.start();
      expect(startedHandler).toHaveBeenCalledTimes(1);

      scheduler.stop();
    });

    it('emits STOPPED event on stop', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      const stoppedHandler = jest.fn();
      scheduler.on(StagingCleanupEvent.STOPPED, stoppedHandler);

      scheduler.start();
      scheduler.stop();
      expect(stoppedHandler).toHaveBeenCalledTimes(1);
    });

    it('is idempotent on start (no error on double start)', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      scheduler.start();
      // Second start should not throw
      expect(() => scheduler.start()).not.toThrow();
      expect(scheduler.isRunning).toBe(true);

      scheduler.stop();
    });

    it('is safe to stop when not running', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      // Should not throw
      expect(() => scheduler.stop()).not.toThrow();
      expect(scheduler.isRunning).toBe(false);
    });

    it('can be restarted after stop', () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      const scheduler = new StagingCleanupScheduler(service, 60000);

      scheduler.start();
      expect(scheduler.isRunning).toBe(true);

      scheduler.stop();
      expect(scheduler.isRunning).toBe(false);

      scheduler.start();
      expect(scheduler.isRunning).toBe(true);

      scheduler.stop();
    });
  });

  // ─── tick() with no expired files ──────────────────────────────────────

  describe('tick() with no expired files', () => {
    it('returns 0 when no files are expired', async () => {
      const now = new Date('2025-01-15T12:00:00.000Z');
      const config = createConfig(tempDir);
      const service = new StagingService(
        config,
        createDeps({ now: () => now }),
      );
      await service.initialize();

      // Stage a file with a long TTL (not expired)
      const fileBuffer = Buffer.from('valid file', 'utf-8');
      await service.stage(
        fileBuffer,
        'valid.txt',
        'text/plain',
        'user-1',
        7200,
      );

      const scheduler = new StagingCleanupScheduler(service, 60000);
      const cleanedCount = await scheduler.tick();

      expect(cleanedCount).toBe(0);
    });

    it('returns 0 when staging directory is empty', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      const scheduler = new StagingCleanupScheduler(service, 60000);
      const cleanedCount = await scheduler.tick();

      expect(cleanedCount).toBe(0);
    });

    it('emits BATCH_CLEANED with cleanedCount 0 when no files expired', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      const scheduler = new StagingCleanupScheduler(service, 60000);

      const batchHandler = jest.fn();
      scheduler.on(StagingCleanupEvent.BATCH_CLEANED, batchHandler);

      await scheduler.tick();

      expect(batchHandler).toHaveBeenCalledTimes(1);
      const payload = batchHandler.mock.calls[0][0] as IBatchCleanedPayload;
      expect(payload.cleanedCount).toBe(0);
      expect(payload.failedCount).toBe(0);
      expect(payload.totalExpired).toBe(0);
    });
  });

  // ─── tick() with mixed expired/valid files ─────────────────────────────

  describe('tick() with mixed expired/valid files', () => {
    it('removes only expired files and leaves valid files', async () => {
      const stageTime = new Date('2025-01-15T10:00:00.000Z');
      const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

      // Stage files at stageTime
      const stageService = new StagingService(
        config,
        createDeps({ now: () => stageTime }),
      );
      await stageService.initialize();

      const fileBuffer = Buffer.from('test data', 'utf-8');

      // File with 30-minute TTL → expires at 10:30 → expired at 12:00
      const expiredRecord = await stageService.stage(
        fileBuffer,
        'expired.txt',
        'text/plain',
        'user-1',
        1800,
      );

      // File with 4-hour TTL → expires at 14:00 → valid at 12:00
      const validRecord = await stageService.stage(
        fileBuffer,
        'valid.txt',
        'text/plain',
        'user-2',
        14400,
      );

      // Cleanup at referenceTime
      const referenceTime = new Date('2025-01-15T12:00:00.000Z');
      const cleanupService = new StagingService(
        config,
        createDeps({ now: () => referenceTime }),
      );

      const scheduler = new StagingCleanupScheduler(cleanupService, 60000);
      const cleanedCount = await scheduler.tick();

      expect(cleanedCount).toBe(1);

      // Expired file should be gone
      const expiredResult = await cleanupService.getRecord(
        expiredRecord.commitToken,
      );
      expect(expiredResult).toBeNull();

      // Valid file should still exist
      const validResult = await cleanupService.getRecord(
        validRecord.commitToken,
      );
      expect(validResult).not.toBeNull();
      expect(validResult!.commitToken).toBe(validRecord.commitToken);

      // Clean up
      await cleanupService.remove(validRecord.commitToken);
    });
  });

  // ─── Event emission ────────────────────────────────────────────────────

  describe('event emission', () => {
    it('emits FILE_CLEANED for each expired file removed', async () => {
      const stageTime = new Date('2025-01-15T10:00:00.000Z');
      const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

      const stageService = new StagingService(
        config,
        createDeps({ now: () => stageTime }),
      );
      await stageService.initialize();

      const fileBuffer = Buffer.from('test', 'utf-8');

      // Stage two expired files
      const record1 = await stageService.stage(
        fileBuffer,
        'file1.txt',
        'text/plain',
        'user-1',
        60,
      );
      const record2 = await stageService.stage(
        fileBuffer,
        'file2.txt',
        'text/plain',
        'user-1',
        120,
      );

      const referenceTime = new Date('2025-01-15T12:00:00.000Z');
      const cleanupService = new StagingService(
        config,
        createDeps({ now: () => referenceTime }),
      );

      const scheduler = new StagingCleanupScheduler(cleanupService, 60000);

      const fileCleanedHandler = jest.fn();
      scheduler.on(StagingCleanupEvent.FILE_CLEANED, fileCleanedHandler);

      await scheduler.tick();

      expect(fileCleanedHandler).toHaveBeenCalledTimes(2);

      // Verify payloads contain commit token, filename, and age
      const payloads = fileCleanedHandler.mock.calls.map(
        (c) => c[0] as IFileCleanedPayload,
      );
      const tokens = payloads.map((p) => p.commitToken);
      expect(tokens).toContain(record1.commitToken);
      expect(tokens).toContain(record2.commitToken);

      for (const payload of payloads) {
        expect(payload.originalFilename).toBeDefined();
        expect(typeof payload.ageMs).toBe('number');
        expect(payload.ageMs).toBeGreaterThan(0);
      }
    });

    it('emits BATCH_CLEANED after processing all expired files', async () => {
      const stageTime = new Date('2025-01-15T10:00:00.000Z');
      const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

      const stageService = new StagingService(
        config,
        createDeps({ now: () => stageTime }),
      );
      await stageService.initialize();

      const fileBuffer = Buffer.from('test', 'utf-8');
      await stageService.stage(
        fileBuffer,
        'file1.txt',
        'text/plain',
        'user-1',
        60,
      );
      await stageService.stage(
        fileBuffer,
        'file2.txt',
        'text/plain',
        'user-1',
        120,
      );

      const referenceTime = new Date('2025-01-15T12:00:00.000Z');
      const cleanupService = new StagingService(
        config,
        createDeps({ now: () => referenceTime }),
      );

      const scheduler = new StagingCleanupScheduler(cleanupService, 60000);

      const batchHandler = jest.fn();
      scheduler.on(StagingCleanupEvent.BATCH_CLEANED, batchHandler);

      await scheduler.tick();

      expect(batchHandler).toHaveBeenCalledTimes(1);
      const payload = batchHandler.mock.calls[0][0] as IBatchCleanedPayload;
      expect(payload.cleanedCount).toBe(2);
      expect(payload.failedCount).toBe(0);
      expect(payload.totalExpired).toBe(2);
    });

    it('emits ERROR for each failed file deletion', async () => {
      const stageTime = new Date('2025-01-15T10:00:00.000Z');
      const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

      const stageService = new StagingService(
        config,
        createDeps({ now: () => stageTime }),
      );
      await stageService.initialize();

      const fileBuffer = Buffer.from('test', 'utf-8');
      const record = await stageService.stage(
        fileBuffer,
        'fail.txt',
        'text/plain',
        'user-1',
        60,
      );

      const referenceTime = new Date('2025-01-15T12:00:00.000Z');
      const cleanupService = new StagingService(
        config,
        createDeps({ now: () => referenceTime }),
      );

      // Mock remove to fail
      const originalRemove = cleanupService.remove.bind(cleanupService);
      cleanupService.remove = jest.fn(async () => {
        throw new Error('Simulated deletion failure');
      }) as typeof cleanupService.remove;

      const scheduler = new StagingCleanupScheduler(cleanupService, 60000);

      const errorHandler = jest.fn();
      scheduler.on(StagingCleanupEvent.ERROR, errorHandler);

      await scheduler.tick();

      expect(errorHandler).toHaveBeenCalledTimes(1);
      const payload = errorHandler.mock.calls[0][0] as ICleanupErrorPayload;
      expect(payload.commitToken).toBe(record.commitToken);
      expect(payload.originalFilename).toBe('fail.txt');
      expect(payload.error).toBeDefined();

      // Clean up manually
      await originalRemove(record.commitToken);
    });

    it('emits BATCH_CLEANED with correct counts when some deletions fail', async () => {
      const stageTime = new Date('2025-01-15T10:00:00.000Z');
      const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

      const stageService = new StagingService(
        config,
        createDeps({ now: () => stageTime }),
      );
      await stageService.initialize();

      const fileBuffer = Buffer.from('test', 'utf-8');
      const failRecord = await stageService.stage(
        fileBuffer,
        'fail.txt',
        'text/plain',
        'user-1',
        60,
      );
      const successRecord = await stageService.stage(
        fileBuffer,
        'success.txt',
        'text/plain',
        'user-1',
        120,
      );

      const referenceTime = new Date('2025-01-15T12:00:00.000Z');
      const cleanupService = new StagingService(
        config,
        createDeps({ now: () => referenceTime }),
      );

      // Mock remove to fail only for the first token
      const originalRemove = cleanupService.remove.bind(cleanupService);
      cleanupService.remove = jest.fn(async (commitToken: string) => {
        if (commitToken === failRecord.commitToken) {
          throw new Error('Simulated failure');
        }
        return originalRemove(commitToken);
      }) as typeof cleanupService.remove;

      const scheduler = new StagingCleanupScheduler(cleanupService, 60000);

      const batchHandler = jest.fn();
      scheduler.on(StagingCleanupEvent.BATCH_CLEANED, batchHandler);

      const cleanedCount = await scheduler.tick();

      expect(cleanedCount).toBe(1);
      expect(batchHandler).toHaveBeenCalledTimes(1);

      const payload = batchHandler.mock.calls[0][0] as IBatchCleanedPayload;
      expect(payload.cleanedCount).toBe(1);
      expect(payload.failedCount).toBe(1);
      expect(payload.totalExpired).toBe(2);

      // Clean up the failed file manually
      await originalRemove(failRecord.commitToken);
    });
  });

  // ─── tick() logs each cleanup action ───────────────────────────────────

  describe('tick() logs each cleanup action', () => {
    it('FILE_CLEANED events contain commit token, filename, and age', async () => {
      const stageTime = new Date('2025-01-15T10:00:00.000Z');
      const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

      const stageService = new StagingService(
        config,
        createDeps({ now: () => stageTime }),
      );
      await stageService.initialize();

      const fileBuffer = Buffer.from('log test', 'utf-8');
      // TTL of 30 minutes → expires at 10:30
      const record = await stageService.stage(
        fileBuffer,
        'logged-file.txt',
        'text/plain',
        'user-1',
        1800,
      );

      const referenceTime = new Date('2025-01-15T12:00:00.000Z');
      const cleanupService = new StagingService(
        config,
        createDeps({ now: () => referenceTime }),
      );

      const scheduler = new StagingCleanupScheduler(cleanupService, 60000);

      const fileCleanedEvents: IFileCleanedPayload[] = [];
      scheduler.on(
        StagingCleanupEvent.FILE_CLEANED,
        (payload: IFileCleanedPayload) => {
          fileCleanedEvents.push(payload);
        },
      );

      await scheduler.tick();

      expect(fileCleanedEvents).toHaveLength(1);
      const event = fileCleanedEvents[0];

      // Commit token
      expect(event.commitToken).toBe(record.commitToken);

      // Original filename
      expect(event.originalFilename).toBe('logged-file.txt');

      // Age: the file expired at 10:30, cleanup runs at 12:00 → age > 0
      expect(event.ageMs).toBeGreaterThan(0);
    });
  });
});
