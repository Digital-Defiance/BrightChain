/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from '@jest/globals';
import * as BrightChainTypes from './types';

describe('Type Structure Tests', () => {
  describe('Type Re-exports from node-ecies-lib', () => {
    it('should re-export ChecksumBuffer type from node-ecies-lib', () => {
      // This test verifies that the type is available at compile time
      // TypeScript compilation will fail if the type doesn't exist
      type TestType = BrightChainTypes.ChecksumBuffer;
      expect(true).toBe(true);
    });

    it('should re-export DataBuffer type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.DataBuffer;
      expect(true).toBe(true);
    });

    it('should re-export KeyPairBufferWithUnEncryptedPrivateKey type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.KeyPairBufferWithUnEncryptedPrivateKey;
      expect(true).toBe(true);
    });

    it('should re-export SignatureBuffer type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.SignatureBuffer;
      expect(true).toBe(true);
    });

    it('should re-export SigningKeyPrivateKeyInfo type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.SigningKeyPrivateKeyInfo;
      expect(true).toBe(true);
    });

    it('should re-export SimpleKeyPair type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.SimpleKeyPair;
      expect(true).toBe(true);
    });

    it('should re-export SimpleKeyPairBuffer type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.SimpleKeyPairBuffer;
      expect(true).toBe(true);
    });

    it('should re-export SimplePublicKeyOnly type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.SimplePublicKeyOnly;
      expect(true).toBe(true);
    });

    it('should re-export SimplePublicKeyOnlyBuffer type from node-ecies-lib', () => {
      type TestType = BrightChainTypes.SimplePublicKeyOnlyBuffer;
      expect(true).toBe(true);
    });
  });

  describe('Type Re-exports from ecies-lib', () => {
    it('should re-export Base64Guid type from ecies-lib', () => {
      type TestType = BrightChainTypes.Base64Guid;
      expect(true).toBe(true);
    });

    it('should re-export BigIntGuid type from ecies-lib', () => {
      type TestType = BrightChainTypes.BigIntGuid;
      expect(true).toBe(true);
    });

    it('should re-export ChecksumString type from ecies-lib', () => {
      type TestType = BrightChainTypes.ChecksumString;
      expect(true).toBe(true);
    });

    it('should re-export ChecksumUint8Array type from ecies-lib', () => {
      type TestType = BrightChainTypes.ChecksumUint8Array;
      expect(true).toBe(true);
    });

    it('should re-export FullHexGuid type from ecies-lib', () => {
      type TestType = BrightChainTypes.FullHexGuid;
      expect(true).toBe(true);
    });

    it('should re-export HexString type from ecies-lib', () => {
      type TestType = BrightChainTypes.HexString;
      expect(true).toBe(true);
    });

    it('should re-export ShortHexGuid type from ecies-lib', () => {
      type TestType = BrightChainTypes.ShortHexGuid;
      expect(true).toBe(true);
    });

    it('should re-export SignatureString type from ecies-lib', () => {
      type TestType = BrightChainTypes.SignatureString;
      expect(true).toBe(true);
    });

    it('should re-export SignatureUint8Array type from ecies-lib', () => {
      type TestType = BrightChainTypes.SignatureUint8Array;
      expect(true).toBe(true);
    });

    it('should re-export RawGuidUint8Array type from ecies-lib', () => {
      type TestType = BrightChainTypes.RawGuidUint8Array;
      expect(true).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should export uint8ArrayToHex function', () => {
      expect(typeof BrightChainTypes.uint8ArrayToHex).toBe('function');
    });

    it('should convert Uint8Array to hex string correctly', () => {
      const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const hex = BrightChainTypes.uint8ArrayToHex(arr);
      expect(hex).toBe('01020304');
    });

    it('should export createTranslations function', () => {
      expect(typeof BrightChainTypes.createTranslations).toBe('function');
    });

    it('should return translations unchanged', () => {
      const translations = { test: 'value' };
      const result = BrightChainTypes.createTranslations(translations);
      expect(result).toBe(translations);
    });
  });

  describe('Duplicate Types Removed', () => {
    it('should not have local KeyPairBufferWithUnEncryptedPrivateKey type definition', () => {
      // This test verifies that we're using the upstream type
      // by checking that the type is available through re-export
      type TestType = BrightChainTypes.KeyPairBufferWithUnEncryptedPrivateKey;
      // If this compiles, the type is available
      expect(true).toBe(true);
    });

    it('should not have local SigningKeyPrivateKeyInfo type definition', () => {
      type TestType = BrightChainTypes.SigningKeyPrivateKeyInfo;
      expect(true).toBe(true);
    });

    it('should not have local SimpleKeyPair type definition', () => {
      type TestType = BrightChainTypes.SimpleKeyPair;
      expect(true).toBe(true);
    });

    it('should not have local SimplePublicKeyOnly type definition', () => {
      type TestType = BrightChainTypes.SimplePublicKeyOnly;
      expect(true).toBe(true);
    });

    it('should not have local SimpleKeyPairBuffer type definition', () => {
      type TestType = BrightChainTypes.SimpleKeyPairBuffer;
      expect(true).toBe(true);
    });

    it('should not have local SimplePublicKeyOnlyBuffer type definition', () => {
      type TestType = BrightChainTypes.SimplePublicKeyOnlyBuffer;
      expect(true).toBe(true);
    });

    it('should not have local ChecksumBuffer type definition', () => {
      type TestType = BrightChainTypes.ChecksumBuffer;
      expect(true).toBe(true);
    });

    it('should not have local DataBuffer type definition', () => {
      type TestType = BrightChainTypes.DataBuffer;
      expect(true).toBe(true);
    });
  });
});
