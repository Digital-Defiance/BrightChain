/**
 * Property-Based Tests for IdentityProofService
 *
 * These tests validate universal properties of the identity proof system
 * using fast-check for property-based testing.
 *
 * **Property 3: Identity Proof Signature Verification**
 * **Validates: Requirements 4.2, 4.3, 4.4**
 *
 * @module services/identity/identityProofService.property.spec
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';

import { ProofPlatform } from '../../enumerations/proofPlatform';
import { VerificationStatus } from '../../enumerations/verificationStatus';
import { initializeBrightChain } from '../../init';
import { ServiceProvider } from '../service.provider';
import { IdentityProofService } from './identityProofService';
import { PaperKeyService } from './paperKeyService';

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Arbitrary that picks a random ProofPlatform value.
 */
const arbPlatform = fc.constantFrom(
  ProofPlatform.TWITTER,
  ProofPlatform.GITHUB,
  ProofPlatform.REDDIT,
  ProofPlatform.WEBSITE,
  ProofPlatform.BITCOIN,
  ProofPlatform.ETHEREUM,
);

/**
 * Arbitrary that generates a non-empty alphanumeric username (1–30 chars).
 */
const arbUsername: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-zA-Z0-9]{1,30}$/);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('IdentityProofService - Property Tests', () => {
  let eciesService: ECIESService;

  beforeAll(() => {
    initializeBrightChain();
  });

  beforeEach(() => {
    ServiceProvider.resetInstance();
    eciesService = ServiceProvider.getInstance().eciesService;
  });

  describe('Property 3: Identity Proof Signature Verification', () => {
    /**
     * Property 3a: Valid Signature Verification
     *
     * For any identity proof created by a member, verifying the signature
     * with the member's public key SHALL return true.
     *
     * **Validates: Requirements 4.2, 4.3, 4.4**
     */
    it('should verify a proof signature with the creator member public key', () => {
      fc.assert(
        fc.property(
          arbPlatform,
          arbUsername,
          (platform: ProofPlatform, username: string) => {
            // Generate a fresh member from a paper key
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const member = PaperKeyService.recoverFromPaperKey(
              paperKey.value!,
              eciesService,
            );

            // Create an identity proof (Requirements 4.2, 4.3)
            const proof = IdentityProofService.create(
              member,
              platform,
              username,
            );

            // The proof must be in PENDING state
            expect(proof.verificationStatus).toBe(VerificationStatus.PENDING);
            expect(proof.platform).toBe(platform);
            expect(proof.username).toBe(username);

            // Verify the signature with the member's public key (Requirement 4.4)
            const isValid = IdentityProofService.verify(
              proof,
              member.publicKey,
              eciesService,
            );
            expect(isValid).toBe(true);
          },
        ),
        { numRuns: 15 },
      );
    });

    /**
     * Property 3b: Wrong Key Rejection
     *
     * For any identity proof created by a member, verifying the signature
     * with a different member's public key SHALL return false.
     *
     * **Validates: Requirements 4.2, 4.3, 4.4**
     */
    it('should reject a proof signature verified with a different member public key', () => {
      fc.assert(
        fc.property(
          arbPlatform,
          arbUsername,
          (platform: ProofPlatform, username: string) => {
            // Generate two distinct members
            const paperKey1 = PaperKeyService.generatePaperKey(eciesService);
            const member1 = PaperKeyService.recoverFromPaperKey(
              paperKey1.value!,
              eciesService,
            );

            const paperKey2 = PaperKeyService.generatePaperKey(eciesService);
            const member2 = PaperKeyService.recoverFromPaperKey(
              paperKey2.value!,
              eciesService,
            );

            // Create a proof with member1
            const proof = IdentityProofService.create(
              member1,
              platform,
              username,
            );

            // Verify with member2's public key — must fail
            const isValid = IdentityProofService.verify(
              proof,
              member2.publicKey,
              eciesService,
            );
            expect(isValid).toBe(false);
          },
        ),
        { numRuns: 15 },
      );
    });

    /**
     * Property 3c: Tampered Statement Rejection
     *
     * For any identity proof, tampering with the signed statement and
     * then verifying SHALL return false, even with the correct public key.
     *
     * **Validates: Requirements 4.2, 4.3, 4.4**
     */
    it('should reject verification when the signed statement is tampered with', () => {
      fc.assert(
        fc.property(
          arbPlatform,
          arbUsername,
          fc.string({ minLength: 1, maxLength: 20 }),
          (platform: ProofPlatform, username: string, tamperSuffix: string) => {
            const paperKey = PaperKeyService.generatePaperKey(eciesService);
            const member = PaperKeyService.recoverFromPaperKey(
              paperKey.value!,
              eciesService,
            );

            // Create a valid proof
            const proof = IdentityProofService.create(
              member,
              platform,
              username,
            );

            // Tamper with the signed statement
            const tamperedProof = {
              ...proof,
              signedStatement: proof.signedStatement + tamperSuffix,
            };

            // Verification with the correct key must fail on tampered data
            const isValid = IdentityProofService.verify(
              tamperedProof,
              member.publicKey,
              eciesService,
            );
            expect(isValid).toBe(false);
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
