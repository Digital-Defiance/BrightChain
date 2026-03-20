/**
 * @fileoverview Unit tests for BrightChainDatabasePlugin member seeding helpers:
 *   - buildMemberInitConfig(useMemoryStore)
 *   - buildMemberInitInput()
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { BlockSize } from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import {
  GuidBuffer,
  GuidV4Buffer,
  GuidV4Provider,
  registerNodeRuntimeConfiguration,
} from '@digitaldefiance/node-ecies-lib';
import type { IConstants } from '@digitaldefiance/node-express-suite';
import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import { Constants } from '../../constants';
import { Environment } from '../../environment';
import '../../factories/blockStoreFactory';
import type { DefaultBackendIdType } from '../../shared-types';
import { BrightChainDatabasePlugin } from '../brightchain-database-plugin';

jest.setTimeout(30_000);

// Build constants with GuidV4Provider (mirrors configureBrightChainApp).
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

beforeAll(() => {
  registerNodeRuntimeConfiguration('guid-config', GuidConstants);
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
 * Keys that the tests may set/delete beyond REQUIRED_ENV_VARS.
 */
const EXTRA_KEYS = [
  'BRIGHTCHAIN_BLOCKSTORE_PATH',
  'BLOCKSTORE_PATH',
  'DEV_DATABASE',
  'MEMBER_POOL_NAME',
  'BRIGHTCHAIN_BLOCKSIZE_BYTES',
  'SYSTEM_ID',
  'ADMIN_ID',
  'MEMBER_ID',
] as const;

/**
 * Set up required env vars and return a cleanup function.
 * The Environment auto-generates valid GuidV4Buffer IDs when
 * SYSTEM_ID/ADMIN_ID/MEMBER_ID env vars are absent (now that
 * GuidV4Provider is registered).
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

  // Save and clear extra keys
  for (const key of EXTRA_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }

  // Apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (!(key in saved)) {
      saved[key] = process.env[key];
    }
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

function createPlugin(
  env: Environment<DefaultBackendIdType>,
): BrightChainDatabasePlugin<DefaultBackendIdType> {
  return new BrightChainDatabasePlugin<DefaultBackendIdType>(env);
}

/**
 * Create an Environment with GuidV4Provider constants.
 */
function createEnv(): Environment<DefaultBackendIdType> {
  return new Environment<DefaultBackendIdType>(
    undefined,
    true,
    true,
    GuidConstants,
  );
}

// ===========================================================================
// buildMemberInitConfig
// ===========================================================================

describe('buildMemberInitConfig', () => {
  let restoreEnv: () => void;

  afterEach(() => {
    restoreEnv();
  });

  it('returns useMemoryStore: true and devDatabasePoolName when in dev mode', () => {
    restoreEnv = setupEnv({ DEV_DATABASE: 'my-dev-pool' });
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig(true);

    expect(config.useMemoryStore).toBe(true);
    expect(config.memberPoolName).toBe('my-dev-pool');
    expect(config.blockSize).toBe(env.blockStoreBlockSize);
    expect(config.blockStorePath).toBe(env.blockStorePath);
  });

  it('falls back to memberPoolName when devDatabasePoolName is undefined and useMemoryStore is true', () => {
    restoreEnv = setupEnv({ MEMBER_POOL_NAME: 'FallbackPool' });
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig(true);

    expect(config.useMemoryStore).toBe(true);
    // devDatabasePoolName is undefined → falls back to memberPoolName
    expect(config.memberPoolName).toBe('FallbackPool');
  });

  it('returns useMemoryStore: false and memberPoolName for production mode', () => {
    restoreEnv = setupEnv({
      BRIGHTCHAIN_BLOCKSTORE_PATH: '/data/brightchain',
      MEMBER_POOL_NAME: 'ProdPool',
    });
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig(false);

    expect(config.useMemoryStore).toBe(false);
    expect(config.memberPoolName).toBe('ProdPool');
    expect(config.blockStorePath).toBe('/data/brightchain');
  });

  it('uses default memberPoolName "BrightChain" when MEMBER_POOL_NAME is not set', () => {
    restoreEnv = setupEnv();
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig(false);

    expect(config.memberPoolName).toBe('BrightChain');
  });

  it('uses default blockSize of BlockSize.Medium when BRIGHTCHAIN_BLOCKSIZE_BYTES is not set', () => {
    restoreEnv = setupEnv();
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig(true);

    expect(config.blockSize).toBe(BlockSize.Medium);
  });

  it('uses custom blockSize when BRIGHTCHAIN_BLOCKSIZE_BYTES is set', () => {
    restoreEnv = setupEnv({
      BRIGHTCHAIN_BLOCKSIZE_BYTES: String(BlockSize.Small),
    });
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig(true);

    expect(config.blockSize).toBe(BlockSize.Small);
  });

  it('auto-derives useMemoryStore: true when DEV_DATABASE is set and no arg is passed', () => {
    restoreEnv = setupEnv({ DEV_DATABASE: 'auto-dev-pool' });
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig();

    expect(config.useMemoryStore).toBe(true);
    expect(config.memberPoolName).toBe('auto-dev-pool');
  });

  it('auto-derives useMemoryStore: false when DEV_DATABASE is not set and no arg is passed', () => {
    restoreEnv = setupEnv({
      BRIGHTCHAIN_BLOCKSTORE_PATH: '/data/brightchain',
    });
    const env = createEnv();
    const plugin = createPlugin(env);

    const config = plugin.buildMemberInitConfig();

    expect(config.useMemoryStore).toBe(false);
  });
});

