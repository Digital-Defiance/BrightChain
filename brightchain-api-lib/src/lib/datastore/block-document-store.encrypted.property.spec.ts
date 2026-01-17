/**
 * @fileoverview Property-based tests for BlockDocumentStore encrypted document operations
 *
 * **Feature: backend-blockstore-quorum, Property 21: Encrypted Document Store Round-Trip**
 * **Validates: Requirements 13.1, 13.2**
 *
 * This test suite verifies that:
 * - Creating an encrypted document and retrieving it with valid quorum shares returns the original
 * - Encrypted documents require proper member shares for decryption
 */

import fc from 'fast-check';
import {
  EmailString,
  GuidV4,
  IMemberWithMnemonic,
  Member,
  ShortHexGuid,
} from '@digitaldefiance/ecies-lib';
import {
  BlockSize,
  initializeBrightChain,
  MemoryBlockStore,
  MemberType,
  QuorumMemberMetadata,
  QuorumService,
  ServiceProvider,
  ServiceLocator,
} from '@brightchain/brightchain-lib';
import { BlockDocumentStore, CollectionHeadRegistry } from './block-document-store';
import { DocumentRecord } from './document-store';

// Set a longer timeout for all tests in this file
jest.setTimeout(60000);

interface TestDocument extends DocumentRecord {
  title: string;
  content: string;
  value: number;
}

describe('BlockDocumentStore Encrypted Document Property Tests', () => {
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
    return new QuorumService<GuidV4>();
  }

  describe('Property 21: Encrypted Document Store Round-Trip', () => {
    /**
     * Property: For any valid document created with encryption enabled,
     * storing and then retrieving with valid quorum shares SHALL return
     * the original document.
     *
     * **Validates: Requirements 13.1, 13.2**
     */
    it('should return original document after encrypted create and retrieve', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a simple document object
          fc.record({
            title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,49}$/),
            content: fc.stringMatching(/^[A-Za-z0-9 ]{0,200}$/),
            value: fc.integer({ min: 0, max: 1000000 }),
          }),
          async (document: { title: string; content: string; value: number }) => {
            const quorumService = createQuorumService();
            const blockStore = new MemoryBlockStore(BlockSize.Small);
            const documentStore = new BlockDocumentStore(blockStore, quorumService);
            const collection = documentStore.encryptedCollection<TestDocument>('test-docs');

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

              const addedMember = await quorumService.addMember(
                memberWithMnemonic.member,
                metadata,
              );
              memberIds.push(addedMember.id);
            }

            // Create the document with encryption
            const testDoc: TestDocument = {
              title: document.title,
              content: document.content,
              value: document.value,
            };

            const createdDoc = await collection.create(testDoc, {
              encrypt: true,
              agent: memberData[0].member,
              memberIds,
              sharesRequired: 2,
            });

            // Verify the document was created with encryption metadata
            const encryptionMetadata = await collection.getEncryptionMetadata(createdDoc._id!);
            expect(encryptionMetadata).not.toBeNull();
            expect(encryptionMetadata!.isEncrypted).toBe(true);

            // Retrieve the document with decryption
            const retrievedDoc = await collection.findByIdDecrypted(createdDoc._id!, {
              membersWithPrivateKey: memberData.map((m) => m.member),
            });

            // Verify the document matches (excluding _id and encryption metadata)
            expect(retrievedDoc).not.toBeNull();
            expect(retrievedDoc!.title).toEqual(document.title);
            expect(retrievedDoc!.content).toEqual(document.content);
            expect(retrievedDoc!.value).toEqual(document.value);
          },
        ),
        { numRuns: 10 },
      );
    });

    /**
     * Property: Encrypted documents should require proper member shares for decryption.
     *
     * **Validates: Requirements 13.2**
     */
    it('should fail to retrieve encrypted document without proper shares', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,19}$/),
            content: fc.stringMatching(/^[A-Za-z0-9]{0,50}$/),
            value: fc.integer({ min: 0, max: 100 }),
          }),
          async (document: { title: string; content: string; value: number }) => {
            const quorumService = createQuorumService();
            const blockStore = new MemoryBlockStore(BlockSize.Small);
            const documentStore = new BlockDocumentStore(blockStore, quorumService);
            const collection = documentStore.encryptedCollection<TestDocument>('test-docs-fail');

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

            // Create the document with encryption
            const testDoc: TestDocument = {
              title: document.title,
              content: document.content,
              value: document.value,
            };

            const createdDoc = await collection.create(testDoc, {
              encrypt: true,
              agent: memberData[0].member,
              memberIds,
              sharesRequired: 2,
            });

            // Try to retrieve without providing member shares - should fail
            try {
              await collection.findByIdDecrypted(createdDoc._id!);
              // If we get here, the test should fail
              expect(true).toBe(false); // Force failure
            } catch (error) {
              // Expect an error about missing members
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain(
                'Members with private keys are required',
              );
            }
          },
        ),
        { numRuns: 5 },
      );
    });

    /**
     * Property: Unencrypted documents should be retrievable without quorum shares.
     *
     * **Validates: Requirements 13.3**
     */
    it('should retrieve unencrypted documents without shares', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,19}$/),
            content: fc.stringMatching(/^[A-Za-z0-9]{0,50}$/),
            value: fc.integer({ min: 0, max: 100 }),
          }),
          async (document: { title: string; content: string; value: number }) => {
            const blockStore = new MemoryBlockStore(BlockSize.Small);
            const documentStore = new BlockDocumentStore(blockStore);
            const collection = documentStore.collection<TestDocument>('test-docs-unencrypted');

            // Create the document without encryption
            const testDoc: TestDocument = {
              title: document.title,
              content: document.content,
              value: document.value,
            };

            const createdDoc = await collection.create(testDoc);

            // Retrieve the document
            const retrievedDoc = await collection.findById(createdDoc._id!).exec();

            // Verify the document matches
            expect(retrievedDoc).not.toBeNull();
            expect(retrievedDoc!.title).toEqual(document.title);
            expect(retrievedDoc!.content).toEqual(document.content);
            expect(retrievedDoc!.value).toEqual(document.value);
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
