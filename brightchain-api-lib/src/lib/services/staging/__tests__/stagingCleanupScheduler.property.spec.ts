/**
 * Property-based tests for StagingCleanupScheduler.
 *
 * Tests Properties 11 and 12 from the Temporary Upload Staging System design.
 * Each property is validated with a minimum of 100 iterations using fast-check.
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
import fc from 'fast-check';
import { constants as fsConstants } from 'fs';
import { access, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { StagingCleanupScheduler } from '../stagingCleanupScheduler';
import type { IStagingServiceDeps } from '../stagingService';
import { StagingService } from '../stagingService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createDeps(
  overrides?: Partial<IStagingServiceDeps>,
): IStagingServiceDeps {
  let counter = 0;
  return {
    generateToken:
      overrides?.generateToken ??
      (() => {
        counter++;
        const hex = counter.toString(16).padStart(32, '0');
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

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for non-empty file buffers (1–256 bytes, small for speed) */
const arbFileBuffer = fc
  .uint8Array({ minLength: 1, maxLength: 256 })
  .map((arr) => Buffer.from(arr));

/** Arbitrary for filenames */
const arbFilename = fc
  .stringMatching(/^[a-zA-Z0-9_.-]{1,32}$/)
  .filter((s) => s.length > 0);

/** Arbitrary for MIME types */
const arbMimeType = fc.constantFrom(
  'image/png',
  'text/plain',
  'application/pdf',
);

/** Arbitrary for uploader IDs */
const arbUploaderId = fc
  .stringMatching(/^[a-zA-Z0-9]{1,16}$/)
  .filter((s) => s.length > 0);

/**
 * Arbitrary for a file entry with an expiry offset in seconds.
 * Negative offset = already expired at the reference time.
 * Positive offset = still valid at the reference time.
 */
const arbFileEntry = fc.record({
  buffer: arbFileBuffer,
  filename: arbFilename,
  mimeType: arbMimeType,
  uploaderId: arbUploaderId,
  /** Offset from reference time in seconds. Negative = expired, positive = valid */
  expiryOffsetSeconds: fc
    .integer({ min: -7200, max: 7200 })
    .filter((v) => v !== 0),
});

// ─── Test Suite ─────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'staging-cleanup-prop-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ─── Property 11 ────────────────────────────────────────────────────────────

