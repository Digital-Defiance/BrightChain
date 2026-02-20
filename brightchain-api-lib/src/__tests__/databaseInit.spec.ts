/**
 * @fileoverview Unit tests for brightchainDatabaseInit.
 *
 * Covers:
 * - Valid dataDir creates persistent stores (Requirement 1.1, 1.2)
 * - Missing dataDir falls back to memory with warning (Requirement 1.5)
 * - Inaccessible dataDir returns failure result (Requirement 1.3)
 */

import { EnergyAccountStore, MemberStore } from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { brightchainDatabaseInit } from '../lib/databaseInit';
import { Environment } from '../lib/environment';
// Ensure the disk store factory is registered
import '../lib/factories/blockStoreFactory';

/** Create a unique temp directory for each test run */
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'dbinit-unit-'));
}

/** Clean up a temp directory */
async function cleanupDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Required env vars for Environment construction.
 */
const REQUIRED_ENV_VARS: Record<string, string> = {
  JWT_SECRET:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  MNEMONIC_HMAC_SECRET:
    'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
  MNEMONIC_ENCRYPTION_KEY:
    'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  API_DIST_DIR: process.cwd(),
  REACT_DIST_DIR: process.cwd(),
};

/**
 * Set up required env vars and optionally set blockStorePath.
 * Returns a cleanup function that restores the original env state.
 */
function setupEnv(blockStorePath?: string): () => void {
  const saved: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  saved['BRIGHTCHAIN_BLOCKSTORE_PATH'] =
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  saved['BLOCKSTORE_PATH'] = process.env['BLOCKSTORE_PATH'];

  if (blockStorePath !== undefined) {
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'] = blockStorePath;
  } else {
    delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
    delete process.env['BLOCKSTORE_PATH'];
  }

  return () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

describe('brightchainDatabaseInit – unit tests', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  /**
   * Requirement 1.1: DatabaseInitFunction SHALL create a BlockStore backed by
   * persistent storage and return a success result.
   * Requirement 1.2: WHEN a dataDir path is provided, THE App SHALL use that
   * path for persistent block storage.
   */
  it('valid dataDir creates persistent stores', async () => {
    const tempDir = await makeTempDir();
    const restoreEnv = setupEnv(tempDir);

    try {
      const env = new Environment(undefined, true);
      const result = await brightchainDatabaseInit(env);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.backend).toBeDefined();

      const backend = result.backend!;
      expect(backend.blockStore).toBeDefined();
      expect(backend.db).toBeDefined();
      expect(backend.memberStore).toBeInstanceOf(MemberStore);
      expect(backend.energyStore).toBeInstanceOf(EnergyAccountStore);

      // Verify the block store is disk-backed by checking it has a storePath
      // (DiskBlockAsyncStore exposes storePath; MemoryBlockStore does not)
      const store = backend.blockStore;
      expect('storePath' in store).toBe(true);

      // No ephemeral-mode warning should have been logged
      const ephemeralWarnings = warnSpy.mock.calls.filter(
        (args: unknown[]) =>
          typeof args[0] === 'string' &&
          args[0].includes('ephemeral MemoryBlockStore'),
      );
      expect(ephemeralWarnings).toHaveLength(0);
    } finally {
      restoreEnv();
      await cleanupDir(tempDir);
    }
  }, 30_000);

  /**
   * Requirement 1.5: WHEN the App starts without a dataDir configured,
   * THE App SHALL fall back to MemoryBlockStore and InMemoryHeadRegistry
   * with a logged warning.
   */
  it('missing dataDir falls back to memory with warning', async () => {
    const restoreEnv = setupEnv(undefined);

    try {
      const env = new Environment(undefined, true);
      const result = await brightchainDatabaseInit(env);

      expect(result.success).toBe(true);
      expect(result.backend).toBeDefined();

      const backend = result.backend!;
      expect(backend.blockStore).toBeDefined();
      expect(backend.db).toBeDefined();
      expect(backend.memberStore).toBeInstanceOf(MemberStore);
      expect(backend.energyStore).toBeInstanceOf(EnergyAccountStore);

      // A warning about ephemeral mode should have been logged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ephemeral MemoryBlockStore'),
      );
    } finally {
      restoreEnv();
    }
  }, 30_000);

  /**
   * Requirement 1.3: IF the configured dataDir does not exist or is
   * inaccessible, THEN THE DatabaseInitFunction SHALL return a failure
   * result with a descriptive error message.
   */
  it('inaccessible dataDir returns failure result', async () => {
    // Use a path under /proc (Linux) or a deeply nested non-creatable path
    // that mkdir will fail on. /dev/null is a file, so creating a directory
    // inside it will fail on all POSIX systems.
    const inaccessiblePath = '/dev/null/brightchain-test-dir';
    const restoreEnv = setupEnv(inaccessiblePath);

    try {
      const env = new Environment(undefined, true);
      const result = await brightchainDatabaseInit(env);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.error!.length).toBeGreaterThan(0);
      expect(result.backend).toBeUndefined();
    } finally {
      restoreEnv();
    }
  }, 30_000);
});
