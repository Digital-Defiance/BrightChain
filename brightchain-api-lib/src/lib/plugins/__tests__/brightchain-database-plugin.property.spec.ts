/**
 * @fileoverview Property-based tests for BrightChainDatabasePlugin
 *
 * Feature: brightchain-plugin-architecture, Property 1: Connect establishes all stores and database
 *
 * For any valid Environment configuration (memory-backed or disk-backed),
 * after calling connect() on a BrightChainDatabasePlugin, isConnected()
 * should return true, the database property should return a non-null
 * IDatabase-compatible object, and all typed accessors (blockStore,
 * memberStore, energyStore, brightDb, documentStore) should return
 * non-null values.
 *
 * **Validates: Requirements 1.2, 1.4, 1.5**
 */

import type { IBlockStore } from '@brightchain/brightchain-lib';
import {
  EnergyAccountStore,
  initializeBrightChain,
  MemberStore,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Environment } from '../../environment';
import { BrightChainDatabasePlugin } from '../brightchain-database-plugin';
// Ensure the disk store factory is registered
import '../../factories/blockStoreFactory';
import type { DefaultBackendIdType } from '../../shared-types';

jest.setTimeout(180_000);

// Initialize BrightChain global services before any tests run.
// The plugin's seedWithRbac() writes blocks via BrightDb.withTransaction,
// which creates RawDataBlock instances that require the global ServiceProvider.
beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

/** Create a unique temp directory for each test run */
async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(join(tmpdir(), 'plugin-pbt-'));
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

  for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  saved['BRIGHTCHAIN_BLOCKSTORE_PATH'] =
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  saved['BLOCKSTORE_PATH'] = process.env['BLOCKSTORE_PATH'];
  saved['DEV_DATABASE'] = process.env['DEV_DATABASE'];

  if (blockStorePath !== undefined) {
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'] = blockStorePath;
    delete process.env['DEV_DATABASE'];
  } else {
    delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
    delete process.env['BLOCKSTORE_PATH'];
    process.env['DEV_DATABASE'] = 'ephemeral-pbt';
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

// ===========================================================================
// Property 1: Connect establishes all stores and database
// ===========================================================================

describe('Property 1: Connect establishes all stores and database', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('For any valid Environment config, after connect(), isConnected() is true and all accessors return non-null values — **Validates: Requirements 1.2, 1.4, 1.5**', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid environment configurations:
        // true = disk-backed (with temp dir), false = memory-backed (ephemeral)
        fc.boolean(),
        async (useDiskPath) => {
          let tempDir: string | undefined;
          let restoreEnv: (() => void) | undefined;
          let plugin:
            | BrightChainDatabasePlugin<DefaultBackendIdType>
            | undefined;

          try {
            // Set up environment
            if (useDiskPath) {
              tempDir = await makeTempDir();
              restoreEnv = setupEnv(tempDir);
            } else {
              restoreEnv = setupEnv(undefined);
            }

            const env = new Environment(undefined, true);
            plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

            // Pre-condition: plugin starts disconnected
            expect(plugin.isConnected()).toBe(false);

            // Act: connect the plugin
            await plugin.connect();

            // Assert: isConnected() returns true
            expect(plugin.isConnected()).toBe(true);

            // Assert: database property returns a non-null IDatabase-compatible object
            const database = plugin.database;
            expect(database).toBeDefined();
            expect(database).not.toBeNull();
            // Verify IDatabase interface methods exist
            expect(typeof database.collection).toBe('function');
            expect(typeof database.startSession).toBe('function');
            expect(typeof database.withTransaction).toBe('function');
            expect(typeof database.listCollections).toBe('function');
            expect(typeof database.dropCollection).toBe('function');
            expect(typeof database.connect).toBe('function');
            expect(typeof database.disconnect).toBe('function');
            expect(typeof database.isConnected).toBe('function');

            // Assert: blockStore accessor returns non-null
            const blockStore: IBlockStore = plugin.blockStore;
            expect(blockStore).toBeDefined();
            expect(blockStore).not.toBeNull();
            expect(typeof blockStore.has).toBe('function');
            expect(typeof blockStore.getData).toBe('function');
            expect(typeof blockStore.setData).toBe('function');

            // Assert: memberStore accessor returns non-null MemberStore
            const memberStore: MemberStore = plugin.memberStore;
            expect(memberStore).toBeDefined();
            expect(memberStore).not.toBeNull();
            expect(memberStore).toBeInstanceOf(MemberStore);

            // Assert: energyStore accessor returns non-null EnergyAccountStore
            const energyStore: EnergyAccountStore = plugin.energyStore;
            expect(energyStore).toBeDefined();
            expect(energyStore).not.toBeNull();
            expect(energyStore).toBeInstanceOf(EnergyAccountStore);

            // Assert: brightDb accessor returns non-null BrightDb
            const brightDb: BrightDb = plugin.brightDb;
            expect(brightDb).toBeDefined();
            expect(brightDb).not.toBeNull();
            expect(brightDb.isConnected()).toBe(true);
          } finally {
            // Cleanup: disconnect plugin, restore env, remove temp dir
            if (plugin?.isConnected()) {
              await plugin.disconnect();
            }
            if (restoreEnv) restoreEnv();
            if (tempDir) await cleanupDir(tempDir);
          }
        },
      ),
      // numRuns kept low — each run does full RBAC seeding with crypto key
      // generation and disk I/O, so 100 runs would take many minutes.
      { numRuns: 3 },
    );
  });
});

