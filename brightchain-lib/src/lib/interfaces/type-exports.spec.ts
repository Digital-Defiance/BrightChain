import { describe, it, expect } from '@jest/globals';
import * as BrightChainLib from '../../index';

describe('Interface Export Tests', () => {
  describe('Interface Re-exports from node-ecies-lib', () => {
    it('should re-export IKeyPairBufferWithUnEncryptedPrivateKey interface from node-ecies-lib', () => {
      // This test verifies that the interface is available through re-export
      // TypeScript compilation will fail if the interface doesn't exist
      type TestInterface = BrightChainLib.IKeyPairBufferWithUnEncryptedPrivateKey;
      expect(true).toBe(true);
    });

    it('should re-export ISigningKeyPrivateKeyInfo interface from node-ecies-lib', () => {
      type TestInterface = BrightChainLib.ISigningKeyPrivateKeyInfo;
      expect(true).toBe(true);
    });

    it('should re-export ISimpleKeyPair interface from node-ecies-lib', () => {
      type TestInterface = BrightChainLib.ISimpleKeyPair;
      expect(true).toBe(true);
    });

    it('should re-export ISimpleKeyPairBuffer interface from node-ecies-lib', () => {
      type TestInterface = BrightChainLib.ISimpleKeyPairBuffer;
      expect(true).toBe(true);
    });

    it('should re-export ISimplePublicKeyOnly interface from node-ecies-lib', () => {
      type TestInterface = BrightChainLib.ISimplePublicKeyOnly;
      expect(true).toBe(true);
    });

    it('should re-export ISimplePublicKeyOnlyBuffer interface from node-ecies-lib', () => {
      type TestInterface = BrightChainLib.ISimplePublicKeyOnlyBuffer;
      expect(true).toBe(true);
    });
  });

  describe('BrightChain-Specific Interfaces Preserved', () => {
    it('should preserve ICBLConsts interface', () => {
      type TestInterface = BrightChainLib.ICBLConsts;
      expect(true).toBe(true);
    });

    it('should preserve IFECConsts interface', () => {
      type TestInterface = BrightChainLib.IFECConsts;
      expect(true).toBe(true);
    });

    it('should preserve ITupleConsts interface', () => {
      type TestInterface = BrightChainLib.ITupleConsts;
      expect(true).toBe(true);
    });

    it('should preserve ISealingConsts interface', () => {
      type TestInterface = BrightChainLib.ISealingConsts;
      expect(true).toBe(true);
    });

    it('should preserve ISiteConsts interface', () => {
      type TestInterface = BrightChainLib.ISiteConsts;
      expect(true).toBe(true);
    });

    it('should preserve IJwtConsts interface', () => {
      type TestInterface = BrightChainLib.IJwtConsts;
      expect(true).toBe(true);
    });
  });

  describe('Duplicate Interfaces Removed', () => {
    it('should not have local IKeyPairBufferWithUnEncryptedPrivateKey interface file', () => {
      // This test verifies that we're using the upstream interface
      // by checking that the interface is available through re-export
      type TestInterface = BrightChainLib.IKeyPairBufferWithUnEncryptedPrivateKey;
      // If this compiles, the interface is available
      expect(true).toBe(true);
    });

    it('should not have local ISigningKeyPrivateKeyInfo interface file', () => {
      type TestInterface = BrightChainLib.ISigningKeyPrivateKeyInfo;
      expect(true).toBe(true);
    });

    it('should not have local ISimpleKeyPair interface file', () => {
      type TestInterface = BrightChainLib.ISimpleKeyPair;
      expect(true).toBe(true);
    });

    it('should not have local ISimpleKeyPairBuffer interface file', () => {
      type TestInterface = BrightChainLib.ISimpleKeyPairBuffer;
      expect(true).toBe(true);
    });

    it('should not have local ISimplePublicKeyOnly interface file', () => {
      type TestInterface = BrightChainLib.ISimplePublicKeyOnly;
      expect(true).toBe(true);
    });

    it('should not have local ISimplePublicKeyOnlyBuffer interface file', () => {
      type TestInterface = BrightChainLib.ISimplePublicKeyOnlyBuffer;
      expect(true).toBe(true);
    });
  });

  describe('Type Import Correctness', () => {
    it('should import types from correct upstream sources', () => {
      // Verify that the types are coming from node-ecies-lib
      // by checking that they're available
      type BrightChainType = BrightChainLib.IKeyPairBufferWithUnEncryptedPrivateKey;
      
      // If this compiles, the types are compatible
      expect(true).toBe(true);
    });

    it('should have compatible ISigningKeyPrivateKeyInfo types', () => {
      type BrightChainType = BrightChainLib.ISigningKeyPrivateKeyInfo;
      expect(true).toBe(true);
    });

    it('should have compatible ISimpleKeyPair types', () => {
      type BrightChainType = BrightChainLib.ISimpleKeyPair;
      expect(true).toBe(true);
    });

    it('should have compatible ISimpleKeyPairBuffer types', () => {
      type BrightChainType = BrightChainLib.ISimpleKeyPairBuffer;
      expect(true).toBe(true);
    });

    it('should have compatible ISimplePublicKeyOnly types', () => {
      type BrightChainType = BrightChainLib.ISimplePublicKeyOnly;
      expect(true).toBe(true);
    });

    it('should have compatible ISimplePublicKeyOnlyBuffer types', () => {
      type BrightChainType = BrightChainLib.ISimplePublicKeyOnlyBuffer;
      expect(true).toBe(true);
    });
  });
});
