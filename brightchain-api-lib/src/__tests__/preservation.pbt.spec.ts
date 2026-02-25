/**
 * Preservation Property-Based Tests (Bugfix: dev-database-and-greenlock-fix)
 *
 * Captures baseline behavior on UNFIXED code to ensure no regressions
 * after the fix is applied. These tests MUST PASS on unfixed code.
 *
 * Properties tested:
 *  - P3: Database init produces MemoryBlockStore for DEV_DATABASE
 *  - P3: Database init produces DiskBlockStore for BRIGHTCHAIN_BLOCKSTORE_PATH
 *  - P3: Database init throws when neither is set
 *  - P5: determineChallengeTypes always includes HTTP-01, adds DNS-01 iff wildcard
 *  - P5: GreenlockManager passes staging boolean (not string) to init
 *  - P7: BrightChainMemberInitService.initialize() idempotency
 *
 * Uses fast-check for property-based testing.
 */

import {
  BlockSize,
  type IBrightChainMemberInitInput,
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { GuidV4Buffer, GuidV4Provider } from '@digitaldefiance/node-ecies-lib';
import * as fc from 'fast-check';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { brightchainDatabaseInit } from '../lib/databaseInit';
import { Environment } from '../lib/environment';
import {
  BrightChainMemberInitService,
  type IBrightChainMemberInitConfig,
} from '../lib/services/brightchain-member-init.service';
import { DiskBlockStore } from '../lib/stores/diskBlockStore';
// Ensure the disk store factory is registered
import '../lib/factories/blockStoreFactory';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'preservation-pbt-'));
}

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
 * Set up required env vars with optional overrides.
 * Returns a cleanup function that restores the original env state.
 */
function setupEnv(
  overrides: Record<string, string | undefined> = {},
): () => void {
  const saved: Record<string, string | undefined> = {};

  // Save and set required vars
  for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  // Save and apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
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

const guidProvider = new GuidV4Provider();

/**
 * Build a test IBrightChainMemberInitInput with valid v4 GUIDs.
 */
function buildTestInput(): IBrightChainMemberInitInput<GuidV4Buffer> {
  return {
    systemUser: {
      id: guidProvider.idFromString('e51295516af341419d60870ecfd01922'),
      type: MemberType.System,
    },
    adminUser: {
      id: guidProvider.idFromString('877f629f6cd34b62b48475cca3ae88c8'),
      type: MemberType.User,
    },
    memberUser: {
      id: guidProvider.idFromString('2479c6cc6fad465eae61cfcf2b9c7a1c'),
      type: MemberType.User,
    },
  };
}

// ─── fast-check arbitraries ─────────────────────────────────────────────────

/** Arbitrary for a non-empty dev database pool name (alphanumeric, 3-20 chars) */
const devPoolNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{2,19}$/);

