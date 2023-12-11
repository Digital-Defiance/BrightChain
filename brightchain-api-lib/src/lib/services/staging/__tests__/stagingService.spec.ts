/**
 * Unit tests for StagingService.
 *
 * Tests specific examples, edge cases, and lifecycle operations.
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 4.1, 7.3, 7.4, 7.5
 */

import type { IStagingConfig } from '@brightchain/brightchain-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { constants as fsConstants } from 'fs';
import {
  access,
  readFile as fsReadFile,
  mkdtemp,
  rm,
  unlink,
} from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { IStagingServiceDeps } from '../stagingService';
import { StagingService } from '../stagingService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  tempDir = await mkdtemp(join(tmpdir(), 'staging-unit-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('StagingService', () => {
  // ─── initialize() ──────────────────────────────────────────────────────

  describe('initialize()', () => {
    it('creates the staging directory if it does not exist', async () => {
      const nestedDir = join(tempDir, 'nested', 'staging', 'dir');
      const config = createConfig(nestedDir);
      const service = new StagingService(config, createDeps());

      await service.initialize();

      await expect(
        access(nestedDir, fsConstants.W_OK),
      ).resolves.toBeUndefined();
    });

    it('succeeds if the staging directory already exists', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());

      // Initialize twice — should not throw
      await service.initialize();
      await service.initialize();

      await expect(access(tempDir, fsConstants.W_OK)).resolves.toBeUndefined();
    });
  });

  // ─── stage() → getRecord() → readFile() → remove() lifecycle ──────────

  describe('stage → getRecord → readFile → remove lifecycle', () => {
    it('completes the full lifecycle correctly', async () => {
      const config = createConfig(tempDir);
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      const service = new StagingService(
        config,
        createDeps({ now: () => fixedNow }),
      );
      await service.initialize();

      const fileBuffer = Buffer.from('hello staging world', 'utf-8');
      const filename = 'test-file.txt';
      const mimeType = 'text/plain';
      const uploaderId = 'user-123';

      // Stage
      const record = await service.stage(
        fileBuffer,
        filename,
        mimeType,
        uploaderId,
      );
      expect(record.commitToken).toMatch(UUID_V4_RE);
      expect(record.originalFilename).toBe(filename);
      expect(record.mimeType).toBe(mimeType);
      expect(record.sizeBytes).toBe(fileBuffer.length);
      expect(record.uploaderId).toBe(uploaderId);
      expect(record.uploadedAt).toBe(fixedNow.toISOString());

      // getRecord
      const retrieved = await service.getRecord(record.commitToken);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.commitToken).toBe(record.commitToken);
      expect(retrieved!.originalFilename).toBe(filename);

      // readFile
      const readBack = await service.readFile(record.commitToken);
      expect(readBack.equals(fileBuffer)).toBe(true);

      // remove
      await service.remove(record.commitToken);

      // Verify cleanup
      const afterRemove = await service.getRecord(record.commitToken);
      expect(afterRemove).toBeNull();
    });
  });

  // ─── getRecord() returns null for unknown token ────────────────────────

  describe('getRecord()', () => {
    it('returns null for an unknown commit token', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      const result = await service.getRecord('nonexistent-token-12345');
      expect(result).toBeNull();
    });
  });

  // ─── isExpired() boundary ──────────────────────────────────────────────

  describe('isExpired()', () => {
    it('returns false when current time is before expiresAt', () => {
      const now = new Date('2025-01-15T12:00:00.000Z');
      const service = new StagingService(
        createConfig(tempDir),
        createDeps({ now: () => now }),
      );

      const record = {
        commitToken: 'test-token',
        originalFilename: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploadedAt: '2025-01-15T11:00:00.000Z',
        expiresAt: '2025-01-15T13:00:00.000Z', // 1 hour in the future
        uploaderId: 'user-1',
      };

      expect(service.isExpired(record)).toBe(false);
    });

    it('returns true when current time is after expiresAt', () => {
      const now = new Date('2025-01-15T14:00:00.000Z');
      const service = new StagingService(
        createConfig(tempDir),
        createDeps({ now: () => now }),
      );

      const record = {
        commitToken: 'test-token',
        originalFilename: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploadedAt: '2025-01-15T11:00:00.000Z',
        expiresAt: '2025-01-15T13:00:00.000Z', // 1 hour in the past
        uploaderId: 'user-1',
      };

      expect(service.isExpired(record)).toBe(true);
    });

    it('returns false when current time is exactly at expiresAt (not strictly past)', () => {
      const exactTime = new Date('2025-01-15T13:00:00.000Z');
      const service = new StagingService(
        createConfig(tempDir),
        createDeps({ now: () => exactTime }),
      );

      const record = {
        commitToken: 'test-token',
        originalFilename: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploadedAt: '2025-01-15T11:00:00.000Z',
        expiresAt: '2025-01-15T13:00:00.000Z', // exactly now
        uploaderId: 'user-1',
      };

      // isExpired uses `expiresAt < now`, so exactly equal is NOT expired
      expect(service.isExpired(record)).toBe(false);
    });

    it('returns true when current time is 1ms after expiresAt', () => {
      const justAfter = new Date('2025-01-15T13:00:00.001Z');
      const service = new StagingService(
        createConfig(tempDir),
        createDeps({ now: () => justAfter }),
      );

      const record = {
        commitToken: 'test-token',
        originalFilename: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 100,
        uploadedAt: '2025-01-15T11:00:00.000Z',
        expiresAt: '2025-01-15T13:00:00.000Z',
        uploaderId: 'user-1',
      };

      expect(service.isExpired(record)).toBe(true);
    });
  });

  // ─── findExpired() with mixed expired/valid files ──────────────────────

  describe('findExpired()', () => {
    it('returns only expired records from a mix of expired and valid files', async () => {
      const now = new Date('2025-01-15T12:00:00.000Z');
      const config = createConfig(tempDir);
      const service = new StagingService(
        config,
        createDeps({ now: () => now }),
      );
      await service.initialize();

      const fileBuffer = Buffer.from('test data', 'utf-8');

      // Stage a file with short TTL (already expired relative to "now")
      const expiredRecord = await service.stage(
        fileBuffer,
        'expired.txt',
        'text/plain',
        'user-1',
        10,
      );

      // Stage a file with long TTL (still valid)
      const validRecord = await service.stage(
        fileBuffer,
        'valid.txt',
        'text/plain',
        'user-2',
        7200,
      );

      // Advance time past the short TTL but not the long one
      const laterNow = new Date('2025-01-15T12:01:00.000Z'); // 60 seconds later
      const laterService = new StagingService(
        config,
        createDeps({ now: () => laterNow }),
      );

      const expired = await laterService.findExpired();

      const expiredTokens = expired.map((r) => r.commitToken);
      expect(expiredTokens).toContain(expiredRecord.commitToken);
      expect(expiredTokens).not.toContain(validRecord.commitToken);

      // Clean up
      await service.remove(expiredRecord.commitToken);
      await service.remove(validRecord.commitToken);
    });

    it('returns empty array when no files are expired', async () => {
      const now = new Date('2025-01-15T12:00:00.000Z');
      const config = createConfig(tempDir);
      const service = new StagingService(
        config,
        createDeps({ now: () => now }),
      );
      await service.initialize();

      const fileBuffer = Buffer.from('test data', 'utf-8');
      const record = await service.stage(
        fileBuffer,
        'valid.txt',
        'text/plain',
        'user-1',
        7200,
      );

      const expired = await service.findExpired();
      expect(expired).toHaveLength(0);

      // Clean up
      await service.remove(record.commitToken);
    });
  });

  // ─── Atomic sidecar write ─────────────────────────────────────────────

  describe('atomic sidecar write', () => {
    it('writes sidecar via temp file then rename (no .tmp file remains)', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      const fileBuffer = Buffer.from('atomic test', 'utf-8');
      const record = await service.stage(
        fileBuffer,
        'atomic.txt',
        'text/plain',
        'user-1',
      );

      // The .tmp file should not exist after staging completes
      const tmpPath = join(tempDir, `${record.commitToken}.meta.json.tmp`);
      await expect(access(tmpPath, fsConstants.F_OK)).rejects.toThrow();

      // The final sidecar should exist and be valid JSON
      const sidecarPath = join(tempDir, `${record.commitToken}.meta.json`);
      const sidecarData = JSON.parse(await fsReadFile(sidecarPath, 'utf-8'));
      expect(sidecarData.commitToken).toBe(record.commitToken);

      // Clean up
      await service.remove(record.commitToken);
    });
  });

  // ─── Orphaned file handling ────────────────────────────────────────────

  describe('orphaned file handling', () => {
    it('returns null and cleans up when sidecar exists but raw file is missing', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      const fileBuffer = Buffer.from('orphan test', 'utf-8');
      const record = await service.stage(
        fileBuffer,
        'orphan.txt',
        'text/plain',
        'user-1',
      );

      // Manually delete the raw file to simulate orphaned sidecar
      const filePath = join(tempDir, record.commitToken);
      await unlink(filePath);

      // getRecord should return null and clean up the orphaned sidecar
      const result = await service.getRecord(record.commitToken);
      expect(result).toBeNull();

      // Sidecar should also be cleaned up
      const sidecarPath = join(tempDir, `${record.commitToken}.meta.json`);
      await expect(access(sidecarPath, fsConstants.F_OK)).rejects.toThrow();
    });

    it('returns null and cleans up when raw file exists but sidecar is missing', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      const fileBuffer = Buffer.from('orphan test', 'utf-8');
      const record = await service.stage(
        fileBuffer,
        'orphan.txt',
        'text/plain',
        'user-1',
      );

      // Manually delete the sidecar to simulate orphaned raw file
      const sidecarPath = join(tempDir, `${record.commitToken}.meta.json`);
      await unlink(sidecarPath);

      // getRecord should return null and clean up the orphaned raw file
      const result = await service.getRecord(record.commitToken);
      expect(result).toBeNull();

      // Raw file should also be cleaned up
      const filePath = join(tempDir, record.commitToken);
      await expect(access(filePath, fsConstants.F_OK)).rejects.toThrow();
    });
  });

  // ─── remove() handles missing files gracefully ─────────────────────────

  describe('remove()', () => {
    it('does not throw when removing a non-existent token', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      // Should not throw
      await expect(
        service.remove('nonexistent-token'),
      ).resolves.toBeUndefined();
    });

    it('does not throw when called twice on the same token', async () => {
      const config = createConfig(tempDir);
      const service = new StagingService(config, createDeps());
      await service.initialize();

      const fileBuffer = Buffer.from('double remove', 'utf-8');
      const record = await service.stage(
        fileBuffer,
        'double.txt',
        'text/plain',
        'user-1',
      );

      await service.remove(record.commitToken);
      // Second remove should not throw
      await expect(service.remove(record.commitToken)).resolves.toBeUndefined();
    });
  });
});
