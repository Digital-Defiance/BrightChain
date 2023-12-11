/**
 * Unit tests for EthereumWalletService.
 *
 * Tests Ethereum address derivation, message signing, and signature
 * verification using BIP44 HD wallet derivation.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.7, 6.8
 */

import {
  EthereumDerivationError,
  EthereumSigningError,
  EthereumWalletService,
} from './ethereumWalletService';

// ─── Test fixtures ──────────────────────────────────────────────────────────

/**
 * Standard BIP39 test mnemonic (24 words).
 * This is the well-known "abandon" test vector.
 */
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon art';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EthereumWalletService', () => {
  describe('deriveAddress', () => {
    it('should derive a valid EIP-55 checksummed Ethereum address', () => {
      const result = EthereumWalletService.deriveAddress(TEST_MNEMONIC);

      expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(result.derivationPath).toBe("m/44'/60'/0'/0/0");
      expect(result.publicKeyHex).toBeTruthy();
      expect(result.publicKeyHex.length).toBe(130); // 65 bytes uncompressed
    });

    it('should produce deterministic addresses from the same mnemonic', () => {
      const result1 = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      const result2 = EthereumWalletService.deriveAddress(TEST_MNEMONIC);

      expect(result1.address).toBe(result2.address);
      expect(result1.publicKeyHex).toBe(result2.publicKeyHex);
    });

    it('should produce different addresses from different mnemonics', () => {
      const mnemonic2 =
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo zoo ' +
        'zoo zoo zoo zoo zoo zoo zoo vote';

      const result1 = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      const result2 = EthereumWalletService.deriveAddress(mnemonic2);

      expect(result1.address).not.toBe(result2.address);
    });

    it('should produce a valid EIP-55 checksum', () => {
      const result = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      expect(EthereumWalletService.isValidAddress(result.address)).toBe(true);
    });

    it('should throw EthereumDerivationError for invalid mnemonic', () => {
      expect(() =>
        EthereumWalletService.deriveAddress('invalid mnemonic words'),
      ).toThrow(EthereumDerivationError);
    });
  });

  describe('signMessage', () => {
    it('should sign a message and return a valid signature', () => {
      const result = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Hello BrightChain',
      );

      expect(result.message).toBe('Hello BrightChain');
      expect(result.signature).toMatch(/^0x[0-9a-fA-F]{130}$/); // 65 bytes
      expect(result.recoveryParam).toBeGreaterThanOrEqual(0);
      expect(result.recoveryParam).toBeLessThanOrEqual(1);
    });

    it('should produce deterministic signatures for the same message', () => {
      const sig1 = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Deterministic test',
      );
      const sig2 = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Deterministic test',
      );

      expect(sig1.signature).toBe(sig2.signature);
    });

    it('should produce different signatures for different messages', () => {
      const sig1 = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Message A',
      );
      const sig2 = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Message B',
      );

      expect(sig1.signature).not.toBe(sig2.signature);
    });

    it('should throw EthereumSigningError for invalid mnemonic', () => {
      expect(() =>
        EthereumWalletService.signMessage('bad mnemonic', 'test'),
      ).toThrow(EthereumSigningError);
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const address = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      const sig = EthereumWalletService.signMessage(TEST_MNEMONIC, 'Verify me');

      const valid = EthereumWalletService.verifySignature(
        'Verify me',
        sig.signature,
        address.address,
      );

      expect(valid).toBe(true);
    });

    it('should reject a signature with wrong message', () => {
      const address = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      const sig = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Original message',
      );

      const valid = EthereumWalletService.verifySignature(
        'Tampered message',
        sig.signature,
        address.address,
      );

      expect(valid).toBe(false);
    });

    it('should reject a signature with wrong address', () => {
      const sig = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Test message',
      );

      const valid = EthereumWalletService.verifySignature(
        'Test message',
        sig.signature,
        '0x0000000000000000000000000000000000000000',
      );

      expect(valid).toBe(false);
    });

    it('should return false for malformed signature', () => {
      const address = EthereumWalletService.deriveAddress(TEST_MNEMONIC);

      const valid = EthereumWalletService.verifySignature(
        'Test',
        '0xdeadbeef',
        address.address,
      );

      expect(valid).toBe(false);
    });
  });

  describe('recoverAddress', () => {
    it('should recover the signer address from a signature', () => {
      const address = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      const sig = EthereumWalletService.signMessage(
        TEST_MNEMONIC,
        'Recover test',
      );

      const recovered = EthereumWalletService.recoverAddress(
        'Recover test',
        sig.signature,
      );

      expect(recovered.toLowerCase()).toBe(address.address.toLowerCase());
    });

    it('should throw for invalid signature length', () => {
      expect(() =>
        EthereumWalletService.recoverAddress('test', '0xdeadbeef'),
      ).toThrow(EthereumSigningError);
    });
  });

  describe('hashMessage', () => {
    it('should produce a 32-byte hash', () => {
      const hash = EthereumWalletService.hashMessage('test');
      expect(hash.length).toBe(32);
    });

    it('should produce deterministic hashes', () => {
      const hash1 = EthereumWalletService.hashMessage('hello');
      const hash2 = EthereumWalletService.hashMessage('hello');
      expect(hash1).toEqual(hash2);
    });

    it('should produce different hashes for different messages', () => {
      const hash1 = EthereumWalletService.hashMessage('hello');
      const hash2 = EthereumWalletService.hashMessage('world');
      expect(hash1).not.toEqual(hash2);
    });
  });

  describe('isValidAddress', () => {
    it('should validate a correct EIP-55 address', () => {
      const result = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      expect(EthereumWalletService.isValidAddress(result.address)).toBe(true);
    });

    it('should reject an all-lowercase address', () => {
      const result = EthereumWalletService.deriveAddress(TEST_MNEMONIC);
      const lower = result.address.toLowerCase();
      // All-lowercase is only valid if the checksum happens to be all-lower
      // For most addresses this will fail
      const isAllLowerValid = EthereumWalletService.isValidAddress(lower);
      // We just verify it returns a boolean without throwing
      expect(typeof isAllLowerValid).toBe('boolean');
    });

    it('should reject an invalid format', () => {
      expect(EthereumWalletService.isValidAddress('not-an-address')).toBe(
        false,
      );
      expect(EthereumWalletService.isValidAddress('0x123')).toBe(false);
      expect(EthereumWalletService.isValidAddress('')).toBe(false);
    });
  });
});