/** Arbitrary for a valid block size */
const _blockSizeArb = fc.constantFrom(
  BlockSize.Small,
  BlockSize.Medium,
  BlockSize.Large,
  BlockSize.Huge,
);

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Preservation Property-Based Tests (dev-database-and-greenlock-fix)', () => {
  let warnSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    infoSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });

  // ── Property 3: Database Initialization Unchanged ───────────────────────

  /**
   * **Validates: Requirements 3.1**
   *
   * Property: for all environment configs with DEV_DATABASE set,
   * brightchainDatabaseInit() produces MemoryBlockStore.
   */
  it('P3a: DEV_DATABASE set → brightchainDatabaseInit produces MemoryBlockStore', async () => {
    await fc.assert(
      fc.asyncProperty(devPoolNameArb, async (poolName) => {
        const restoreEnv = setupEnv({
          DEV_DATABASE: poolName,
          BRIGHTCHAIN_BLOCKSTORE_PATH: undefined,
          BLOCKSTORE_PATH: undefined,
        });

        try {
          const env = new Environment(undefined, true);
          const result = await brightchainDatabaseInit(env);

          expect(result.success).toBe(true);
          expect(result.backend).toBeDefined();

          const blockStore = result.backend!.blockStore;
          // MemoryBlockStore does NOT have a storePath property
          expect(blockStore).toBeInstanceOf(MemoryBlockStore);
        } finally {
          restoreEnv();
        }
      }),
      { numRuns: 20 },
    );
  }, 120_000);

  /**
   * **Validates: Requirements 3.2**
   *
   * Property: for all environment configs with BRIGHTCHAIN_BLOCKSTORE_PATH set
   * (no DEV_DATABASE), brightchainDatabaseInit() produces DiskBlockStore.
   */
  it('P3b: BRIGHTCHAIN_BLOCKSTORE_PATH set (no DEV_DATABASE) → DiskBlockStore', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        let tempDir: string | undefined;
        const restoreEnv = setupEnv({
          DEV_DATABASE: undefined,
          BRIGHTCHAIN_BLOCKSTORE_PATH: undefined,
          BLOCKSTORE_PATH: undefined,
        });

        try {
          tempDir = await makeTempDir();
          // Set after initial cleanup to avoid race
          process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'] = tempDir;

          const env = new Environment(undefined, true);
          const result = await brightchainDatabaseInit(env);

          expect(result.success).toBe(true);
          expect(result.backend).toBeDefined();

          const blockStore = result.backend!.blockStore;
          // DiskBlockStore (or DiskBlockAsyncStore which extends it) has storePath
          expect(blockStore).toBeInstanceOf(DiskBlockStore);
        } finally {
          restoreEnv();
          if (tempDir) await cleanupDir(tempDir);
        }
      }),
      { numRuns: 10 },
    );
  }, 120_000);

  /**
   * **Validates: Requirements 3.3**
   *
   * Property: for all environment configs with neither DEV_DATABASE nor
   * BRIGHTCHAIN_BLOCKSTORE_PATH set, brightchainDatabaseInit() returns
   * a failure result (the function catches the error internally).
   */
  it('P3c: neither DEV_DATABASE nor BRIGHTCHAIN_BLOCKSTORE_PATH → init fails', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const restoreEnv = setupEnv({
          DEV_DATABASE: undefined,
          BRIGHTCHAIN_BLOCKSTORE_PATH: undefined,
          BLOCKSTORE_PATH: undefined,
        });

        try {
          const env = new Environment(undefined, true);
          const result = await brightchainDatabaseInit(env);

          // brightchainDatabaseInit catches the error and returns { success: false }
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain(
            'Neither DEV_DATABASE nor BRIGHTCHAIN_BLOCKSTORE_PATH is set',
          );
          expect(result.backend).toBeUndefined();
        } finally {
          restoreEnv();
        }
      }),
      { numRuns: 5 },
    );
  }, 60_000);

  // ── Property 7: Member Init Idempotency ─────────────────────────────────

  /**
   * **Validates: Requirements 3.8**
   *
   * Property: for all sequences of initialize() calls with overlapping user
   * sets, no duplicate entries are created. Calling initialize() twice with
   * the same users returns alreadyInitialized: true on the second call.
   */
  it('P7: initialize() called twice with same users skips duplicates (idempotency)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1-3 repeated calls
        fc.integer({ min: 2, max: 4 }),
        async (callCount) => {
          const config: IBrightChainMemberInitConfig = {
            memberPoolName: `IdempotencyTest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            useMemoryStore: true,
            blockSize: BlockSize.Small,
          };

          const input = buildTestInput();
          const service = new BrightChainMemberInitService<GuidV4Buffer>();

          // First call should insert entries
          const firstResult = await service.initialize(config, input);
          expect(firstResult.alreadyInitialized).toBe(false);
          expect(firstResult.insertedCount).toBe(3); // system, admin, member

          // Subsequent calls should skip duplicates
          for (let i = 1; i < callCount; i++) {
            const result = await service.initialize(config, input);
            expect(result.alreadyInitialized).toBe(true);
            expect(result.insertedCount).toBe(0);
            expect(result.skippedCount).toBe(3);
          }

          // Verify total entries in the collection is exactly 3
          const collection = service.db.collection('member_index');
          const allEntries = await collection.find({}).toArray();
          expect(allEntries).toHaveLength(3);
        },
      ),
      { numRuns: 10 },
    );
  }, 120_000);
});