// ===========================================================================
// Property 2: Accessor state consistency
// ===========================================================================

describe('Property 2: Accessor state consistency', () => {
  /**
   * All accessor names on BrightChainDatabasePlugin that should throw
   * when disconnected and return non-null when connected.
   */
  const ACCESSOR_NAMES = [
    'blockStore',
    'memberStore',
    'energyStore',
    'brightDb',
    'database',
  ] as const;

  type AccessorName = (typeof ACCESSOR_NAMES)[number];

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('For any accessor, calling it when disconnected should throw a "not connected" error — **Validates: Requirements 1.7, 6.5**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<AccessorName>(...ACCESSOR_NAMES),
        async (accessorName: AccessorName) => {
          const restoreEnv = setupEnv(undefined);
          try {
            const env = new Environment(undefined, true);
            const plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(
              env,
            );

            // Pre-condition: plugin is disconnected
            expect(plugin.isConnected()).toBe(false);

            // Act & Assert: accessing the property should throw
            expect(() => {
              void plugin[accessorName];
            }).toThrow(/not connected/i);
          } finally {
            restoreEnv();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('For any accessor, calling it when connected should return a non-null value — **Validates: Requirements 1.7, 6.5**', async () => {
    // Connect once and test all accessors across iterations to avoid
    // excessive connect/disconnect overhead while still using PBT.
    const restoreEnv = setupEnv(undefined);
    let plugin: BrightChainDatabasePlugin<DefaultBackendIdType> | undefined;

    try {
      const env = new Environment(undefined, true);
      plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);
      await plugin.connect();

      expect(plugin.isConnected()).toBe(true);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<AccessorName>(...ACCESSOR_NAMES),
          async (accessorName: AccessorName) => {
            // Act: access the property on a connected plugin
            const value = plugin![accessorName];

            // Assert: value is non-null and non-undefined
            expect(value).toBeDefined();
            expect(value).not.toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    } finally {
      if (plugin?.isConnected()) {
        await plugin.disconnect();
      }
      restoreEnv();
    }
  });
});

// ===========================================================================
// Property 3: Connect then disconnect round-trip
// ===========================================================================

describe('Property 3: Connect then disconnect round-trip', () => {
  /**
   * All accessor names that should throw after disconnect,
   * confirming the plugin returns to its initial disconnected state.
   */
  const ACCESSOR_NAMES = [
    'blockStore',
    'memberStore',
    'energyStore',
    'brightDb',
    'database',
  ] as const;

  type AccessorName = (typeof ACCESSOR_NAMES)[number];

  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('For any connected plugin, after disconnect(), isConnected() is false and the checked accessor throws — **Validates: Requirements 1.3, 6.2**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<AccessorName>(...ACCESSOR_NAMES),
        async (accessorName: AccessorName) => {
          const restoreEnv = setupEnv(undefined);
          let plugin:
            | BrightChainDatabasePlugin<DefaultBackendIdType>
            | undefined;

          try {
            const env = new Environment(undefined, true);
            plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

            // Connect the plugin
            await plugin.connect();
            expect(plugin.isConnected()).toBe(true);

            // Disconnect the plugin
            await plugin.disconnect();

            // Assert: isConnected() returns false after disconnect
            expect(plugin.isConnected()).toBe(false);

            // Assert: the selected accessor throws after disconnect
            expect(() => {
              void plugin![accessorName];
            }).toThrow(/not connected/i);
          } finally {
            if (plugin?.isConnected()) {
              await plugin.disconnect();
            }
            restoreEnv();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ===========================================================================
// Property 4: Disconnect idempotence
// ===========================================================================

describe('Property 4: Disconnect idempotence', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('For any plugin (fresh or previously connected), calling disconnect() N times completes without error — **Validates: Requirements 6.6**', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.boolean(),
        async (disconnectCount: number, connectFirst: boolean) => {
          const restoreEnv = setupEnv(undefined);
          let plugin:
            | BrightChainDatabasePlugin<DefaultBackendIdType>
            | undefined;

          try {
            const env = new Environment(undefined, true);
            plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

            if (connectFirst) {
              // Scenario 2: Previously connected plugin
              await plugin.connect();
              expect(plugin.isConnected()).toBe(true);
            } else {
              // Scenario 1: Fresh plugin (never connected)
              expect(plugin.isConnected()).toBe(false);
            }

            // Call disconnect() N times — none should throw
            for (let i = 0; i < disconnectCount; i++) {
              await plugin.disconnect();

              // After every disconnect call, isConnected() must be false
              expect(plugin.isConnected()).toBe(false);
            }
          } finally {
            if (plugin?.isConnected()) {
              await plugin.disconnect();
            }
            restoreEnv();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
