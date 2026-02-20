/**
 * Database Initialization – Property-Based Tests.
 *
 * Feature: brightchain-db-init-user-endpoints
 *
 * Uses fast-check to validate universal correctness properties
 * of brightchainDatabaseInit across randomly generated environment configs.
 */

import type { IBlockStore, IDocumentStore } from '@brightchain/brightchain-lib';
import {
  BlockSize,
  EmailString,
  EnergyAccountStore,
  initializeBrightChain,
  MemberStore,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { brightchainDatabaseInit } from '../lib/databaseInit';
import { Environment } from '../lib/environment';
import { DiskBlockStore } from '../lib/stores/diskBlockStore';
// Ensure the disk store factory is registered
import '../lib/factories/blockStoreFactory';

/** Create a unique temp directory for each test run */
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'dbinit-pbt-'));
}

/** Clean up a temp directory */
async function cleanupDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Required env vars for Environment construction.
 * These must be set before creating an Environment instance.
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

  // Save and set required vars
  for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  // Save and set/clear blockStorePath
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

describe('Database Init Property-Based Tests', () => {
  // Suppress console.warn during tests (ephemeral mode warnings)
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  /**
   * Property 13: Init result structure uniformity
   *
   * Feature: brightchain-db-init-user-endpoints, Property 13: Init result structure uniformity
   *
   * For any valid environment configuration (with or without blockStorePath),
   * the brightchainDatabaseInit function SHALL return a result object with
   * the same set of keys (success, backend with blockStore, db, memberStore,
   * energyStore) regardless of which backend was selected.
   *
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 13: Init result structure uniformity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // true = use disk-backed path, false = ephemeral
        async (useDiskPath) => {
          let tempDir: string | undefined;
          let restoreEnv: (() => void) | undefined;

          try {
            if (useDiskPath) {
              tempDir = await makeTempDir();
              restoreEnv = setupEnv(tempDir);
            } else {
              restoreEnv = setupEnv(undefined);
            }

            const env = new Environment(undefined, true);
            const result = await brightchainDatabaseInit(env);

            // The result must always have a 'success' boolean
            expect(typeof result.success).toBe('boolean');
            expect(result.success).toBe(true);

            // On success, 'backend' must be defined
            expect(result.backend).toBeDefined();
            const backend = result.backend!;

            // Verify all four required keys exist on backend
            expect(backend).toHaveProperty('blockStore');
            expect(backend).toHaveProperty('db');
            expect(backend).toHaveProperty('memberStore');
            expect(backend).toHaveProperty('energyStore');

            // Verify types: blockStore implements IBlockStore
            const blockStore: IBlockStore = backend.blockStore;
            expect(typeof blockStore.has).toBe('function');
            expect(typeof blockStore.getData).toBe('function');
            expect(typeof blockStore.setData).toBe('function');

            // Verify types: db implements IDocumentStore
            const db: IDocumentStore = backend.db;
            expect(typeof db.collection).toBe('function');
            expect(typeof db.isConnected).toBe('function');

            // Verify types: memberStore is a MemberStore
            expect(backend.memberStore).toBeInstanceOf(MemberStore);

            // Verify types: energyStore is an EnergyAccountStore
            expect(backend.energyStore).toBeInstanceOf(EnergyAccountStore);

            // Verify the result can be serialized to JSON for diagnostics
            // (Requirement 2.4: encode result as JSON for logging)
            const serializable = {
              success: result.success,
              backend: {
                blockStore: typeof backend.blockStore,
                db: typeof backend.db,
                memberStore: typeof backend.memberStore,
                energyStore: typeof backend.energyStore,
              },
            };
            const json = JSON.stringify(serializable);
            expect(typeof json).toBe('string');
            const parsed = JSON.parse(json);
            expect(parsed.success).toBe(true);
            expect(parsed.backend).toHaveProperty('blockStore');
            expect(parsed.backend).toHaveProperty('db');
            expect(parsed.backend).toHaveProperty('memberStore');
            expect(parsed.backend).toHaveProperty('energyStore');
          } finally {
            if (restoreEnv) restoreEnv();
            if (tempDir) await cleanupDir(tempDir);
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 120_000);

  /**
   * Property 12: Backend-agnostic operation equivalence
   *
   * Feature: brightchain-db-init-user-endpoints, Property 12: Backend-agnostic operation equivalence
   *
   * For any sequence of MemberStore operations (create, get, query) and for any
   * valid member data, executing that sequence against a MemoryBlockStore and
   * against a DiskBlockStore SHALL produce equivalent results.
   *
   * **Validates: Requirements 2.2**
   */
  it('Property 12: Backend-agnostic operation equivalence', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a random username: lowercase alphanumeric with underscores/hyphens, 3-20 chars
        fc.stringMatching(/^[a-z0-9_-]{3,20}$/),
        // Generate a random email
        fc
          .tuple(
            fc.stringMatching(/^[a-z0-9]{3,12}$/),
            fc.stringMatching(/^[a-z]{3,8}$/),
          )
          .map(([local, domain]) => `${local}@${domain}.com`),
        async (username, email) => {
          let tempDir: string | undefined;

          try {
            // Initialize BrightChain services (required for Member creation)
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            // Create a MemoryBlockStore and its MemberStore
            const memBlockStore = new MemoryBlockStore(BlockSize.Small);
            const memMemberStore = new MemberStore(memBlockStore);

            // Create a DiskBlockStore and its MemberStore
            tempDir = await makeTempDir();
            const diskBlockStore = new DiskBlockStore({
              storePath: tempDir,
              blockSize: BlockSize.Small,
            });
            const diskMemberStore = new MemberStore(diskBlockStore);

            // --- Operation: createMember on both stores ---
            const memResult = await memMemberStore.createMember({
              type: MemberType.User,
              name: username,
              contactEmail: new EmailString(email),
            });

            const diskResult = await diskMemberStore.createMember({
              type: MemberType.User,
              name: username,
              contactEmail: new EmailString(email),
            });

            // Both should succeed and return a reference with an id
            expect(memResult.reference).toBeDefined();
            expect(diskResult.reference).toBeDefined();

            // The IDs will differ (crypto-generated), but both should be valid Uint8Arrays
            const idProvider = ServiceProvider.getInstance().idProvider;
            const memIdBytes = idProvider.toBytes(memResult.reference.id);
            const diskIdBytes = idProvider.toBytes(diskResult.reference.id);
            expect(memIdBytes).toBeInstanceOf(Uint8Array);
            expect(diskIdBytes).toBeInstanceOf(Uint8Array);
            expect(memIdBytes.length).toBe(diskIdBytes.length);

            // --- Operation: queryIndex by name on both stores ---
            const memQuery = await memMemberStore.queryIndex({
              name: username,
            });
            const diskQuery = await diskMemberStore.queryIndex({
              name: username,
            });

            // Both should return exactly one result
            expect(memQuery.length).toBe(1);
            expect(diskQuery.length).toBe(1);

            // Both query results should have the same member type
            expect(memQuery[0].type).toBe(diskQuery[0].type);
            expect(memQuery[0].type).toBe(MemberType.User);

            // --- Operation: getMember on both stores ---
            const memMember = await memMemberStore.getMember(
              memResult.reference.id,
            );
            const diskMember = await diskMemberStore.getMember(
              diskResult.reference.id,
            );

            // Both members should have the same name and email
            expect(memMember.name).toBe(username);
            expect(diskMember.name).toBe(username);
            expect(memMember.name).toBe(diskMember.name);

            expect(memMember.email.toString()).toBe(email);
            expect(diskMember.email.toString()).toBe(email);
            expect(memMember.email.toString()).toBe(
              diskMember.email.toString(),
            );

            // Both should have the same member type
            expect(memMember.type).toBe(diskMember.type);
            expect(memMember.type).toBe(MemberType.User);

            // --- Operation: queryIndex by non-existent name on both stores ---
            const memEmpty = await memMemberStore.queryIndex({
              name: 'nonexistent_user_xyz',
            });
            const diskEmpty = await diskMemberStore.queryIndex({
              name: 'nonexistent_user_xyz',
            });

            // Both should return empty results
            expect(memEmpty.length).toBe(0);
            expect(diskEmpty.length).toBe(0);
          } finally {
            if (tempDir) await cleanupDir(tempDir);
          }
        },
      ),
      { numRuns: 20 },
    );
  }, 120_000);
});
