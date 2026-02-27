/**
 * Property-Based Tests for SealingService
 *
 * P2: Seal/Unseal Round-Trip
 * P3: Share Redistribution Preserves Data
 * P13: Fresh Key Per Seal
 */
import {
  AESGCMService,
  EmailString,
  GuidV4Uint8Array,
  HexString,
  hexToUint8Array,
  IMemberWithMnemonic,
  Member,
  MemberType,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import type { Shares } from '@digitaldefiance/secrets';
import * as secretsModule from '@digitaldefiance/secrets';
import * as fc from 'fast-check';
import { SealingError } from '../errors/sealingError';
import { initializeBrightChain } from '../init';
import { SealingService } from './sealing.service';
import { ServiceProvider } from './service.provider';

// Handle both ESM default export and CommonJS module.exports patterns
const secretsLib =
  (secretsModule as Record<string, unknown>)['default'] || secretsModule;

// Set a longer timeout for property-based tests
jest.setTimeout(120000);

describe('SealingService Property-Based Tests', () => {
  let sealingService: SealingService<GuidV4Uint8Array>;
  let eciesService: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['eciesService'];
  let idProvider: ReturnType<
    typeof ServiceProvider.getInstance<GuidV4Uint8Array>
  >['idProvider'];
  const memberPool: IMemberWithMnemonic<GuidV4Uint8Array>[] = [];

  beforeAll(() => {
    initializeBrightChain();
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    sealingService = sp.sealingService;
    eciesService = sp.eciesService;
    idProvider = sp.idProvider;

    // Pre-create a pool of members for property tests (creating members is expensive)
    const names = [
      'Alice',
      'Bob',
      'Charlie',
      'David',
      'Eve',
      'Frank',
      'Grace',
      'Heidi',
    ];
    for (const name of names) {
      memberPool.push(
        Member.newMember<GuidV4Uint8Array>(
          eciesService,
          MemberType.System,
          name,
          new EmailString(`${name.toLowerCase()}@example.com`),
        ),
      );
    }
  });

  /**
   * **Validates: Requirements 1.2, 8.1**
   *
   * P2: Seal/Unseal Round-Trip
   * For any data D, member set M (|M| >= threshold), and threshold T,
   * unseal(seal(D, M, T), M_subset) returns D when |M_subset| >= T.
   * When |M_subset| < T, unseal fails.
   */
  describe('P2: Seal/Unseal Round-Trip', () => {
    it('should round-trip seal/unseal with threshold members and fail with fewer', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary JSON-serializable data
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 100 }),
            value: fc.integer(),
          }),
          // Pick member count between 2 and 5 (from our pool of 8)
          fc.integer({ min: 2, max: 5 }),
          // Pick threshold ratio (will be clamped to valid range)
          fc.integer({ min: 2, max: 5 }),
          async (data, memberCount, rawThreshold) => {
            // Ensure threshold is valid: 2 <= threshold <= memberCount
            const threshold = Math.max(2, Math.min(rawThreshold, memberCount));
            const members = memberPool
              .slice(0, memberCount)
              .map((m) => m.member);

            // Seal the data
            const sealed = await sealingService.quorumSeal(
              members[0],
              data,
              members,
              threshold,
            );

            // Unseal with exactly threshold members should succeed
            const thresholdMembers = members.slice(0, threshold);
            const unsealed = await sealingService.quorumUnseal<typeof data>(
              sealed,
              thresholdMembers,
            );
            expect(unsealed).toEqual(data);

            // Unseal with all members should also succeed
            const unsealedAll = await sealingService.quorumUnseal<typeof data>(
              sealed,
              members,
            );
            expect(unsealedAll).toEqual(data);

            // Unseal with fewer than threshold members should fail
            if (threshold > 1) {
              const tooFewMembers = members.slice(0, threshold - 1);
              await expect(
                sealingService.quorumUnseal(sealed, tooFewMembers),
              ).rejects.toThrow(SealingError);
            }
          },
        ),
        { numRuns: 5 },
      );
    });
  });

  /**
   * **Validates: Requirements 3.4, 4.3**
   *
   * P3: Share Redistribution Preserves Data
   * For any sealed document with encrypted data E, after share redistribution
   * to new members M' with threshold T', the encrypted data E is unchanged.
   * Unsealing with T' members from M' returns the original plaintext.
   */
  describe('P3: Share Redistribution Preserves Data', () => {
    it('should preserve data after share redistribution to new members', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 50 }),
            id: fc.integer(),
          }),
          async (data) => {
            // Original members: first 3 from pool, threshold 2
            const originalMembers = memberPool.slice(0, 3).map((m) => m.member);
            const originalThreshold = 2;

            // Seal the data
            const sealed = await sealingService.quorumSeal(
              originalMembers[0],
              data,
              originalMembers,
              originalThreshold,
            );

            // Save the original encrypted data for comparison
            const originalEncryptedData = new Uint8Array(sealed.encryptedData);

            // Decrypt shares from threshold members for reconstruction
            const thresholdMembers = originalMembers.slice(
              0,
              originalThreshold,
            );
            const decryptedShares = await sealingService.decryptShares(
              sealed,
              thresholdMembers,
            );

            // Build the existingShares map (memberId hex → share hex)
            const existingSharesMap = new Map<HexString, string>();
            for (let i = 0; i < thresholdMembers.length; i++) {
              const memberIdHex = uint8ArrayToHex(
                idProvider.toBytes(thresholdMembers[i].id),
              ) as HexString;
              existingSharesMap.set(memberIdHex, decryptedShares[i]);
            }

            // New members: members 2-6 from pool (overlapping set), threshold 3
            const newMembers = memberPool.slice(2, 6).map((m) => m.member);
            const newThreshold = 3;

            // Redistribute shares
            const newEncryptedShares = await sealingService.redistributeShares(
              existingSharesMap,
              newMembers,
              newThreshold,
              {
                totalShares: originalMembers.length,
                threshold: originalThreshold,
              },
            );

            // Verify encrypted data is unchanged
            expect(sealed.encryptedData).toEqual(originalEncryptedData);

            // Decrypt the new shares for threshold new members and verify data
            const newMemberSubset = newMembers.slice(0, newThreshold);
            const newDecryptedShares: string[] = [];
            for (const member of newMemberSubset) {
              const memberIdHex = uint8ArrayToHex(
                idProvider.toBytes(member.id),
              ) as HexString;
              const encryptedShare = newEncryptedShares.get(memberIdHex);
              expect(encryptedShare).toBeDefined();
              if (!encryptedShare || !member.privateKey) continue;
              const decrypted = await eciesService.decryptWithLengthAndHeader(
                member.privateKey.value,
                encryptedShare,
              );
              newDecryptedShares.push(uint8ArrayToHex(decrypted));
            }

            // Reconstruct the key from new shares and decrypt the data
            sealingService.reinitSecretsForBootstrap(newMembers.length);
            const reconstructedKeyHex = (
              secretsLib as { combine: (shares: Shares) => string }
            ).combine(newDecryptedShares);
            const key = hexToUint8Array(reconstructedKeyHex);
            const aesGcmService = new AESGCMService(eciesService.constants);
            const unsealed = await aesGcmService.decryptJson<typeof data>(
              sealed.encryptedData,
              key,
            );
            expect(unsealed).toEqual(data);
          },
        ),
        { numRuns: 5 },
      );
    });
  });

  /**
   * **Validates: Requirements 8.1**
   *
   * P13: Fresh Key Per Seal
   * For any two seal operations on identical data D with identical members M,
   * the resulting encrypted data E1 ≠ E2 (different AES-256-GCM keys and IVs).
   */
  describe('P13: Fresh Key Per Seal', () => {
    it('should produce different encrypted outputs for identical data sealed twice', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            number: fc.integer(),
          }),
          async (data) => {
            const members = memberPool.slice(0, 3).map((m) => m.member);
            const threshold = 2;

            // Seal the same data twice with the same members
            const sealed1 = await sealingService.quorumSeal(
              members[0],
              data,
              members,
              threshold,
            );
            const sealed2 = await sealingService.quorumSeal(
              members[0],
              data,
              members,
              threshold,
            );

            // The encrypted data should be different (different AES keys and IVs)
            expect(uint8ArrayToHex(sealed1.encryptedData)).not.toEqual(
              uint8ArrayToHex(sealed2.encryptedData),
            );

            // But both should unseal to the same original data
            const unsealed1 = await sealingService.quorumUnseal<typeof data>(
              sealed1,
              members,
            );
            const unsealed2 = await sealingService.quorumUnseal<typeof data>(
              sealed2,
              members,
            );
            expect(unsealed1).toEqual(data);
            expect(unsealed2).toEqual(data);
          },
        ),
        { numRuns: 5 },
      );
    });
  });
});
