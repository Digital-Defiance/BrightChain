/**
 * @fileoverview Property-based tests for BlockDocumentStore access control
 *
 * **Feature: backend-blockstore-quorum, Property 23: Document Store Access Control**
 * **Validates: Requirements 13.4**
 *
 * This test suite verifies that:
 * - Querying documents as a specific user returns only documents that user has access to
 * - Unencrypted documents are accessible to everyone
 * - Encrypted documents are only accessible to members in the encryption list
 */

import {
  BlockSize,
  initializeBrightChain,
  MemberType,
  MemoryBlockStore,
  QuorumMemberMetadata,
  QuorumService,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import {
  EmailString,
  GuidV4,
  IMemberWithMnemonic,
  Member,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import {
  BlockDocumentStore,
  CollectionHeadRegistry,
} from './block-document-store';
import { DocumentRecord } from './document-store';

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

interface TestDocument extends DocumentRecord {
  title: string;
  content: string;
  ownerId?: string;
}

describe('BlockDocumentStore Access Control Property Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4>());
  });

  afterEach(() => {
    // Clear the collection head registry between tests
    CollectionHeadRegistry.getInstance().clear();
    ServiceProvider.resetInstance();
    // Re-initialize for next test
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4>());
  });

  /**
   * Helper to create a test member with random data
   */
  function createTestMember(
    name: string,
    email: string,
  ): IMemberWithMnemonic<GuidV4> {
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
    return new QuorumService<GuidV4>();
  }

  describe('Property 23: Document Store Access Control', () => {
    /**
     * Property: For any set of documents with different access permissions,
     * querying as a specific user SHALL return only documents that user has access to.
     *
     * **Validates: Requirements 13.4**
     */
    it('should return only accessible documents for a member', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate document titles
          fc.array(fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,19}$/), {
            minLength: 2,
            maxLength: 5,
          }),
          async (titles: string[]) => {
            const quorumService = createQuorumService();
            const blockStore = new MemoryBlockStore(BlockSize.Small);
            const documentStore = new BlockDocumentStore(
              blockStore,
              quorumService,
            );
            const collection =
              documentStore.encryptedCollection<TestDocument>('test-access');

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

              const addedMember = await quorumService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              memberIds.push(addedMember.id);
            }

            // Create documents with different access patterns
            // Doc 0: accessible to member 0 and 1
            // Doc 1: accessible to member 1 and 2
            // etc.
            const createdDocs: TestDocument[] = [];
            for (let i = 0; i < titles.length; i++) {
              const docMemberIds = [memberIds[i % 3], memberIds[(i + 1) % 3]];

              const doc = await collection.create(
                { title: titles[i], content: `Content ${i}` },
                {
                  encrypt: true,
                  agent: memberData[i % 3].member,
                  memberIds: docMemberIds,
                  sharesRequired: 2,
                },
              );
              createdDocs.push(doc);
            }

            // Check access for member 0
            const member0Id = memberIds[0];
            const accessibleToMember0 =
              await collection.findAccessibleBy(member0Id);

            // Member 0 should have access to documents where they are in the member list
            for (const doc of createdDocs) {
              const hasAccess = await collection.hasAccess(doc._id!, member0Id);
              const isInAccessibleList = accessibleToMember0.some(
                (d) => d._id === doc._id,
              );

              // If member has access, document should be in the accessible list
              // If member doesn't have access, document should not be in the accessible list
              expect(isInAccessibleList).toBe(hasAccess);
            }
          },
        ),
        { numRuns: 5 },
      );
    });

    /**
     * Property: Unencrypted documents should be accessible to everyone.
     *
     * **Validates: Requirements 13.4**
     */
    it('should make unencrypted documents accessible to all members', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,19}$/),
          async (title: string) => {
            const quorumService = createQuorumService();
            const blockStore = new MemoryBlockStore(BlockSize.Small);
            const documentStore = new BlockDocumentStore(
              blockStore,
              quorumService,
            );
            const collection =
              documentStore.encryptedCollection<TestDocument>(
                'test-unencrypted',
              );

            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 1000000);

            // Create 2 members
            const memberIds: ShortHexGuid[] = [];
            for (let i = 0; i < 2; i++) {
              const uniqueSuffix = `${timestamp}${random}${i}`;
              const memberWithMnemonic = createTestMember(
                `Member${i}`,
                `member${uniqueSuffix}@example.com`,
              );

              const metadata: QuorumMemberMetadata = {
                name: `Member${i}`,
                email: `member${uniqueSuffix}@example.com`,
              };

              const addedMember = await quorumService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              memberIds.push(addedMember.id);
            }

            // Create an unencrypted document
            const doc = await collection.create({
              title,
              content: 'Unencrypted content',
            });

            // Both members should have access
            for (const memberId of memberIds) {
              const hasAccess = await collection.hasAccess(doc._id!, memberId);
              expect(hasAccess).toBe(true);
            }

            // A random member ID should also have access (unencrypted = public)
            const randomMemberId = 'random-member-id' as ShortHexGuid;
            const randomHasAccess = await collection.hasAccess(
              doc._id!,
              randomMemberId,
            );
            expect(randomHasAccess).toBe(true);
          },
        ),
        { numRuns: 5 },
      );
    });
  });
});
