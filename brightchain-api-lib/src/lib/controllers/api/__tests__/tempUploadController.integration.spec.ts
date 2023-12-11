/**
 * Integration tests for the full temporary upload staging lifecycle.
 *
 * Tests the complete flow through StagingService + StagingCleanupScheduler
 * without the HTTP layer (direct service calls). Only vault services are mocked.
 *
 * Requirements: 1.1, 2.1, 3.1, 3.5, 4.1, 5.1, 5.2
 */

import type { IStagingConfig } from '@brightchain/brightchain-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'crypto';
import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  StagingCleanupEvent,
  StagingCleanupScheduler,
} from '../../../services/staging/stagingCleanupScheduler';
import type { IStagingServiceDeps } from '../../../services/staging/stagingService';
import { StagingService } from '../../../services/staging/stagingService';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Controllable clock for deterministic time-based tests. */
class TestClock {
  private _now: Date;
  constructor(initial: Date = new Date('2025-01-15T12:00:00.000Z')) {
    this._now = new Date(initial);
  }
  now(): Date {
    return new Date(this._now);
  }
  advance(ms: number): void {
    this._now = new Date(this._now.getTime() + ms);
  }
}

function createStagingDeps(clock: TestClock): IStagingServiceDeps {
  return {
    generateToken: () => randomUUID(),
    now: () => clock.now(),
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

/** Mock vault services that record calls for verification. */
function createMockVaultServices() {
  const calls: {
    createContainer: unknown[];
    createSession: unknown[];
    receiveChunk: unknown[];
    finalize: unknown[];
  } = {
    createContainer: [],
    createSession: [],
    receiveChunk: [],
    finalize: [],
  };

  const vaultContainerService = {
    createContainer: async (params: unknown) => {
      calls.createContainer.push(params);
      return {
        id: Buffer.from('container-id'),
        rootFolderId: Buffer.from('root-folder-id'),
      };
    },
  };

  const uploadService = {
    createSession: async (params: unknown) => {
      calls.createSession.push(params);
      return { id: Buffer.from('session-id') };
    },
    receiveChunk: async (
      sessionId: unknown,
      chunkIndex: unknown,
      data: unknown,
      checksum: unknown,
    ) => {
      calls.receiveChunk.push({ sessionId, chunkIndex, data, checksum });
      return {};
    },
    finalize: async (sessionId: unknown) => {
      calls.finalize.push(sessionId);
      return {
        id: Buffer.from('permanent-file-id'),
        vaultContainerId: Buffer.from('container-id'),
        fileName: 'uploaded.png',
        mimeType: 'image/png',
        sizeBytes: 100,
      };
    },
  };

  return { vaultContainerService, uploadService, calls };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'staging-integration-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('TempUploadController Integration', () => {
  // ─── Upload → Preview → Commit → Verify vault entry ────────────────

  describe('upload → preview → commit → verify vault entry', () => {
    it('should stage a file, preview it, commit to vault, and clean up staging', async () => {
      const clock = new TestClock();
      const config = createConfig(tempDir);
      const deps = createStagingDeps(clock);
      const stagingService = new StagingService(config, deps);
      await stagingService.initialize();

      const { vaultContainerService, uploadService, calls } =
        createMockVaultServices();

      // 1. Stage a file
      const fileContent = Buffer.from('Hello, BrightChain!');
      const record = await stagingService.stage(
        fileContent,
        'greeting.txt',
        'text/plain',
        'user-42',
        1800,
      );

      expect(record.commitToken).toBeTruthy();
      expect(record.originalFilename).toBe('greeting.txt');
      expect(record.mimeType).toBe('text/plain');
      expect(record.sizeBytes).toBe(fileContent.length);

      // 2. Preview the staged file
      const previewRecord = await stagingService.getRecord(record.commitToken);
      expect(previewRecord).not.toBeNull();
      expect(previewRecord!.mimeType).toBe('text/plain');

      const previewBytes = await stagingService.readFile(record.commitToken);
      expect(previewBytes).toEqual(fileContent);

      // 3. Commit to vault (simulate the controller's commit flow)
      expect(stagingService.isExpired(previewRecord!)).toBe(false);

      // Create upload session
      const session = await uploadService.createSession({
        userId: Buffer.from('user-42'),
        fileName: previewRecord!.originalFilename,
        mimeType: previewRecord!.mimeType,
        totalSizeBytes: previewRecord!.sizeBytes,
        targetFolderId: Buffer.from('folder-1'),
        vaultContainerId: Buffer.from('container-1'),
      });

      // Upload chunk
      const { createHash } = await import('crypto');
      const checksum = createHash('sha256').update(previewBytes).digest('hex');
      await uploadService.receiveChunk(
        session.id,
        0,
        new Uint8Array(previewBytes),
        checksum,
      );

      // Finalize
      const fileMetadata = await uploadService.finalize(session.id);
      expect(fileMetadata.fileId ?? fileMetadata.id).toBeTruthy();
      expect(fileMetadata.vaultContainerId).toBeTruthy();

      // Remove staged file after successful commit
      await stagingService.remove(record.commitToken);

      // 4. Verify vault services were called
      expect(calls.createSession).toHaveLength(1);
      expect(calls.receiveChunk).toHaveLength(1);
      expect(calls.finalize).toHaveLength(1);

      // 5. Verify staging is cleaned up
      const afterRecord = await stagingService.getRecord(record.commitToken);
      expect(afterRecord).toBeNull();

      // Verify no files remain in staging directory
      const remainingFiles = await readdir(tempDir);
      expect(remainingFiles).toHaveLength(0);
    });
  });

  // ─── Upload → Preview → Discard → Verify cleanup ───────────────────

  describe('upload → preview → discard → verify cleanup', () => {
    it('should stage a file, preview it, discard it, and verify cleanup', async () => {
      const clock = new TestClock();
      const config = createConfig(tempDir);
      const deps = createStagingDeps(clock);
      const stagingService = new StagingService(config, deps);
      await stagingService.initialize();

      // 1. Stage a file
      const fileContent = Buffer.from('Temporary content');
      const record = await stagingService.stage(
        fileContent,
        'temp.txt',
        'text/plain',
        'user-99',
      );

      // 2. Preview — verify file is accessible
      const previewBytes = await stagingService.readFile(record.commitToken);
      expect(previewBytes).toEqual(fileContent);

      // 3. Discard
      await stagingService.remove(record.commitToken);

      // 4. Verify cleanup — getRecord returns null
      const afterRecord = await stagingService.getRecord(record.commitToken);
      expect(afterRecord).toBeNull();

      // 5. Verify no files remain in staging directory
      const remainingFiles = await readdir(tempDir);
      expect(remainingFiles).toHaveLength(0);

      // 6. Verify readFile throws for discarded file
      await expect(
        stagingService.readFile(record.commitToken),
      ).rejects.toThrow();
    });
  });

  // ─── Upload with short TTL → Verify 410 on preview after expiry ────

  describe('upload with short TTL → verify 410 on preview after expiry', () => {
    it('should return expired status after TTL elapses', async () => {
      const clock = new TestClock();
      const config = createConfig(tempDir, { defaultTtlSeconds: 5 });
      const deps = createStagingDeps(clock);
      const stagingService = new StagingService(config, deps);
      await stagingService.initialize();

      // 1. Stage a file with a short TTL (5 seconds via config default)
      const fileContent = Buffer.from('Short-lived content');
      const record = await stagingService.stage(
        fileContent,
        'ephemeral.txt',
        'text/plain',
        'user-77',
      );

      // 2. Immediately after staging, file should not be expired
      const freshRecord = await stagingService.getRecord(record.commitToken);
      expect(freshRecord).not.toBeNull();
      expect(stagingService.isExpired(freshRecord!)).toBe(false);

      // 3. Advance clock past TTL (5 seconds + 1ms)
      clock.advance(5001);

      // 4. File should now be expired
      const expiredRecord = await stagingService.getRecord(record.commitToken);
      expect(expiredRecord).not.toBeNull();
      expect(stagingService.isExpired(expiredRecord!)).toBe(true);

      // 5. The file bytes are still on disk (cleanup hasn't run yet),
      //    but the controller would return 410 based on isExpired()
      const fileStillOnDisk = await stagingService.readFile(record.commitToken);
      expect(fileStillOnDisk).toEqual(fileContent);
    });
  });

  // ─── Stage multiple files with different TTLs → Run cleanup ─────────

  describe('stage multiple files with different TTLs → run cleanup → verify correct files removed', () => {
    it('should clean up only expired files and leave non-expired files intact', async () => {
      const clock = new TestClock();
      const config = createConfig(tempDir, {
        maxTtlSeconds: 86400,
        cleanupIntervalMs: 1000,
      });
      const deps = createStagingDeps(clock);
      const stagingService = new StagingService(config, deps);
      await stagingService.initialize();

      // Stage files with different TTLs
      const shortLived1 = await stagingService.stage(
        Buffer.from('short-1'),
        'short1.txt',
        'text/plain',
        'user-1',
        10, // 10 seconds TTL
      );

      const shortLived2 = await stagingService.stage(
        Buffer.from('short-2'),
        'short2.txt',
        'text/plain',
        'user-2',
        20, // 20 seconds TTL
      );

      const longLived = await stagingService.stage(
        Buffer.from('long-lived'),
        'long.txt',
        'text/plain',
        'user-3',
        3600, // 1 hour TTL
      );

      const mediumLived = await stagingService.stage(
        Buffer.from('medium'),
        'medium.txt',
        'text/plain',
        'user-4',
        60, // 60 seconds TTL
      );

      // Verify all 4 files are staged (4 raw files + 4 sidecars = 8 entries)
      const allFiles = await readdir(tempDir);
      expect(allFiles).toHaveLength(8);

      // Advance clock by 15 seconds — shortLived1 (10s) should be expired
      clock.advance(15_000);

      // Create cleanup scheduler and run a tick
      const scheduler = new StagingCleanupScheduler(
        stagingService,
        config.cleanupIntervalMs,
      );

      const cleanedCount1 = await scheduler.tick();
      expect(cleanedCount1).toBe(1);

      // Verify shortLived1 is gone
      expect(
        await stagingService.getRecord(shortLived1.commitToken),
      ).toBeNull();
      // Verify others still exist
      expect(
        await stagingService.getRecord(shortLived2.commitToken),
      ).not.toBeNull();
      expect(
        await stagingService.getRecord(longLived.commitToken),
      ).not.toBeNull();
      expect(
        await stagingService.getRecord(mediumLived.commitToken),
      ).not.toBeNull();

      // Advance clock by another 10 seconds (total 25s) — shortLived2 (20s) should be expired
      clock.advance(10_000);

      const cleanedCount2 = await scheduler.tick();
      expect(cleanedCount2).toBe(1);

      // Verify shortLived2 is gone
      expect(
        await stagingService.getRecord(shortLived2.commitToken),
      ).toBeNull();
      // Verify long-lived and medium-lived still exist
      expect(
        await stagingService.getRecord(longLived.commitToken),
      ).not.toBeNull();
      expect(
        await stagingService.getRecord(mediumLived.commitToken),
      ).not.toBeNull();

      // Advance clock by 40 seconds (total 65s) — mediumLived (60s) should be expired
      clock.advance(40_000);

      const cleanedCount3 = await scheduler.tick();
      expect(cleanedCount3).toBe(1);

      // Verify mediumLived is gone
      expect(
        await stagingService.getRecord(mediumLived.commitToken),
      ).toBeNull();
      // Verify long-lived still exists
      expect(
        await stagingService.getRecord(longLived.commitToken),
      ).not.toBeNull();

      // Verify only the long-lived file remains (1 raw + 1 sidecar = 2 entries)
      const remainingFiles = await readdir(tempDir);
      expect(remainingFiles).toHaveLength(2);

      // Verify the long-lived file content is intact
      const longLivedBytes = await stagingService.readFile(
        longLived.commitToken,
      );
      expect(longLivedBytes).toEqual(Buffer.from('long-lived'));
    });

    it('should emit correct events during cleanup', async () => {
      const clock = new TestClock();
      const config = createConfig(tempDir, { cleanupIntervalMs: 1000 });
      const deps = createStagingDeps(clock);
      const stagingService = new StagingService(config, deps);
      await stagingService.initialize();

      // Stage two files with short TTLs
      await stagingService.stage(
        Buffer.from('file-a'),
        'a.txt',
        'text/plain',
        'user-1',
        5,
      );
      await stagingService.stage(
        Buffer.from('file-b'),
        'b.txt',
        'text/plain',
        'user-2',
        5,
      );

      // Advance past TTL
      clock.advance(6000);

      const scheduler = new StagingCleanupScheduler(
        stagingService,
        config.cleanupIntervalMs,
      );

      const fileCleanedEvents: unknown[] = [];
      const batchCleanedEvents: unknown[] = [];

      scheduler.on(StagingCleanupEvent.FILE_CLEANED, (payload) => {
        fileCleanedEvents.push(payload);
      });
      scheduler.on(StagingCleanupEvent.BATCH_CLEANED, (payload) => {
        batchCleanedEvents.push(payload);
      });

      const cleanedCount = await scheduler.tick();

      expect(cleanedCount).toBe(2);
      expect(fileCleanedEvents).toHaveLength(2);
      expect(batchCleanedEvents).toHaveLength(1);

      const batchPayload = batchCleanedEvents[0] as {
        cleanedCount: number;
        failedCount: number;
        totalExpired: number;
      };
      expect(batchPayload.cleanedCount).toBe(2);
      expect(batchPayload.failedCount).toBe(0);
      expect(batchPayload.totalExpired).toBe(2);
    });
  });
});
