/**
 * Environment – Property-Based Tests.
 *
 * Feature: brightchain-user-management
 *
 * Uses fast-check to validate DEV_DATABASE environment variable behaviour
 * for the Environment class.
 */

import * as fc from 'fast-check';
import { Environment } from '../../lib/environment';

/**
 * Snapshot and restore all environment variables that the Environment
 * constructor reads so that tests are fully isolated.
 */
function withCleanEnv(
  overrides: Record<string, string | undefined>,
  fn: () => void,
): void {
  const keysToManage = [
    'DEV_DATABASE',
    'USE_MEMORY_DOCSTORE',
    'BRIGHTCHAIN_BLOCKSTORE_PATH',
    'BLOCKSTORE_PATH',
    'JWT_SECRET',
    'MNEMONIC_HMAC_SECRET',
    'MNEMONIC_ENCRYPTION_KEY',
    'API_DIST_DIR',
    'REACT_DIST_DIR',
  ];

  // Save originals
  const saved: Record<string, string | undefined> = {};
  for (const key of keysToManage) {
    saved[key] = process.env[key];
  }

  try {
    // Clear all managed keys first
    for (const key of keysToManage) {
      delete process.env[key];
    }

    // Set required baseline env vars for Environment constructor
    process.env['JWT_SECRET'] =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env['MNEMONIC_HMAC_SECRET'] =
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    process.env['MNEMONIC_ENCRYPTION_KEY'] =
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    process.env['API_DIST_DIR'] = process.cwd();
    process.env['REACT_DIST_DIR'] = process.cwd();

    // Apply caller overrides
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    fn();
  } finally {
    // Restore originals
    for (const key of keysToManage) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}

describe('Environment Property-Based Tests', () => {
  // Feature: brightchain-user-management, Property 16: DEV_DATABASE controls useMemoryDocumentStore
  /**
   * Property 16: DEV_DATABASE controls useMemoryDocumentStore
   *
   * `useMemoryDocumentStore` is `true` iff `DEV_DATABASE` is non-empty;
   * `devDatabasePoolName` equals the trimmed value.
   *
   * **Validates: Requirements 6.1, 6.2, 6.4**
   */
  describe('Property 16: DEV_DATABASE controls useMemoryDocumentStore', () => {
    /** Arbitrary: non-empty trimmed pool name strings */
    const nonEmptyPoolName: fc.Arbitrary<string> = fc
      .stringMatching(/^[a-zA-Z0-9_-]{1,30}$/)
      .filter((s) => s.trim().length > 0);

    /** Arbitrary: pool name with optional surrounding whitespace */
    const poolNameWithWhitespace: fc.Arbitrary<string> = fc
      .tuple(
        fc.integer({ min: 0, max: 5 }).map((n) => ' '.repeat(n)),
        nonEmptyPoolName,
        fc.integer({ min: 0, max: 5 }).map((n) => ' '.repeat(n)),
      )
      .map(([pre, name, post]) => `${pre}${name}${post}`);

    it('useMemoryDocumentStore is true and devDatabasePoolName equals trimmed value when DEV_DATABASE is non-empty', () => {
      fc.assert(
        fc.property(poolNameWithWhitespace, (devDb) => {
          withCleanEnv({ DEV_DATABASE: devDb }, () => {
            const env = new Environment(undefined, true);
            expect(env.useMemoryDocumentStore).toBe(true);
            expect(env.devDatabasePoolName).toBe(devDb.trim());
          });
        }),
        { numRuns: 100 },
      );
    });

    it('useMemoryDocumentStore derives from DEV_DATABASE, not USE_MEMORY_DOCSTORE', () => {
      fc.assert(
        fc.property(nonEmptyPoolName, (poolName) => {
          // DEV_DATABASE set, USE_MEMORY_DOCSTORE not set
          withCleanEnv(
            { DEV_DATABASE: poolName, USE_MEMORY_DOCSTORE: undefined },
            () => {
              const env = new Environment(undefined, true);
              expect(env.useMemoryDocumentStore).toBe(true);
              expect(env.devDatabasePoolName).toBe(poolName);
            },
          );
        }),
        { numRuns: 100 },
      );
    });

    it('devDatabasePoolName is undefined when DEV_DATABASE is empty or unset', () => {
      const emptyish: fc.Arbitrary<string | undefined> = fc.oneof(
        fc.constant(undefined),
        fc.constant(''),
        fc.integer({ min: 1, max: 10 }).map((n) => ' '.repeat(n)),
      );

      fc.assert(
        fc.property(emptyish, (devDb) => {
          // Also set a blockStorePath so useMemoryDocumentStore doesn't
          // default to true via the !_blockStorePath fallback
          withCleanEnv(
            {
              DEV_DATABASE: devDb,
              BRIGHTCHAIN_BLOCKSTORE_PATH: '/tmp/test-store',
            },
            () => {
              const env = new Environment(undefined, true);
              expect(env.devDatabasePoolName).toBeUndefined();
              // useMemoryDocumentStore should be false when DEV_DATABASE
              // is empty/unset AND blockStorePath is set
              expect(env.useMemoryDocumentStore).toBe(false);
            },
          );
        }),
        { numRuns: 100 },
      );
    });

    it('useMemoryDocumentStore is true when DEV_DATABASE is set even with blockStorePath', () => {
      fc.assert(
        fc.property(nonEmptyPoolName, (poolName) => {
          withCleanEnv(
            {
              DEV_DATABASE: poolName,
              BRIGHTCHAIN_BLOCKSTORE_PATH: '/tmp/test-store',
            },
            () => {
              const env = new Environment(undefined, true);
              expect(env.useMemoryDocumentStore).toBe(true);
              expect(env.devDatabasePoolName).toBe(poolName);
            },
          );
        }),
        { numRuns: 100 },
      );
    });
  });
});
