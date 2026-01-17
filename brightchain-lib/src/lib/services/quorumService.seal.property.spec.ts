/**
 * @fileoverview Property-based tests for QuorumService seal/unseal operations
 *
 * **Feature: backend-blockstore-quorum, Property 9: Seal/Unseal Round-Trip**
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 *
 * This test suite verifies that:
 * - Sealing and unsealing a document returns the original document
 * - Documents can be unsealed with any valid subset of members meeting the threshold
 * - Unsealing fails with insufficient members
 */

import fc from 'fast-check';
import {
  EmailString,
  GuidV4,
  IMemberWithMnemonic,
  Member,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import { MemberType } from '../enumerations/memberType';
import { initializeBrightChain } from '../init';
import { QuorumMemberMetadata } from '../interfaces/services/quorumService';
import { QuorumService } from './quorumService';
import { ServiceProvider } from './service.provider';
import { ServiceLocator } from './serviceLocator';
import { SealingError } from '../errors/sealingError';
import { SealingErrorType } from '../enumerations/sealingErrorType';

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('QuorumService Seal/Unseal Property Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4>());
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Helper to create a test member with random data
   */
  function createTestMember(name: string, email: string): IMemberWithMnemonic<GuidV4> {
    const eciesService = ServiceProvider.getInstance<GuidV4>().eciesService;
    return Member.newMember<GuidV4>(
      eciesService,
      MemberType.User,
      name,
      new EmailString(email),
    );
  }

  /**
   * Helper to create a properly configured QuorumService
   */
  function createQuorumService(): QuorumService<GuidV4> {
    // QuorumService now uses getBrightChainConfigKey() internally
    // so we don't need to pass providers explicitly
    return new QuorumService<GuidV4>();
  }

  describe('Property 9: Seal/Unseal Round-Trip', () => {
    /**
     * Property: For any valid document and set of members, sealing and then
     * unsealing with sufficient members SHALL return the original document.
     *
     * **Validates: Requirements 9.1, 9.2**
     */
    it('should return original document after seal and unseal', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a simple document object
          fc.record({
            title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,49}$/),
            content: fc.stringMatching(/^[A-Za-z0-9 ]{0,200}$/),
            value: fc.integer({ min: 0, max: 1000000 }),
          }),
          async (document) => {
            const testService = createQuorumService();
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 3 members (minimum for meaningful quorum)
            const memberData: IMemberWithMnemonic<GuidV4>[] = [];
            const memberIds: ShortHexGuid[] = [];

            for (let i = 0; i < 3; i++) {
              const uniqueSuffix = `${timestamp}${random}${i}`;
              const memberWithMnemonic = createTestMember(
                `Member${i}`,
                `member${uniqueSuffix}@example.com`,
              );
              memberData.push(memberWithMnemonic);

              const metadata: QuorumMemberMetadata = {
                name: `Member${i}`,
                email: `member${uniqueSuffix}@example.com`,
              };

              const addedMember = await testService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              memberIds.push(addedMember.id);
            }

            // Seal the document with all 3 members, requiring 2 to unseal
            const sealResult = await testService.sealDocument(
              memberData[0].member,
              document,
              memberIds,
              2, // sharesRequired
            );

            // Unseal with all 3 members
            const unsealedDocument = await testService.unsealDocument<typeof document>(
              sealResult.documentId,
              memberData.map((m) => m.member),
            );

            // Verify the document matches
            expect(unsealedDocument).toEqual(document);
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: Documents can be unsealed with any valid subset of members
     * that meets the threshold requirement.
     *
     * **Validates: Requirements 9.3, 9.4**
     */
    it('should unseal with any subset meeting threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            data: fc.stringMatching(/^[A-Za-z0-9]{1,50}$/),
          }),
          async (document) => {
            const testService = createQuorumService();
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 4 members
            const memberData: IMemberWithMnemonic<GuidV4>[] = [];
            const memberIds: ShortHexGuid[] = [];

            for (let i = 0; i < 4; i++) {
              const uniqueSuffix = `${timestamp}${random}${i}`;
              const memberWithMnemonic = createTestMember(
                `Member${i}`,
                `member${uniqueSuffix}@example.com`,
              );
              memberData.push(memberWithMnemonic);

              const metadata: QuorumMemberMetadata = {
                name: `Member${i}`,
                email: `member${uniqueSuffix}@example.com`,
              };

              const addedMember = await testService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              memberIds.push(addedMember.id);
            }

            // Seal with all 4 members, requiring 2 to unseal
            const sealResult = await testService.sealDocument(
              memberData[0].member,
              document,
              memberIds,
              2,
            );

            // Unseal with first 2 members only
            const unsealedWithFirst2 = await testService.unsealDocument<typeof document>(
              sealResult.documentId,
              [memberData[0].member, memberData[1].member],
            );
            expect(unsealedWithFirst2).toEqual(document);

            // Unseal with last 2 members only
            const unsealedWithLast2 = await testService.unsealDocument<typeof document>(
              sealResult.documentId,
              [memberData[2].member, memberData[3].member],
            );
            expect(unsealedWithLast2).toEqual(document);

            // Unseal with middle 2 members
            const unsealedWithMiddle2 = await testService.unsealDocument<typeof document>(
              sealResult.documentId,
              [memberData[1].member, memberData[2].member],
            );
            expect(unsealedWithMiddle2).toEqual(document);
          },
        ),
        { numRuns: 5 },
      );
    });

    /**
     * Property: Unsealing with insufficient members should fail.
     *
     * **Validates: Requirements 9.3**
     */
    it('should fail to unseal with insufficient members', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            secret: fc.stringMatching(/^[A-Za-z0-9]{1,30}$/),
          }),
          async (document) => {
            const testService = createQuorumService();
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 3 members
            const memberData: IMemberWithMnemonic<GuidV4>[] = [];
            const memberIds: ShortHexGuid[] = [];

            for (let i = 0; i < 3; i++) {
              const uniqueSuffix = `${timestamp}${random}${i}`;
              const memberWithMnemonic = createTestMember(
                `Member${i}`,
                `member${uniqueSuffix}@example.com`,
              );
              memberData.push(memberWithMnemonic);

              const metadata: QuorumMemberMetadata = {
                name: `Member${i}`,
                email: `member${uniqueSuffix}@example.com`,
              };

              const addedMember = await testService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              memberIds.push(addedMember.id);
            }

            // Seal with all 3 members, requiring 3 to unseal
            const sealResult = await testService.sealDocument(
              memberData[0].member,
              document,
              memberIds,
              3, // All 3 required
            );

            // Try to unseal with only 2 members - should fail
            try {
              await testService.unsealDocument<typeof document>(
                sealResult.documentId,
                [memberData[0].member, memberData[1].member],
              );
              // If we get here, the test should fail
              expect(true).toBe(false); // Force failure
            } catch (error) {
              // Expect a SealingError with NotEnoughMembersToUnlock
              expect(error).toBeInstanceOf(SealingError);
              expect((error as SealingError).type).toBe(
                SealingErrorType.NotEnoughMembersToUnlock,
              );
            }
          },
        ),
        { numRuns: 5 },
      );
    });

    /**
     * Property: Sealed documents should be retrievable via getDocument.
     *
     * **Validates: Requirements 9.1**
     */
    it('should store and retrieve sealed document info', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            info: fc.stringMatching(/^[A-Za-z0-9]{1,20}$/),
          }),
          async (document) => {
            const testService = createQuorumService();
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 2 members (minimum)
            const memberData: IMemberWithMnemonic<GuidV4>[] = [];
            const memberIds: ShortHexGuid[] = [];

            for (let i = 0; i < 2; i++) {
              const uniqueSuffix = `${timestamp}${random}${i}`;
              const memberWithMnemonic = createTestMember(
                `Member${i}`,
                `member${uniqueSuffix}@example.com`,
              );
              memberData.push(memberWithMnemonic);

              const metadata: QuorumMemberMetadata = {
                name: `Member${i}`,
                email: `member${uniqueSuffix}@example.com`,
              };

              const addedMember = await testService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              memberIds.push(addedMember.id);
            }

            // Seal the document
            const sealResult = await testService.sealDocument(
              memberData[0].member,
              document,
              memberIds,
              2,
            );

            // Retrieve document info
            const docInfo = await testService.getDocument(sealResult.documentId);

            expect(docInfo).not.toBeNull();
            expect(docInfo!.id).toBe(sealResult.documentId);
            expect(docInfo!.sharesRequired).toBe(2);
            expect(docInfo!.memberIds.length).toBe(2);
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
