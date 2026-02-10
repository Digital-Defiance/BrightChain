/**
 * Property-Based Tests for PaperKeyService
 *
 * These tests validate universal properties of the paper key system
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * @module services/identity/paperKeyService.property.spec
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';

import { initializeBrightChain } from '../../init';
import { ServiceProvider } from '../service.provider';
import { PaperKeyService } from './paperKeyService';

describe('PaperKeyService - Property Tests', () => {
  let eciesService: ECIESService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
  });

  describe('Property 1: Paper Key Round-Trip', () => {
    /**
     * Property 1: Paper Key Round-Trip
     *
     * For any generated paper key, recovering a Member from it SHALL
     * produce the same member ID and public key.
     *
     * This validates the deterministic nature of BIP39 mnemonic → key
     * derivation: the same mnemonic always yields the same identity.
     *
     * **Validates: Requirements 1.1, 1.2, 1.3**
     */
    it('should recover the same member identity from the same paper key across multiple recoveries', () => {
      fc.assert(
        fc.property(
          // Use fc.constant to trigger a fresh paper key generation per run
          fc.constant(null),
          () => {
            // 1. Generate a paper key (Requirement 1.1)
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const paperKeyValue = paperKey.value!;

            // 2. Validate the generated paper key (Requirement 1.2)
            expect(
              PaperKeyService.validatePaperKey(paperKeyValue, eciesService),
            ).toBe(true);

            // 3. Recover a Member from the paper key (Requirement 1.3)
            const member1 = PaperKeyService.recoverFromPaperKey(
              paperKeyValue,
              eciesService,
            );

            // 4. Recover again from the same paper key
            const member2 = PaperKeyService.recoverFromPaperKey(
              paperKeyValue,
              eciesService,
            );

            // 5. Both recoveries must produce the same public key
            expect(Buffer.from(member1.publicKey)).toEqual(
              Buffer.from(member2.publicKey),
            );

            // 6. Both recoveries must produce the same member name
            expect(member1.name).toBe(member2.name);

            // 7. The recovered member must have a private key loaded
            expect(member1.hasPrivateKey).toBe(true);
            expect(member2.hasPrivateKey).toBe(true);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should generate valid 24-word BIP39 mnemonics that always pass validation', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const paperKey = PaperKeyService.generatePaperKey(eciesService);
          const paperKeyValue = paperKey.value!;

          // Every generated paper key must be exactly 24 words
          const words = paperKeyValue.trim().split(/\s+/);
          expect(words).toHaveLength(24);

          // Every generated paper key must pass BIP39 validation
          expect(
            PaperKeyService.validatePaperKey(paperKeyValue, eciesService),
          ).toBe(true);
        }),
        { numRuns: 20 },
      );
    });

    it('should produce unique identities from distinct paper keys', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const paperKey1 = PaperKeyService.generatePaperKey(eciesService);
          const paperKey2 = PaperKeyService.generatePaperKey(eciesService);

          // Different paper keys must produce different mnemonics
          expect(paperKey1.value).not.toBe(paperKey2.value);

          const member1 = PaperKeyService.recoverFromPaperKey(
            paperKey1.value!,
            eciesService,
          );
          const member2 = PaperKeyService.recoverFromPaperKey(
            paperKey2.value!,
            eciesService,
          );

          // Different paper keys must produce different public keys
          expect(Buffer.from(member1.publicKey)).not.toEqual(
            Buffer.from(member2.publicKey),
          );
        }),
        { numRuns: 20 },
      );
    });
  });
});
