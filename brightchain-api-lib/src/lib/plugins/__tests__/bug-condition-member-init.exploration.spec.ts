/**
 * @fileoverview Bug condition exploration test — Property 1: Fault Condition.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
 *
 * This test encodes the EXPECTED (correct) behavior:
 *   - After `BrightChainDatabasePlugin.connect()` + `initializeDevStore()` with
 *     `DEV_DATABASE` set, `BrightChainMemberInitService.initialize()` should be
 *     called with the correct config and member index documents should exist.
 *   - In production mode (no `DEV_DATABASE`, `BRIGHTCHAIN_BLOCKSTORE_PATH` set),
 *     member seeding should still occur with `useMemoryStore: false`.
 *
 * **CRITICAL**: On UNFIXED code this test MUST FAIL — failure confirms the bug
 * exists (`initializeDevStore()` is a no-op and no production seeding path exists).
 *
 * **DO NOT fix the test or the code when it fails.**
 */

import {
  type IMemberIndexDocument,
  initializeBrightChain,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import {
  GuidV4Provider,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';
import type { IConstants } from '@digitaldefiance/node-express-suite';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import fc from 'fast-check';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Constants } from '../../constants';
import { Environment } from '../../environment';
import type { DefaultBackendIdType } from '../../shared-types';
import { BrightChainDatabasePlugin } from '../brightchain-database-plugin';
// Ensure the disk store factory is registered
import '../../factories/blockStoreFactory';

jest.setTimeout(120_000);

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMBER_INDEX_COLLECTION = 'member_index';

// Build constants with GuidV4Provider so the Environment generates 16-byte
// GuidV4Buffer IDs instead of 12-byte ObjectId buffers.
const guidProvider = new GuidV4Provider();
const GuidConstants: IConstants = {
  ...Constants,
  idProvider: guidProvider,
  MEMBER_ID_LENGTH: guidProvider.byteLength,
  ECIES: {
    ...Constants.ECIES,
    MULTIPLE: {
      ...Constants.ECIES.MULTIPLE,
      RECIPIENT_ID_SIZE: guidProvider.byteLength,
    },
  },
} as IConstants;

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
 * Extra env keys that tests may set/delete beyond REQUIRED_ENV_VARS.
 */
const EXTRA_KEYS = [
  'BRIGHTCHAIN_BLOCKSTORE_PATH',
  'BLOCKSTORE_PATH',
  'DEV_DATABASE',
  'SYSTEM_ID',
  'ADMIN_ID',
  'MEMBER_ID',
] as const;

// ─── Env helpers ──────────────────────────────────────────────────────────────

/**
 * Set up required env vars for dev-mode config (DEV_DATABASE set).
 * Returns a cleanup function that restores the original env state.
 */
function setupDevEnv(devPoolName: string): () => void {
  const saved: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  // Save and clear extra keys so Environment auto-generates GuidV4Buffer IDs
  for (const key of EXTRA_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }

  // Set DEV_DATABASE
  process.env['DEV_DATABASE'] = devPoolName;

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

/**
 * Set up required env vars for production-mode config (BRIGHTCHAIN_BLOCKSTORE_PATH set, no DEV_DATABASE).
 * Returns a cleanup function that restores the original env state.
 */
function setupProdEnv(blockStorePath: string): () => void {
  const saved: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  // Save and clear extra keys so Environment auto-generates GuidV4Buffer IDs
  for (const key of EXTRA_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }

  // Set BRIGHTCHAIN_BLOCKSTORE_PATH (no DEV_DATABASE)
  process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'] = blockStorePath;

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

// ─── fast-check arbitrary for valid dev pool names ────────────────────────────

const devPoolNameArb: fc.Arbitrary<string> = fc.constantFrom(
  'dev-pool-alpha',
  'dev-pool-beta',
  'dev-pool-gamma',
  'test-brightchain',
  'exploration-pool',
);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — Property 1: Member Init Service Never Called on Startup', () => {
  beforeAll(() => {
    initializeBrightChain();
    registerNodeRuntimeConfiguration('exploration-guid-config', GuidConstants);
  });

  afterAll(() => {
    resetInitialization();
  });

  // ── Dev mode: initializeDevStore() should seed the database ─────────────────

  describe('Dev mode: initializeDevStore() seeds member index documents', () => {
    let restoreEnv: () => void;
    let plugin: BrightChainDatabasePlugin<DefaultBackendIdType>;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(async () => {
      consoleSpy.mockRestore();
      if (plugin?.isConnected()) {
        await plugin.disconnect();
      }
      if (restoreEnv) {
        restoreEnv();
      }
    });

    /**
     * **Validates: Requirements 1.3, 2.1, 2.3**
     *
     * For any valid dev pool name, after connect() + initializeDevStore(),
     * the initializeDevStore() method should NOT return undefined (it should
     * return a meaningful result from BrightChainMemberInitService.initialize()).
     *
     * On UNFIXED code: initializeDevStore() returns undefined → test FAILS.
     */
    it('initializeDevStore() returns a meaningful result (not undefined)', async () => {
      await fc.assert(
        fc.asyncProperty(devPoolNameArb, async (poolName) => {
          restoreEnv = setupDevEnv(poolName);
          const env = new Environment<DefaultBackendIdType>(
            undefined,
            true,
            true,
            GuidConstants,
          );
          plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

          await plugin.connect();
          const result = await plugin.initializeDevStore();

          // The fixed initializeDevStore() should return a result object,
          // not undefined. On unfixed code, this is undefined (no-op).
          expect(result).not.toBeUndefined();
          expect(result).toEqual(
            expect.objectContaining({
              insertedCount: expect.any(Number),
            }),
          );

          await plugin.disconnect();
          restoreEnv();
        }),
        { numRuns: 5 },
      );
    });

    /**
     * **Validates: Requirements 1.1, 2.1, 2.3**
     *
     * For any valid dev pool name, after connect() + initializeDevStore(),
     * the member_index collection in the BrightChainDb should contain
     * documents for system, admin, and member users.
     *
     * On UNFIXED code: initializeDevStore() is a no-op, so no documents
     * exist → test FAILS.
     */
    it('member index documents exist in database after initializeDevStore()', async () => {
      await fc.assert(
        fc.asyncProperty(devPoolNameArb, async (poolName) => {
          restoreEnv = setupDevEnv(poolName);
          const env = new Environment<DefaultBackendIdType>(
            undefined,
            true,
            true,
            GuidConstants,
          );
          plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

          await plugin.connect();
          await plugin.initializeDevStore();

          // After initializeDevStore(), the database should contain
          // member index documents for system, admin, and member users.
          const db = plugin.brightChainDb;
          const collection = db.collection<IMemberIndexDocument>(
            MEMBER_INDEX_COLLECTION,
          );
          const docs = await collection.find({}).toArray();

          // On unfixed code: docs.length === 0 because initializeDevStore() is a no-op
          expect(docs.length).toBeGreaterThanOrEqual(3);

          // Verify the documents have the expected pool ID
          for (const doc of docs) {
            expect(doc.poolId).toBeDefined();
          }

          await plugin.disconnect();
          restoreEnv();
        }),
        { numRuns: 5 },
      );
    });
  });

  // ── Production mode: member seeding should occur after startup ──────────────

  describe('Production mode: member seeding occurs with useMemoryStore: false', () => {
    let restoreEnv: () => void;
    let plugin: BrightChainDatabasePlugin<DefaultBackendIdType>;
    let tempDir: string;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'bc-prod-exploration-'));
      consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(async () => {
      consoleSpy.mockRestore();
      if (plugin?.isConnected()) {
        await plugin.disconnect();
      }
      if (restoreEnv) {
        restoreEnv();
      }
      rmSync(tempDir, { recursive: true, force: true });
    });

    /**
     * **Validates: Requirements 1.2, 2.2**
     *
     * In production mode (BRIGHTCHAIN_BLOCKSTORE_PATH set, no DEV_DATABASE),
     * after the plugin connects, member index documents should exist in the
     * database. This requires a seeding path in the production startup flow.
     *
     * On UNFIXED code: no production seeding path exists → no documents → test FAILS.
     */
    it('member index documents exist in database after production-mode connect', async () => {
      restoreEnv = setupProdEnv(tempDir);
      const env = new Environment<DefaultBackendIdType>(
        undefined,
        true,
        true,
        GuidConstants,
      );
      plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

      await plugin.connect();

      // In production mode, initializeDevStore() is NOT called by the upstream
      // lifecycle. The fix should add a seeding path that runs after connect().
      // For now, we check if the database has member index documents.
      const db = plugin.brightChainDb;
      const collection = db.collection<IMemberIndexDocument>(
        MEMBER_INDEX_COLLECTION,
      );
      const docs = await collection.find({}).toArray();

      // On unfixed code: docs.length === 0 because no production seeding path exists
      expect(docs.length).toBeGreaterThanOrEqual(3);

      await plugin.disconnect();
    });
  });
});