// ===========================================================================
// buildMemberInitInput
// ===========================================================================

describe('buildMemberInitInput', () => {
  let restoreEnv: () => void;

  afterEach(() => {
    restoreEnv();
  });

  it('converts auto-generated environment IDs to GuidV4Buffer and maps member types', () => {
    restoreEnv = setupEnv();
    const env = createEnv();
    const plugin = createPlugin(env);

    const input = plugin.buildMemberInitInput();

    // Verify the IDs are GuidV4Buffer instances (Buffer subtype)
    expect(Buffer.isBuffer(input.systemUser.id)).toBe(true);
    expect(Buffer.isBuffer(input.adminUser.id)).toBe(true);
    expect(Buffer.isBuffer(input.memberUser.id)).toBe(true);

    // Verify the IDs match the environment values
    const systemHex = (input.systemUser.id as GuidV4Buffer).toString('hex');
    const adminHex = (input.adminUser.id as GuidV4Buffer).toString('hex');
    const memberHex = (input.memberUser.id as GuidV4Buffer).toString('hex');

    expect(systemHex).toBe((env.systemId as GuidV4Buffer).toString('hex'));
    expect(adminHex).toBe((env.adminId as GuidV4Buffer).toString('hex'));
    expect(memberHex).toBe((env.memberId as GuidV4Buffer).toString('hex'));

    // Verify member types
    expect(input.systemUser.type).toBe(MemberType.System);
    expect(input.adminUser.type).toBe(MemberType.Admin);
    expect(input.memberUser.type).toBe(MemberType.User);
  });

  it('returns three distinct user entries with id and type', () => {
    restoreEnv = setupEnv();
    const env = createEnv();
    const plugin = createPlugin(env);

    const input = plugin.buildMemberInitInput();

    expect(input).toHaveProperty('systemUser');
    expect(input).toHaveProperty('adminUser');
    expect(input).toHaveProperty('memberUser');

    // Each entry has id and type
    for (const entry of [input.systemUser, input.adminUser, input.memberUser]) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('type');
    }
  });

  it('throws when environment IDs are missing', () => {
    restoreEnv = setupEnv();
    const env = createEnv();
    const plugin = createPlugin(env);

    // Simulate missing IDs by overriding the environment getter via
    // Object.defineProperty on the environment instance.
    Object.defineProperty(env, 'systemId', { get: () => undefined });

    expect(() => plugin.buildMemberInitInput()).toThrow(
      /systemId.*adminId.*memberId/i,
    );
  });

  it('assigns MemberType.System to systemUser and MemberType.Admin to admin and MemberType.User to member', () => {
    restoreEnv = setupEnv();
    const env = createEnv();
    const plugin = createPlugin(env);

    const input = plugin.buildMemberInitInput();

    expect(input.systemUser.type).toBe(MemberType.System);
    expect(input.adminUser.type).toBe(MemberType.Admin);
    expect(input.memberUser.type).toBe(MemberType.User);
  });

  it('produces GuidBuffer instances (not raw Buffer casts) for all user IDs', () => {
    restoreEnv = setupEnv();
    const env = createEnv();
    const plugin = createPlugin(env);

    const input = plugin.buildMemberInitInput();

    // Each ID should be a GuidBuffer (has asFullHexGuid property)
    for (const entry of [input.systemUser, input.adminUser, input.memberUser]) {
      expect(entry.id).toBeInstanceOf(GuidBuffer);
      expect(typeof (entry.id as GuidV4Buffer).asFullHexGuid).toBe('string');
    }
  });
});