describe('Feature: temp-upload-staging, Property 11: Cleanup removes exactly the expired files', () => {
  /**
   * **Validates: Requirements 5.1, 5.2**
   *
   * For any set of staged files with various expiry timestamps, given a fixed
   * current time, the cleanup job SHALL remove exactly those files where
   * expiresAt is in the past and SHALL leave all non-expired files untouched.
   */
  it('tick() removes exactly expired files and leaves non-expired files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbFileEntry, { minLength: 1, maxLength: 8 }),
        async (entries) => {
          // Reference time: all files are staged "before" this, and cleanup runs "at" this time
          const referenceTime = new Date('2025-01-15T12:00:00.000Z');
          const referenceMs = referenceTime.getTime();

          // Stage time is 2 hours before reference
          const stageTime = new Date(referenceMs - 2 * 3600 * 1000);

          // We use a very large maxTtl so the TTL we request is used as-is
          const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

          // Stage all files at stageTime
          const stageDeps = createDeps({ now: () => stageTime });
          const stageService = new StagingService(config, stageDeps);
          await stageService.initialize();

          const stagedRecords: Array<{
            token: string;
            shouldBeExpired: boolean;
          }> = [];

          for (const entry of entries) {
            // TTL = time from stageTime to (referenceTime + offset)
            // If offset < 0, expiresAt will be before referenceTime → expired
            // If offset > 0, expiresAt will be after referenceTime → valid
            const ttlSeconds =
              Math.round((referenceMs - stageTime.getTime()) / 1000) +
              entry.expiryOffsetSeconds;
            // Ensure TTL is at least 1 second
            const effectiveTtl = Math.max(1, ttlSeconds);

            const record = await stageService.stage(
              entry.buffer,
              entry.filename,
              entry.mimeType,
              entry.uploaderId,
              effectiveTtl,
            );

            // Determine if this file should be expired at referenceTime
            const expiresAtMs = new Date(record.expiresAt).getTime();
            const shouldBeExpired = expiresAtMs < referenceMs;

            stagedRecords.push({
              token: record.commitToken,
              shouldBeExpired,
            });
          }

          // Create a service that sees "now" as referenceTime for the cleanup
          const cleanupDeps = createDeps({ now: () => referenceTime });
          const cleanupService = new StagingService(config, cleanupDeps);

          const scheduler = new StagingCleanupScheduler(cleanupService, 60000);
          const cleanedCount = await scheduler.tick();

          // Count expected expired
          const expectedExpiredCount = stagedRecords.filter(
            (r) => r.shouldBeExpired,
          ).length;
          expect(cleanedCount).toBe(expectedExpiredCount);

          // Verify: expired files are gone, non-expired files remain
          for (const { token, shouldBeExpired } of stagedRecords) {
            const filePath = join(tempDir, token);
            const sidecarPath = join(tempDir, `${token}.meta.json`);

            if (shouldBeExpired) {
              // Both files should be removed
              await expect(
                access(filePath, fsConstants.F_OK),
              ).rejects.toThrow();
              await expect(
                access(sidecarPath, fsConstants.F_OK),
              ).rejects.toThrow();
            } else {
              // Both files should still exist
              await expect(
                access(filePath, fsConstants.F_OK),
              ).resolves.toBeUndefined();
              await expect(
                access(sidecarPath, fsConstants.F_OK),
              ).resolves.toBeUndefined();
            }
          }

          // Clean up remaining files
          for (const { token, shouldBeExpired } of stagedRecords) {
            if (!shouldBeExpired) {
              await stageService.remove(token);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12 ────────────────────────────────────────────────────────────

describe('Feature: temp-upload-staging, Property 12: Cleanup continues on individual file deletion failure', () => {
  /**
   * **Validates: Requirements 5.5**
   *
   * For any set of expired staged files where one or more individual deletions
   * fail, the cleanup job SHALL continue processing the remaining files and
   * SHALL successfully delete all files that do not have deletion errors.
   */
  it('tick() continues cleaning remaining files when some removals fail', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 2-6 expired file entries (all expired)
        fc.array(arbFileBuffer, { minLength: 2, maxLength: 6 }),
        // Which indices should fail (as a set of booleans matching the array)
        fc.array(fc.boolean(), { minLength: 2, maxLength: 6 }),
        async (buffers, failFlags) => {
          // Align lengths: use the shorter of the two arrays
          const count = Math.min(buffers.length, failFlags.length);
          const effectiveBuffers = buffers.slice(0, count);
          const effectiveFailFlags = failFlags.slice(0, count);

          // Ensure at least one fails and at least one succeeds
          const hasFailure = effectiveFailFlags.some((f) => f);
          const hasSuccess = effectiveFailFlags.some((f) => !f);
          if (!hasFailure || !hasSuccess) return; // skip degenerate cases

          const referenceTime = new Date('2025-01-15T12:00:00.000Z');
          const stageTime = new Date(referenceTime.getTime() - 2 * 3600 * 1000);

          const config = createConfig(tempDir, { maxTtlSeconds: 999999 });

          // Stage all files with a short TTL so they're all expired at referenceTime
          const stageDeps = createDeps({ now: () => stageTime });
          const stageService = new StagingService(config, stageDeps);
          await stageService.initialize();

          const tokens: string[] = [];
          for (let i = 0; i < count; i++) {
            const record = await stageService.stage(
              effectiveBuffers[i],
              `file-${i}.dat`,
              'application/octet-stream',
              'user-1',
              60, // 60 second TTL — expired well before referenceTime
            );
            tokens.push(record.commitToken);
          }

          // Build the set of tokens that should fail
          const failTokens = new Set<string>();
          for (let i = 0; i < count; i++) {
            if (effectiveFailFlags[i]) {
              failTokens.add(tokens[i]);
            }
          }

          // Create a cleanup service with mocked remove() that fails for specific tokens
          const cleanupDeps = createDeps({ now: () => referenceTime });
          const cleanupService = new StagingService(config, cleanupDeps);

          const originalRemove = cleanupService.remove.bind(cleanupService);
          cleanupService.remove = jest.fn(async (commitToken: string) => {
            if (failTokens.has(commitToken)) {
              throw new Error(`Simulated deletion failure for ${commitToken}`);
            }
            return originalRemove(commitToken);
          }) as typeof cleanupService.remove;

          const scheduler = new StagingCleanupScheduler(cleanupService, 60000);
          const cleanedCount = await scheduler.tick();

          // The cleaned count should equal the number of non-failing tokens
          const expectedSuccessCount = count - failTokens.size;
          expect(cleanedCount).toBe(expectedSuccessCount);

          // Verify: non-failing tokens are cleaned, failing tokens still exist
          for (let i = 0; i < count; i++) {
            const filePath = join(tempDir, tokens[i]);
            const sidecarPath = join(tempDir, `${tokens[i]}.meta.json`);

            if (failTokens.has(tokens[i])) {
              // Failed removal — files should still exist
              await expect(
                access(filePath, fsConstants.F_OK),
              ).resolves.toBeUndefined();
              await expect(
                access(sidecarPath, fsConstants.F_OK),
              ).resolves.toBeUndefined();
            } else {
              // Successful removal — files should be gone
              await expect(
                access(filePath, fsConstants.F_OK),
              ).rejects.toThrow();
              await expect(
                access(sidecarPath, fsConstants.F_OK),
              ).rejects.toThrow();
            }
          }

          // Clean up remaining files (the ones that "failed" to delete)
          for (const token of failTokens) {
            await originalRemove(token);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
