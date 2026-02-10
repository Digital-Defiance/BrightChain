/**
 * Property-Based Tests for EthereumWalletService
 *
 * These tests validate universal properties of the Ethereum wallet
 * derivation and signing system using fast-check.
 *
 * **Property 4: Ethereum Address Derivation Determinism**
 * **Validates: Requirements 6.1, 6.4**
 *
 * @module services/crypto/ethereumWalletService.property.spec
 */

import * as fc from 'fast-check';

import { ECIESService } from '@digitaldefiance/ecies-lib';
import { initializeBrightChain } from '../../init';
import { PaperKeyService } from '../identity/paperKeyService';
import { ServiceProvider } from '../service.provider';
import { EthereumWalletService } from './ethereumWalletService';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EthereumWalletService - Property Tests', () => {
  let eciesService: ECIESService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
  });

  describe('Property 4: Ethereum Address Derivation Determinism', () => {
    /**
     * Property 4a: Deterministic Address Derivation
     *
     * For any valid paper key, deriving the Ethereum address twice
     * SHALL produce the same address.
     *
     * **Validates: Requirements 6.1, 6.4**
     */
    it('should derive the same address from the same paper key', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const paperKey = PaperKeyService.generatePaperKey(eciesService);

          const addr1 = EthereumWalletService.deriveAddress(paperKey.value!);
          const addr2 = EthereumWalletService.deriveAddress(paperKey.value!);

          expect(addr1.address).toBe(addr2.address);
          expect(addr1.publicKeyHex).toBe(addr2.publicKeyHex);
        }),
        { numRuns: 10 },
      );
    });

    /**
     * Property 4b: Unique Addresses Per Key
     *
     * For any two distinct paper keys, the derived Ethereum addresses
     * SHALL be different.
     *
     * **Validates: Requirements 6.1, 6.4**
     */
    it('should derive different addresses from different paper keys', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const key1 = PaperKeyService.generatePaperKey(eciesService);
          const key2 = PaperKeyService.generatePaperKey(eciesService);

          const addr1 = EthereumWalletService.deriveAddress(key1.value!);
          const addr2 = EthereumWalletService.deriveAddress(key2.value!);

          expect(addr1.address).not.toBe(addr2.address);
        }),
        { numRuns: 10 },
      );
    });

    /**
     * Property 4c: Sign-Verify Round Trip
     *
     * For any valid paper key and any message, signing the message
     * and then verifying the signature with the derived address
     * SHALL return true.
     *
     * **Validates: Requirements 6.2, 6.3, 6.7, 6.8**
     */
    it('should verify signatures produced by the same key', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (message: string) => {
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const addr = EthereumWalletService.deriveAddress(paperKey.value!);
            const sig = EthereumWalletService.signMessage(
              paperKey.value!,
              message,
            );

            const valid = EthereumWalletService.verifySignature(
              message,
              sig.signature,
              addr.address,
            );

            expect(valid).toBe(true);
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
