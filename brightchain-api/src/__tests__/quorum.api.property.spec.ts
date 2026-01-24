/**
 * @fileoverview Property-based tests for Quorum API round-trip
 *
 * **Feature: backend-blockstore-quorum, Property 18: Quorum Document API Round-Trip**
 * **Validates: Requirements 12.4, 12.5**
 *
 * This test suite verifies that:
 * - POSTing to /api/quorum/documents/seal and then POSTing to
 *   /api/quorum/documents/:id/unseal with valid shares returns the original document
 * - The API correctly handles member management operations
 *
 * Note: Since the API layer is a thin wrapper around QuorumService, these tests
 * verify the service layer integration rather than HTTP transport.
 */

import { initializeBrightChain } from '@brightchain/brightchain-lib/lib/init';
import { QuorumMemberMetadata } from '@brightchain/brightchain-lib/lib/interfaces/services/quorumService';
import { QuorumService } from '@brightchain/brightchain-lib/lib/services/quorumService';
import { ServiceProvider } from '@brightchain/brightchain-lib/lib/services/service.provider';
import { ServiceLocator } from '@brightchain/brightchain-lib/lib/services/serviceLocator';
import {
  EmailString,
  IMemberWithMnemonic,
  Member,
  MemberType,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import type { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib/src/types/guid-versions';
import secrets from '@digitaldefiance/secrets';
import fc from 'fast-check';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

describe('Quorum API Round-Trip Property Tests', () => {
  // Initialize once before all tests
  beforeAll(() => {
    // Initialize the secrets library with default settings
    // This must be done before any sealing operations
    secrets.init(8, 'nodeCryptoRandomBytes');

    // Initialize BrightChain with browser-compatible configuration
    initializeBrightChain();
    ServiceLocator.setServiceProvider(
      ServiceProvider.getInstance<GuidV4Buffer>(),
    );
  });

  // Reset service provider after each test to avoid state leakage
  afterEach(() => {
    ServiceProvider.resetInstance();
    // Re-initialize for next test
    initializeBrightChain();
    ServiceLocator.setServiceProvider(
      ServiceProvider.getInstance<GuidV4Buffer>(),
    );
  });

  /**
   * Helper to create a test member with random data
   */
  function createTestMember(
    name: string,
    email: string,
  ): IMemberWithMnemonic<GuidV4Buffer> {
    const eciesService =
      ServiceProvider.getInstance<GuidV4Buffer>().eciesService;
    return Member.newMember<GuidV4Buffer>(
      eciesService,
      MemberType.User,
      name,
      new EmailString(email),
    );
  }

  /**
   * Helper to create a properly configured QuorumService
   */
  function createQuorumService(): QuorumService<GuidV4Buffer> {
    return new QuorumService<GuidV4Buffer>();
  }

  describe('Property 18: Quorum Document API Round-Trip', () => {
    /**
     * Property: For any valid document and member set, POSTing to
     * /api/quorum/documents/seal and then POSTing to /api/quorum/documents/:id/unseal
     * with valid shares SHALL return the original document.
     *
     * This test verifies the service layer that backs the API endpoints.
     *
     * **Validates: Requirements 12.4, 12.5**
     */
    it('should seal and unseal documents correctly via service layer', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a simple document object
          fc.record({
            title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,29}$/),
            content: fc.stringMatching(/^[A-Za-z0-9 ]{0,100}$/),
            value: fc.integer({ min: 0, max: 1000000 }),
          }),
          async (document) => {
            const testService = createQuorumService();
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 3 members (minimum for meaningful quorum)
            const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
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

            // Seal the document (simulates POST /api/quorum/documents/seal)
            const sealResult = await testService.sealDocument(
              memberData[0].member,
              document,
              memberIds,
              2, // sharesRequired
            );

            // Verify seal result has expected properties
            expect(sealResult.documentId).toBeDefined();
            expect(sealResult.memberIds).toEqual(memberIds);
            expect(sealResult.sharesRequired).toBe(2);
            expect(sealResult.createdAt).toBeInstanceOf(Date);

            // Unseal with 2 members (simulates POST /api/quorum/documents/:id/unseal)
            const unsealedDocument = await testService.unsealDocument<
              typeof document
            >(sealResult.documentId, [
              memberData[0].member,
              memberData[1].member,
            ]);

            // Verify the unsealed document matches the original
            expect(unsealedDocument).toEqual(document);
          },
        ),
        { numRuns: 10 }, // Reduced runs due to crypto operations
      );
    });

    /**
     * Property: For any sealed document, GET /api/quorum/documents/:id
     * SHALL return the correct document metadata.
     *
     * **Validates: Requirements 12.6**
     */
    it('should retrieve document metadata correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            data: fc.stringMatching(/^[A-Za-z0-9]{1,50}$/),
          }),
          async (document) => {
            const testService = createQuorumService();
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 2 members (minimum for sealing)
            const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
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

            // Get document metadata (simulates GET /api/quorum/documents/:id)
            const docInfo = await testService.getDocument(
              sealResult.documentId,
            );

            // Verify metadata
            expect(docInfo).not.toBeNull();
            expect(docInfo!.id).toBe(sealResult.documentId);
            expect(docInfo!.memberIds).toEqual(memberIds);
            expect(docInfo!.sharesRequired).toBe(2);
            expect(docInfo!.createdAt).toBeInstanceOf(Date);
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: For any sealed document and member set, GET /api/quorum/documents/:id/can-unlock
     * SHALL correctly indicate whether the members can unlock the document.
     *
     * **Validates: Requirements 12.7**
     */
    it('should correctly check can-unlock status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            data: fc.stringMatching(/^[A-Za-z0-9]{1,30}$/),
          }),
          async (document) => {
            const testService = createQuorumService();
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 3 members
            const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
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

            // Seal with threshold of 2
            const sealResult = await testService.sealDocument(
              memberData[0].member,
              document,
              memberIds,
              2,
            );

            // Check can-unlock with 2 members (should succeed)
            const canUnlockWith2 = await testService.canUnlock(
              sealResult.documentId,
              [memberIds[0], memberIds[1]],
            );
            expect(canUnlockWith2.canUnlock).toBe(true);
            expect(canUnlockWith2.sharesProvided).toBe(2);
            expect(canUnlockWith2.sharesRequired).toBe(2);

            // Check can-unlock with 1 member (should fail)
            const canUnlockWith1 = await testService.canUnlock(
              sealResult.documentId,
              [memberIds[0]],
            );
            expect(canUnlockWith1.canUnlock).toBe(false);
            expect(canUnlockWith1.sharesProvided).toBe(1);
            expect(canUnlockWith1.sharesRequired).toBe(2);
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
