/**
 * @fileoverview Unit tests for BrightChainDatabasePlugin error conditions.
 *
 * Tests:
 * 1. connect() throws when brightchainDatabaseInit() returns failure
 * 2. init() creates auth provider correctly
 * 3. Accessors throw descriptive errors when disconnected
 *
 * _Requirements: 6.3, 6.4, 6.5_
 */

import {
  initializeBrightChain,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { Environment } from '../../environment';
import { BrightChainAuthenticationProvider } from '../../services/brightchain-authentication-provider';
import { BrightChainDatabasePlugin } from '../brightchain-database-plugin';
// Ensure the disk store factory is registered
import '../../factories/blockStoreFactory';
import type { DefaultBackendIdType } from '../../shared-types';

jest.setTimeout(60_000);

// Initialize BrightChain global services before any tests run.
// The plugin's seedWithRbac() writes blocks via BrightDb.withTransaction,
// which creates RawDataBlock instances that require the global ServiceProvider.
beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

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
 * Set up required env vars for memory-backed config (no BRIGHTCHAIN_BLOCKSTORE_PATH).
 * Returns a cleanup function that restores the original env state.
 */
function setupEnv(): () => void {
  const saved: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(REQUIRED_ENV_VARS)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  saved['BRIGHTCHAIN_BLOCKSTORE_PATH'] =
    process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  saved['BLOCKSTORE_PATH'] = process.env['BLOCKSTORE_PATH'];
  saved['DEV_DATABASE'] = process.env['DEV_DATABASE'];
  delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  delete process.env['BLOCKSTORE_PATH'];
  process.env['DEV_DATABASE'] = 'ephemeral-plugin-test';

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
// 1. connect() throws when brightchainDatabaseInit() returns failure
// ===========================================================================

jest.mock('../../databaseInit', () => ({
  brightchainDatabaseInit: jest.fn(),
}));

// Import the mocked module after jest.mock declaration
import { brightchainDatabaseInit } from '../../databaseInit';

const mockedDatabaseInit = brightchainDatabaseInit as jest.MockedFunction<
  typeof brightchainDatabaseInit
>;

describe('connect() throws when brightchainDatabaseInit() returns failure', () => {
  let restoreEnv: () => void;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    restoreEnv = setupEnv();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    restoreEnv();
    jest.restoreAllMocks();
  });

  it('throws with the error message from initResult when success is false', async () => {
    mockedDatabaseInit.mockResolvedValue({
      success: false,
      error: 'simulated init failure',
    });

    const env = new Environment<DefaultBackendIdType>(undefined, true);
    const plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

    await expect(plugin.connect()).rejects.toThrow(/simulated init failure/);

    expect(plugin.isConnected()).toBe(false);
  });

  it('throws with "unknown error" when success is false and no error message provided', async () => {
    mockedDatabaseInit.mockResolvedValue({
      success: false,
    });

    const env = new Environment<DefaultBackendIdType>(undefined, true);
    const plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

    await expect(plugin.connect()).rejects.toThrow(/unknown error/);

    expect(plugin.isConnected()).toBe(false);
  });

  it('throws when success is true but backend is missing', async () => {
    mockedDatabaseInit.mockResolvedValue({
      success: true,
      backend: undefined,
    });

    const env = new Environment<DefaultBackendIdType>(undefined, true);
    const plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

    await expect(plugin.connect()).rejects.toThrow(
      /BrightChain database initialization failed/,
    );

    expect(plugin.isConnected()).toBe(false);
  });
});

// ===========================================================================
// 2. init() creates auth provider correctly
// ===========================================================================

describe('init() creates auth provider correctly', () => {
  let restoreEnv: () => void;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    restoreEnv = setupEnv();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    // Restore the real implementation for connect tests
    mockedDatabaseInit.mockRestore();
  });

  afterEach(async () => {
    warnSpy.mockRestore();
    restoreEnv();
  });

  it('sets authenticationProvider to a BrightChainAuthenticationProvider instance after init()', async () => {
    // Re-import the real implementation since we restored the mock
    const { brightchainDatabaseInit: realInit } =
      jest.requireActual<typeof import('../../databaseInit')>(
        '../../databaseInit',
      );
    mockedDatabaseInit.mockImplementation(realInit);

    const env = new Environment<DefaultBackendIdType>(undefined, true);
    const plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

    // Connect first (required before init)
    await plugin.connect();
    expect(plugin.isConnected()).toBe(true);

    // authenticationProvider should be undefined before init()
    expect(plugin.authenticationProvider).toBeUndefined();

    // Create a minimal mock app satisfying IBrightChainApplication
    const serviceMap = new Map();
    const mockApp = {
      environment: env,
      services: {
        get: (key: string) => serviceMap.get(key),
        register: (key: string, factory: () => unknown) => serviceMap.set(key, factory()),
      },
      getController: () => undefined,
      setController: () => undefined,
    };

    await plugin.init(mockApp as never);

    // authenticationProvider should now be defined and correct type
    expect(plugin.authenticationProvider).toBeDefined();
    expect(plugin.authenticationProvider).toBeInstanceOf(
      BrightChainAuthenticationProvider,
    );

    await plugin.disconnect();
  });
});

// ===========================================================================
// 3. Accessors throw descriptive errors when disconnected
// ===========================================================================

describe('Accessors throw descriptive errors when disconnected', () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    restoreEnv = setupEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  /**
   * Helper to access a named property on the plugin.
   * Avoids unsafe casts by switching on known accessor names.
   */
  function accessProperty(
    plugin: BrightChainDatabasePlugin<DefaultBackendIdType>,
    name: string,
  ): void {
    switch (name) {
      case 'blockStore':
        void plugin.blockStore;
        break;
      case 'memberStore':
        void plugin.memberStore;
        break;
      case 'energyStore':
        void plugin.energyStore;
        break;
      case 'brightDb':
        void plugin.brightDb;
        break;
      case 'database':
        void plugin.database;
        break;
      default:
        throw new Error(`Unknown accessor: ${name}`);
    }
  }

  const accessorCases: Array<{ name: string }> = [
    { name: 'blockStore' },
    { name: 'memberStore' },
    { name: 'energyStore' },
    { name: 'brightDb' },
    { name: 'database' },
  ];

  it.each(accessorCases)(
    'accessing "$name" on a disconnected plugin throws with accessor name and "not connected"',
    ({ name }) => {
      const env = new Environment<DefaultBackendIdType>(undefined, true);
      const plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

      expect(plugin.isConnected()).toBe(false);

      expect(() => {
        accessProperty(plugin, name);
      }).toThrow(new RegExp(`${name}.*not connected`, 'i'));
    },
  );

  it.each(accessorCases)(
    'error message for "$name" contains the accessor name in the message',
    ({ name }) => {
      const env = new Environment<DefaultBackendIdType>(undefined, true);
      const plugin = new BrightChainDatabasePlugin<DefaultBackendIdType>(env);

      try {
        accessProperty(plugin, name);
        // Should not reach here
        expect(true).toBe(false);
      } catch (err: unknown) {
        const error = err as Error;
        expect(error.message).toContain(name);
        expect(error.message).toMatch(/not connected/i);
      }
    },
  );
});
