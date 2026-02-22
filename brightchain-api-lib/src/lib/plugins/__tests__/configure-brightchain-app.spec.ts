/**
 * @fileoverview Unit tests for configureBrightChainApp().
 *
 * Tests:
 * 1. Constants are updated with GUID byte length
 * 2. registerNodeRuntimeConfiguration is called once
 * 3. Plugin is registered on the app
 * 4. ENCRYPTION update when property exists
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.4_
 */

import type { IConstants as IEciesConstants } from '@digitaldefiance/ecies-lib';
import { GuidV4Provider } from '@digitaldefiance/node-ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { BrightChainDatabasePlugin } from '../brightchain-database-plugin';

// ── Mock registerNodeRuntimeConfiguration ──────────────────────────
jest.mock('@digitaldefiance/node-ecies-lib', () => {
  const actual = jest.requireActual<
    typeof import('@digitaldefiance/node-ecies-lib')
  >('@digitaldefiance/node-ecies-lib');
  return {
    ...actual,
    registerNodeRuntimeConfiguration: jest.fn(),
  };
});

import { registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { configureBrightChainApp } from '../configure-brightchain-app';

const mockedRegister = registerNodeRuntimeConfiguration as jest.MockedFunction<
  typeof registerNodeRuntimeConfiguration
>;

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
 * Set up required env vars for memory-backed config.
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
  delete process.env['BRIGHTCHAIN_BLOCKSTORE_PATH'];
  delete process.env['BLOCKSTORE_PATH'];

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
 * Create a minimal mock constants object with the fields that
 * configureBrightChainApp reads and writes.
 */
function createMockConstants(
  options: { includeEncryption?: boolean } = {},
): IEciesConstants & Record<string, unknown> {
  const constants: IEciesConstants & Record<string, unknown> = {
    UINT8_SIZE: 1,
    UINT16_SIZE: 2,
    UINT16_MAX: 65535,
    UINT32_SIZE: 4,
    UINT32_MAX: 4294967295,
    UINT64_SIZE: 8,
    UINT64_MAX: BigInt('18446744073709551615'),
    HEX_RADIX: 16,
    MEMBER_ID_LENGTH: 12, // initial value (ObjectId size)
    idProvider: {
      byteLength: 12,
      name: 'mock',
      generate: () => new Uint8Array(12),
      validate: () => true,
      serialize: () => '',
      deserialize: () => new Uint8Array(12),
      toBytes: () => new Uint8Array(12),
      fromBytes: () => new Uint8Array(12),
    },
    CHECKSUM: {
      SHA3_DEFAULT_HASH_BITS: 256,
      SHA3_BUFFER_LENGTH: 32,
      ALGORITHM: 'sha3-256',
      ENCODING: 'hex',
    },
    ECIES: {
      CURVE_NAME: 'secp256k1',
      PRIMARY_KEY_DERIVATION_PATH: "m/44'/60'/0'/0/0",
      SYMMETRIC_ALGORITHM_CONFIGURATION: 'aes-256-gcm' as const,
      SIGNATURE_SIZE: 64,
      RAW_PUBLIC_KEY_LENGTH: 64,
      PUBLIC_KEY_LENGTH: 65,
      PUBLIC_KEY_MAGIC: 0x04,
      MNEMONIC_STRENGTH: 256,
      SYMMETRIC: { ALGORITHM: 'aes', MODE: 'gcm', KEY_BITS: 256, KEY_SIZE: 32 },
      IV_SIZE: 16,
      AUTH_TAG_SIZE: 16,
      MAX_RAW_DATA_SIZE: Number.MAX_SAFE_INTEGER,
      VERSION_SIZE: 1,
      CIPHER_SUITE_SIZE: 1,
      ENCRYPTION_TYPE_SIZE: 1,
      BASIC: { FIXED_OVERHEAD_SIZE: 100, DATA_LENGTH_SIZE: 0 },
      WITH_LENGTH: { FIXED_OVERHEAD_SIZE: 104, DATA_LENGTH_SIZE: 4 },
      MULTIPLE: {
        FIXED_OVERHEAD_SIZE: 120,
        ENCRYPTED_KEY_SIZE: 48,
        MAX_RECIPIENTS: 255,
        MAX_DATA_SIZE: Number.MAX_SAFE_INTEGER,
        RECIPIENT_ID_SIZE: 12, // initial value
        RECIPIENT_COUNT_SIZE: 1,
        DATA_LENGTH_SIZE: 4,
      },
      ENCRYPTION_TYPE: { BASIC: 0, WITH_LENGTH: 1, MULTIPLE: 2 },
    },
    ECIES_CONFIG: {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/60'/0'/0/0",
      mnemonicStrength: 256,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    },
    PBKDF2: {
      ALGORITHM: 'pbkdf2',
      SALT_BYTES: 32,
      ITERATIONS_PER_SECOND: 100000,
    },
    PBKDF2_PROFILES: {} as IEciesConstants['PBKDF2_PROFILES'],
    VOTING: {} as IEciesConstants['VOTING'],
    BcryptRounds: 10,
    PasswordMinLength: 8,
    PasswordRegex: /^.{8,}$/,
    MnemonicRegex: /^(\w+ ){11}\w+$/,
    MnemonicHmacRegex: /^[a-fA-F0-9]+$/,
  };

  if (options.includeEncryption) {
    (constants as Record<string, unknown>)['ENCRYPTION'] = {
      ENCRYPTION_TYPE_SIZE: 1,
      RECIPIENT_ID_SIZE: 12, // initial value
    };
  }

  return constants;
}

/**
 * Create a minimal mock Application with a useDatabasePlugin spy.
 */
function createMockApp(): {
  useDatabasePlugin: jest.Mock;
} {
  return {
    useDatabasePlugin: jest.fn().mockReturnThis(),
  };
}

// ===========================================================================
// Tests
// ===========================================================================

describe('configureBrightChainApp()', () => {
  let restoreEnv: () => void;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    restoreEnv = setupEnv();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockedRegister.mockClear();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    restoreEnv();
  });

  // ─── 1. Constants are updated with GUID byte length ───────────────

  describe('constants are updated with GUID byte length', () => {
    it('sets idProvider to a GuidV4Provider instance', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      expect(constants.idProvider).toBeInstanceOf(GuidV4Provider);
    });

    it('sets MEMBER_ID_LENGTH to GuidV4Provider.byteLength (16)', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      expect(constants.MEMBER_ID_LENGTH).toBe(16);
    });

    it('sets ECIES.MULTIPLE.RECIPIENT_ID_SIZE to GuidV4Provider.byteLength (16)', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      expect(constants.ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(16);
    });

    it('preserves other ECIES.MULTIPLE fields', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      // Other MULTIPLE fields should remain unchanged
      expect(constants.ECIES.MULTIPLE.MAX_RECIPIENTS).toBe(255);
      expect(constants.ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE).toBe(1);
      expect(constants.ECIES.MULTIPLE.DATA_LENGTH_SIZE).toBe(4);
    });
  });

  // ─── 2. registerNodeRuntimeConfiguration is called once ───────────

  describe('registerNodeRuntimeConfiguration is called once', () => {
    it('calls registerNodeRuntimeConfiguration exactly once', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      expect(mockedRegister).toHaveBeenCalledTimes(1);
    });

    it('calls registerNodeRuntimeConfiguration with "guid-config" and the constants', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      expect(mockedRegister).toHaveBeenCalledWith('guid-config', constants);
    });
  });

  // ─── 3. Plugin is registered on the app ───────────────────────────

  describe('plugin is registered on the app', () => {
    it('calls app.useDatabasePlugin once', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      expect(mockApp.useDatabasePlugin).toHaveBeenCalledTimes(1);
    });

    it('registers a BrightChainDatabasePlugin instance', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      const registeredPlugin = mockApp.useDatabasePlugin.mock.calls[0][0];
      expect(registeredPlugin).toBeInstanceOf(BrightChainDatabasePlugin);
    });

    it('returns the same plugin that was registered', () => {
      const constants = createMockConstants();
      const mockApp = createMockApp();

      const result = configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      const registeredPlugin = mockApp.useDatabasePlugin.mock.calls[0][0];
      expect(result.plugin).toBe(registeredPlugin);
    });
  });

  // ─── 4. ENCRYPTION update when property exists ────────────────────

  describe('ENCRYPTION update when property exists', () => {
    it('updates ENCRYPTION.RECIPIENT_ID_SIZE when ENCRYPTION is present', () => {
      const constants = createMockConstants({ includeEncryption: true });
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      const encryption = (constants as Record<string, unknown>)[
        'ENCRYPTION'
      ] as { RECIPIENT_ID_SIZE: number };
      expect(encryption.RECIPIENT_ID_SIZE).toBe(16);
    });

    it('preserves ENCRYPTION.ENCRYPTION_TYPE_SIZE when updating', () => {
      const constants = createMockConstants({ includeEncryption: true });
      const mockApp = createMockApp();

      configureBrightChainApp(
        mockApp as never,
        {} as never,
        constants as never,
      );

      const encryption = (constants as Record<string, unknown>)[
        'ENCRYPTION'
      ] as { ENCRYPTION_TYPE_SIZE: number };
      expect(encryption.ENCRYPTION_TYPE_SIZE).toBe(1);
    });

    it('does not throw when ENCRYPTION is not present on constants', () => {
      const constants = createMockConstants({ includeEncryption: false });
      const mockApp = createMockApp();

      expect(() => {
        configureBrightChainApp(
          mockApp as never,
          {} as never,
          constants as never,
        );
      }).not.toThrow();
    });
  });
});
