/**
 * Tests for the constants implementation.
 * Validates Requirements 1.2, 1.3, 1.4, 1.5, 2.5, 6.1, 6.2, 6.3
 *
 * Property 1: Backward Compatibility of Constant Names
 * Property 2: Constant Values Unchanged
 * Property 3: Nested Property Access Preserved
 *
 * Note: Per the block-encryption-scheme design, ecies-lib constants (ECIES, CHECKSUM, etc.)
 * should be imported directly from @digitaldefiance/ecies-lib, not re-exported from constants.ts.
 * BrightChain-specific constants (CBL, TUPLE, SEALING, etc.) are defined locally.
 */

import { Constants as BaseConstants, ECIES } from '@digitaldefiance/ecies-lib';
import {
  BC_FEC,
  CBL,
  CONSTANTS,
  OFFS_CACHE_PERCENTAGE,
  SEALING,
  SITE,
  TUPLE,
} from './constants';

describe('Constants Implementation', () => {
  describe('Property 1: Backward Compatibility of Constant Names (Requirements 1.5, 2.5, 6.1)', () => {
    it('should export CONSTANTS object', () => {
      expect(CONSTANTS).toBeDefined();
      expect(typeof CONSTANTS).toBe('object');
    });

    it('should export individual constant groups as named exports', () => {
      expect(CBL).toBeDefined();
      expect(BC_FEC).toBeDefined();
      expect(TUPLE).toBeDefined();
      expect(SEALING).toBeDefined();
      expect(SITE).toBeDefined();
      expect(OFFS_CACHE_PERCENTAGE).toBeDefined();
    });

    it('should include all base constants from @digitaldefiance/ecies-lib', () => {
      // Verify that all base constant properties are accessible via spread
      expect(CONSTANTS['UINT8_SIZE']).toBeDefined();
      expect(CONSTANTS['UINT16_SIZE']).toBeDefined();
      expect(CONSTANTS['UINT16_MAX']).toBeDefined();
      expect(CONSTANTS['UINT32_SIZE']).toBeDefined();
      expect(CONSTANTS['UINT32_MAX']).toBeDefined();
      expect(CONSTANTS['UINT64_SIZE']).toBeDefined();
      expect(CONSTANTS['UINT64_MAX']).toBeDefined();
      expect(CONSTANTS['HEX_RADIX']).toBeDefined();
      expect(CONSTANTS['idProvider']).toBeDefined();
      expect(CONSTANTS['CHECKSUM']).toBeDefined();
      expect(CONSTANTS['ECIES']).toBeDefined();
      expect(CONSTANTS['PBKDF2']).toBeDefined();
      expect(CONSTANTS['PBKDF2_PROFILES']).toBeDefined();
      expect(CONSTANTS['VOTING']).toBeDefined();
      expect(CONSTANTS['BcryptRounds']).toBeDefined();
      expect(CONSTANTS['PasswordMinLength']).toBeDefined();
      expect(CONSTANTS['PasswordRegex']).toBeDefined();
      expect(CONSTANTS['MnemonicRegex']).toBeDefined();
      expect(CONSTANTS['MnemonicHmacRegex']).toBeDefined();
    });

    it('should include all BrightChain-specific constants', () => {
      expect(CONSTANTS['CBL']).toBeDefined();
      expect(CONSTANTS['OFFS_CACHE_PERCENTAGE']).toBeDefined();
      expect(CONSTANTS['BC_FEC']).toBeDefined();
      expect(CONSTANTS['TUPLE']).toBeDefined();
      expect(CONSTANTS['SEALING']).toBeDefined();
      expect(CONSTANTS['SITE']).toBeDefined();
    });
  });

  describe('Property 2: Constant Values Unchanged (Requirement 6.2)', () => {
    describe('Base constants should match upstream values', () => {
      it('should have correct UINT sizes', () => {
        expect(CONSTANTS['UINT8_SIZE']).toBe(BaseConstants.UINT8_SIZE);
        expect(CONSTANTS['UINT16_SIZE']).toBe(BaseConstants.UINT16_SIZE);
        expect(CONSTANTS['UINT16_MAX']).toBe(BaseConstants.UINT16_MAX);
        expect(CONSTANTS['UINT32_SIZE']).toBe(BaseConstants.UINT32_SIZE);
        expect(CONSTANTS['UINT32_MAX']).toBe(BaseConstants.UINT32_MAX);
        expect(CONSTANTS['UINT64_SIZE']).toBe(BaseConstants.UINT64_SIZE);
        expect(CONSTANTS['UINT64_MAX']).toBe(BaseConstants.UINT64_MAX);
      });

      it('should have correct HEX_RADIX', () => {
        expect(CONSTANTS['HEX_RADIX']).toBe(BaseConstants.HEX_RADIX);
      });

      it('should have correct CHECKSUM values', () => {
        expect(CONSTANTS['CHECKSUM']).toEqual(BaseConstants.CHECKSUM);
      });

      it('should have correct PBKDF2 values', () => {
        expect(CONSTANTS['PBKDF2']).toEqual(BaseConstants.PBKDF2);
      });

      it('should have correct PBKDF2_PROFILES', () => {
        expect(CONSTANTS['PBKDF2_PROFILES']).toEqual(
          BaseConstants.PBKDF2_PROFILES,
        );
      });

      it('should have correct VOTING values', () => {
        expect(CONSTANTS['VOTING']).toEqual(BaseConstants.VOTING);
      });

      it('should have correct ECIES values', () => {
        expect(CONSTANTS['ECIES']).toEqual(BaseConstants.ECIES);
      });

      it('should have correct password and mnemonic settings', () => {
        expect(CONSTANTS['BcryptRounds']).toBe(BaseConstants.BcryptRounds);
        expect(CONSTANTS['PasswordMinLength']).toBe(
          BaseConstants.PasswordMinLength,
        );
        expect(CONSTANTS['PasswordRegex']).toEqual(BaseConstants.PasswordRegex);
        expect(CONSTANTS['MnemonicRegex']).toEqual(BaseConstants.MnemonicRegex);
        expect(CONSTANTS['MnemonicHmacRegex']).toEqual(
          BaseConstants.MnemonicHmacRegex,
        );
      });
    });

    describe('BrightChain-specific constants should have expected values', () => {
      it('should have correct CBL values', () => {
        expect(CONSTANTS['CBL'].BASE_OVERHEAD).toBe(170);
        expect(CONSTANTS['CBL'].MIME_TYPE_PATTERN).toEqual(
          /^[a-z0-9-]+\/[a-z0-9-]+$/,
        );
        expect(CONSTANTS['CBL'].FILE_NAME_PATTERN).toEqual(/^[^<>:"/\\|?*]+$/);
        expect(CONSTANTS['CBL'].FILE_NAME_TRAVERSAL_PATTERN).toEqual(
          /(^|[\\/])\.\.($|[\\/])/,
        );
        expect(CONSTANTS['CBL'].MAX_FILE_NAME_LENGTH).toBe(255);
        expect(CONSTANTS['CBL'].MAX_MIME_TYPE_LENGTH).toBe(127);
        expect(CONSTANTS['CBL'].MAX_INPUT_FILE_SIZE).toBe(9007199254740991);
      });

      it('should have correct OFFS_CACHE_PERCENTAGE', () => {
        expect(CONSTANTS['OFFS_CACHE_PERCENTAGE']).toBe(0.7);
      });

      it('should have correct FEC values', () => {
        expect(CONSTANTS['BC_FEC'].MAX_SHARD_SIZE).toBe(1048576);
      });

      it('should have correct TUPLE values', () => {
        expect(CONSTANTS['TUPLE'].MIN_RANDOM_BLOCKS).toBe(2);
        expect(CONSTANTS['TUPLE'].MAX_RANDOM_BLOCKS).toBe(5);
        expect(CONSTANTS['TUPLE'].RANDOM_BLOCKS_PER_TUPLE).toBe(2);
        expect(CONSTANTS['TUPLE'].SIZE).toBe(3);
        expect(CONSTANTS['TUPLE'].MIN_SIZE).toBe(2);
        expect(CONSTANTS['TUPLE'].MAX_SIZE).toBe(10);
      });

      it('should have correct SEALING values', () => {
        expect(CONSTANTS['SEALING'].MIN_SHARES).toBe(2);
        expect(CONSTANTS['SEALING'].MAX_SHARES).toBe(1048575);
      });

      it('should have correct SITE values', () => {
        expect(CONSTANTS['SITE'].EMAIL_FROM).toBe('noreply@brightchain.org');
        expect(CONSTANTS['SITE'].DOMAIN).toBe('localhost:3000');
        expect(CONSTANTS['SITE'].CSP_NONCE_SIZE).toBe(32);
      });
    });
  });

  describe('Property 3: Nested Property Access Preserved (Requirement 6.3)', () => {
    it('should allow nested access to CBL properties', () => {
      expect(CONSTANTS['CBL'].BASE_OVERHEAD).toBe(170);
      expect(CONSTANTS['CBL'].MAX_FILE_NAME_LENGTH).toBe(255);
      expect(CONSTANTS['CBL'].MAX_MIME_TYPE_LENGTH).toBe(127);
      expect(CONSTANTS['CBL'].MAX_INPUT_FILE_SIZE).toBe(9007199254740991);
    });

    it('should allow nested access to FEC properties', () => {
      expect(CONSTANTS['BC_FEC'].MAX_SHARD_SIZE).toBe(1048576);
    });

    it('should allow nested access to TUPLE properties', () => {
      expect(CONSTANTS['TUPLE'].MIN_RANDOM_BLOCKS).toBe(2);
      expect(CONSTANTS['TUPLE'].MAX_RANDOM_BLOCKS).toBe(5);
      expect(CONSTANTS['TUPLE'].SIZE).toBe(3);
    });

    it('should allow nested access to SEALING properties', () => {
      expect(CONSTANTS['SEALING'].MIN_SHARES).toBe(2);
      expect(CONSTANTS['SEALING'].MAX_SHARES).toBe(1048575);
    });

    it('should allow nested access to SITE properties', () => {
      expect(CONSTANTS['SITE'].EMAIL_FROM).toBe('noreply@brightchain.org');
      expect(CONSTANTS['SITE'].DOMAIN).toBe('localhost:3000');
      expect(CONSTANTS['SITE'].CSP_NONCE_SIZE).toBe(32);
    });

    it('should allow nested access to CHECKSUM properties from upstream', () => {
      expect(CONSTANTS['CHECKSUM'].ALGORITHM).toBeDefined();
      expect(CONSTANTS['CHECKSUM'].ENCODING).toBeDefined();
    });

    it('should allow nested access to ECIES properties from upstream', () => {
      expect(CONSTANTS['ECIES'].CURVE_NAME).toBeDefined();
      expect(CONSTANTS['ECIES'].SYMMETRIC).toBeDefined();
      expect(CONSTANTS['ECIES'].SYMMETRIC.ALGORITHM).toBeDefined();
      expect(CONSTANTS['ECIES'].SYMMETRIC.KEY_BITS).toBeDefined();
    });

    it('should allow nested access to PBKDF2 properties from upstream', () => {
      expect(CONSTANTS['PBKDF2'].ALGORITHM).toBeDefined();
      expect(CONSTANTS['PBKDF2'].SALT_BYTES).toBeDefined();
    });

    it('should allow nested access to VOTING properties from upstream', () => {
      expect(CONSTANTS['VOTING'].PRIME_GEN_INFO).toBeDefined();
      expect(CONSTANTS['VOTING'].KEYPAIR_BIT_LENGTH).toBeDefined();
    });
  });

  describe('Spread operator behavior (Requirement 1.2)', () => {
    it('should spread all base constants into CONSTANTS object', () => {
      // Verify that spreading worked correctly by checking a sample of properties
      const baseKeys = Object.keys(BaseConstants);
      const constantsKeys = Object.keys(CONSTANTS);

      // All base keys should be present in CONSTANTS
      baseKeys.forEach((key) => {
        expect(constantsKeys).toContain(key);
      });
    });

    it('should not override base constants with undefined', () => {
      // Verify that no base constant was accidentally set to undefined
      expect(CONSTANTS['UINT8_SIZE']).not.toBeUndefined();
      expect(CONSTANTS['CHECKSUM']).not.toBeUndefined();
      expect(CONSTANTS['ECIES']).not.toBeUndefined();
      expect(CONSTANTS['PBKDF2']).not.toBeUndefined();
      expect(CONSTANTS['VOTING']).not.toBeUndefined();
    });
  });

  describe('Duplicate constants removed (Requirement 1.4)', () => {
    it('should define CHECKSUM locally with BrightChain-specific values', () => {
      // CHECKSUM is defined locally because BrightChain uses sha3-512 specifically
      expect(CONSTANTS['CHECKSUM'].ALGORITHM).toBe('sha3-512');
      expect(CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH).toBe(64);
    });

    it('should not define VOTING locally (use from upstream)', () => {
      // VOTING should come from BaseConstants, not be defined locally
      expect(CONSTANTS['VOTING']).toStrictEqual(BaseConstants.VOTING);
    });

    it('should not define UINT sizes locally (use from upstream)', () => {
      // UINT sizes should come from BaseConstants, not be defined locally
      expect(CONSTANTS['UINT8_SIZE']).toBe(BaseConstants.UINT8_SIZE);
      expect(CONSTANTS['UINT16_SIZE']).toBe(BaseConstants.UINT16_SIZE);
      expect(CONSTANTS['UINT32_SIZE']).toBe(BaseConstants.UINT32_SIZE);
      expect(CONSTANTS['UINT64_SIZE']).toBe(BaseConstants.UINT64_SIZE);
    });
  });

  describe('BrightChain-specific constants only (Requirement 1.3)', () => {
    it('should define CBL constants locally', () => {
      expect(CBL).toBeDefined();
      expect(CONSTANTS['CBL']).toBe(CBL);
    });

    it('should define FEC constants locally', () => {
      expect(BC_FEC).toBeDefined();
      expect(CONSTANTS['BC_FEC']).toBe(BC_FEC);
    });

    it('should define TUPLE constants locally', () => {
      expect(TUPLE).toBeDefined();
      expect(CONSTANTS['TUPLE']).toBe(TUPLE);
    });

    it('should define SEALING constants locally', () => {
      expect(SEALING).toBeDefined();
      expect(CONSTANTS['SEALING']).toBe(SEALING);
    });

    it('should define SITE constants locally', () => {
      expect(SITE).toBeDefined();
      expect(CONSTANTS['SITE']).toBe(SITE);
    });

    it('should define OFFS_CACHE_PERCENTAGE locally', () => {
      expect(OFFS_CACHE_PERCENTAGE).toBeDefined();
      expect(CONSTANTS['OFFS_CACHE_PERCENTAGE']).toBe(OFFS_CACHE_PERCENTAGE);
    });
  });

  describe('ecies-lib ECIES constants structure (Requirements 7.1, 7.2)', () => {
    it('should have correct ECIES structure from ecies-lib', () => {
      // Verify ECIES constants are imported correctly from ecies-lib
      expect(ECIES.CURVE_NAME).toBe('secp256k1');
      expect(ECIES.PUBLIC_KEY_LENGTH).toBe(33);
      expect(ECIES.IV_SIZE).toBe(12);
      expect(ECIES.AUTH_TAG_SIZE).toBe(16);
      expect(ECIES.SIGNATURE_SIZE).toBe(64);
    });

    it('should have correct ECIES.SYMMETRIC structure', () => {
      expect(ECIES.SYMMETRIC.ALGORITHM).toBe('aes');
      expect(ECIES.SYMMETRIC.MODE).toBe('gcm');
      expect(ECIES.SYMMETRIC.KEY_BITS).toBe(256);
      expect(ECIES.SYMMETRIC.KEY_SIZE).toBe(32);
    });

    it('should have correct ECIES.BASIC structure', () => {
      // BASIC: version(1) + cipher_suite(1) + type(1) + pubkey(33) + iv(12) + tag(16) = 64
      expect(ECIES.BASIC.FIXED_OVERHEAD_SIZE).toBe(64);
      expect(ECIES.BASIC.DATA_LENGTH_SIZE).toBe(0);
    });

    it('should have correct ECIES.WITH_LENGTH structure', () => {
      // WITH_LENGTH: BASIC(64) + data_length(8) = 72
      expect(ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE).toBe(72);
      expect(ECIES.WITH_LENGTH.DATA_LENGTH_SIZE).toBe(8);
    });

    it('should have correct ECIES.MULTIPLE structure', () => {
      // MULTIPLE header: version(1) + cipher_suite(1) + type(1) + pubkey(33) + iv(12) + tag(16) = 64
      expect(ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE).toBe(64);
      // Per-recipient encrypted key: iv(12) + tag(16) + key(32) = 60
      expect(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE).toBe(60);
      expect(ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE).toBe(2);
      expect(ECIES.MULTIPLE.DATA_LENGTH_SIZE).toBe(8);
      expect(ECIES.MULTIPLE.MAX_RECIPIENTS).toBe(65535);
    });

    it('should have correct ECIES.ENCRYPTION_TYPE values', () => {
      expect(ECIES.ENCRYPTION_TYPE.BASIC).toBe(33); // 0x21
      expect(ECIES.ENCRYPTION_TYPE.WITH_LENGTH).toBe(66); // 0x42
      expect(ECIES.ENCRYPTION_TYPE.MULTIPLE).toBe(99); // 0x63
    });
  });
});
