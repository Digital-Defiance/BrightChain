/**
 * @fileoverview End-to-End tests for Block Storage, CBL, and Quorum operations
 *
 * These tests exercise the complete flow of:
 * 1. Storing blocks via the block controller
 * 2. Creating file manifests to track block addresses (simulating CBL workflow)
 * 3. Recovering blocks using their checksums
 * 4. Sealing documents with quorum members
 * 5. Unsealing documents with sufficient shareholder participation
 *
 * The tests verify the integration between:
 * - BlocksController / BlockService
 * - QuorumController / QuorumService / SealingService
 *
 * Note: Full CBL tests with signature validation are in brightchain-lib/src/lib/stores/cblStore.spec.ts
 */

import { DiskBlockAsyncStore } from '@brightchain/brightchain-api-lib';
import {
  BlockSize,
  Checksum,
  DurabilityLevel,
  initializeBrightChain,
  QuorumMemberMetadata,
  QuorumService,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import {
  EmailString,
  IMemberWithMnemonic,
  Member,
  MemberType,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib';
import secrets from '@digitaldefiance/secrets';
import { randomBytes } from 'crypto';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

// Set a longer timeout for E2E tests
jest.setTimeout(120000);

describe('E2E: Block Storage and Quorum Integration', () => {
  const blockSize = BlockSize.Small;
  let testDir: string;
  let blockStore: DiskBlockAsyncStore;

  beforeAll(() => {
    // Initialize the secrets library with default settings
    secrets.init(8, 'nodeCryptoRandomBytes');
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4Buffer>());
  });

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = join(
      '/tmp',
      'brightchain-e2e-test-' +
        Date.now() +
        '-' +
        Math.random().toString(36).slice(2),
    );
    mkdirSync(testDir, { recursive: true });

    // Initialize block store
    blockStore = new DiskBlockAsyncStore({
      storePath: testDir,
      blockSize,
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (testDir) {
      rmSync(testDir, { recursive: true, force: true });
    }
    ServiceProvider.resetInstance();
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance<GuidV4Buffer>());
  });

  /**
   * Helper to create a test member with random data
   */
  function createTestMember(
    name: string,
    email: string,
  ): IMemberWithMnemonic<GuidV4Buffer> {
    const eciesService = ServiceProvider.getInstance<GuidV4Buffer>().eciesService;
    return Member.newMember<GuidV4Buffer>(
      eciesService,
      MemberType.User,
      name,
      new EmailString(email),
    );
  }

  /**
   * Helper to create a QuorumService
   */
  function createQuorumService(): QuorumService<GuidV4Buffer> {
    return new QuorumService<GuidV4Buffer>();
  }

  // ============================================================================
  // SECTION 1: Block Storage E2E Tests
  // ============================================================================

  describe('Block Storage E2E', () => {
    it('should store multiple blocks and retrieve them all', async () => {
      const blockCount = 10;
      const storedBlocks: { checksum: string; data: Buffer }[] = [];

      // Store multiple blocks
      for (let i = 0; i < blockCount; i++) {
        const data = randomBytes(100 + i * 10);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block, {
          durabilityLevel: DurabilityLevel.Standard,
        });
        storedBlocks.push({
          checksum: uint8ArrayToHex(block.idChecksum.toUint8Array()),
          data,
        });
      }

      // Verify all blocks can be retrieved
      for (const { checksum: checksumStr, data } of storedBlocks) {
        const checksum = Checksum.fromHex(checksumStr);
        const exists = await blockStore.has(checksum);
        expect(exists).toBe(true);

        const retrieved = await blockStore.getData(checksum);
        expect(retrieved).toBeDefined();

        // Compare the original data (retrieved may be padded)
        const retrievedSlice = Buffer.from(retrieved.data).slice(
          0,
          data.length,
        );
        expect(retrievedSlice.equals(data)).toBe(true);
      }
    });

    it('should store blocks with different durability levels', async () => {
      const durabilityLevels = [
        DurabilityLevel.Ephemeral,
        DurabilityLevel.Standard,
        DurabilityLevel.HighDurability,
      ];

      for (const durabilityLevel of durabilityLevels) {
        const data = randomBytes(100);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block, { durabilityLevel });

        const blockIdHex = Buffer.from(block.idChecksum.toBuffer()).toString(
          'hex',
        );
        const metadata = await blockStore.getMetadata(blockIdHex);

        expect(metadata).not.toBeNull();
        expect(metadata!.durabilityLevel).toBe(durabilityLevel);
      }
    });

    it('should delete blocks and verify they are gone', async () => {
      const data = randomBytes(100);
      const block = new RawDataBlock(blockSize, data);
      await blockStore.setData(block);

      // Verify it exists
      let exists = await blockStore.has(block.idChecksum);
      expect(exists).toBe(true);

      // Delete it
      await blockStore.deleteData(block.idChecksum);

      // Verify it's gone
      exists = await blockStore.has(block.idChecksum);
      expect(exists).toBe(false);
    });

    it('should track metadata including access count', async () => {
      const data = randomBytes(100);
      const block = new RawDataBlock(blockSize, data);
      await blockStore.setData(block, {
        durabilityLevel: DurabilityLevel.Standard,
      });

      const blockIdHex = Buffer.from(block.idChecksum.toBuffer()).toString(
        'hex',
      );

      // Access the block multiple times
      for (let i = 0; i < 5; i++) {
        await blockStore.getData(block.idChecksum);
      }

      const metadata = await blockStore.getMetadata(blockIdHex);
      expect(metadata).not.toBeNull();
      expect(metadata!.accessCount).toBeGreaterThanOrEqual(5);
    });
  });

  // ============================================================================
  // SECTION 2: CBL (Constituent Block List) E2E Tests
  // Note: CBL signature validation is complex and requires proper member setup.
  // These tests verify the block storage and recovery workflow without CBL.
  // For full CBL tests, see brightchain-lib/src/lib/stores/cblStore.spec.ts
  // ============================================================================

  describe('CBL E2E (Block Recovery Workflow)', () => {
    it('should store blocks and recover them using their checksums', async () => {
      // Store multiple blocks
      const blockCount = 5;
      const storedData: { checksum: string; data: Buffer }[] = [];

      for (let i = 0; i < blockCount; i++) {
        const data = randomBytes(100 + i * 20);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block);
        storedData.push({
          checksum: uint8ArrayToHex(block.idChecksum.toUint8Array()),
          data,
        });
      }

      // Simulate a "file manifest" that tracks block addresses (like a CBL would)
      const fileManifest = {
        fileName: 'test-file.bin',
        blockAddresses: storedData.map((b) => b.checksum),
        totalSize: storedData.reduce((acc, b) => acc + b.data.length, 0),
      };

      // Recover all blocks using the manifest
      const recoveredBlocks: Buffer[] = [];
      for (const addressHex of fileManifest.blockAddresses) {
        const checksum = Checksum.fromHex(addressHex);
        const block = await blockStore.getData(checksum);
        recoveredBlocks.push(Buffer.from(block.data));
      }

      // Verify all blocks were recovered correctly
      expect(recoveredBlocks.length).toBe(blockCount);
      for (let i = 0; i < blockCount; i++) {
        const recoveredSlice = recoveredBlocks[i].slice(
          0,
          storedData[i].data.length,
        );
        expect(recoveredSlice.equals(storedData[i].data)).toBe(true);
      }
    });

    it('should handle file chunking and reassembly workflow', async () => {
      // Simulate a file being chunked and stored
      const originalFile = Buffer.from(
        'This is a test file that will be split into multiple blocks for storage. ' +
          'Each block will be stored separately and then reassembled.',
      );

      // Split into chunks
      const chunkSize = 50;
      const chunks: Buffer[] = [];
      for (let i = 0; i < originalFile.length; i += chunkSize) {
        chunks.push(originalFile.slice(i, i + chunkSize));
      }

      // Store each chunk as a block
      const blockAddresses: string[] = [];
      for (const chunk of chunks) {
        const block = new RawDataBlock(blockSize, chunk);
        await blockStore.setData(block);
        blockAddresses.push(uint8ArrayToHex(block.idChecksum.toUint8Array()));
      }

      // Create a manifest (simulating what a CBL would store)
      const manifest = {
        fileName: 'test-document.txt',
        originalSize: originalFile.length,
        chunkCount: chunks.length,
        chunkSize,
        blockAddresses,
      };

      // Reassemble the file from blocks
      const reassembledChunks: Buffer[] = [];
      for (const addressHex of manifest.blockAddresses) {
        const checksum = Checksum.fromHex(addressHex);
        const block = await blockStore.getData(checksum);
        reassembledChunks.push(Buffer.from(block.data));
      }

      // Reconstruct the original file
      let reassembledFile = Buffer.alloc(0);
      for (let i = 0; i < reassembledChunks.length; i++) {
        const expectedLength =
          i === reassembledChunks.length - 1
            ? manifest.originalSize - i * manifest.chunkSize
            : manifest.chunkSize;
        const chunk = reassembledChunks[i].slice(0, expectedLength);
        reassembledFile = Buffer.concat([reassembledFile, chunk]);
      }

      // Verify the reassembled file matches the original
      expect(reassembledFile.equals(originalFile)).toBe(true);
    });
  });

  // ============================================================================
  // SECTION 3: Quorum Document Sealing/Unsealing E2E Tests
  // ============================================================================

  describe('Quorum Document Sealing/Unsealing E2E', () => {
    it('should seal a document and unseal with minimum required shareholders', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create 5 members
      const memberCount = 5;
      const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
      const memberIds: ShortHexGuid[] = [];

      for (let i = 0; i < memberCount; i++) {
        const memberWithMnemonic = createTestMember(
          `QuorumMember${i}`,
          `quorum${timestamp}${i}@example.com`,
        );
        memberData.push(memberWithMnemonic);

        const metadata: QuorumMemberMetadata = {
          name: `QuorumMember${i}`,
          email: `quorum${timestamp}${i}@example.com`,
          role: i === 0 ? 'admin' : 'member',
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );
        memberIds.push(addedMember.id);
      }

      // Create a document to seal
      const secretDocument = {
        title: 'Top Secret Document',
        content: 'This is highly confidential information',
        timestamp: Date.now(),
        data: {
          accountNumber: '1234567890',
          balance: 1000000,
        },
      };

      // Seal with threshold of 3 (out of 5 members)
      const sharesRequired = 3;
      const sealResult = await quorumService.sealDocument(
        memberData[0].member,
        secretDocument,
        memberIds,
        sharesRequired,
      );

      expect(sealResult.documentId).toBeDefined();
      expect(sealResult.memberIds).toEqual(memberIds);
      expect(sealResult.sharesRequired).toBe(sharesRequired);

      // Verify document info
      const docInfo = await quorumService.getDocument(sealResult.documentId);
      expect(docInfo).not.toBeNull();
      expect(docInfo!.sharesRequired).toBe(sharesRequired);
      expect(docInfo!.memberIds.length).toBe(memberCount);

      // Unseal with exactly 3 members (minimum required)
      const unsealingMembers = [
        memberData[0].member,
        memberData[2].member,
        memberData[4].member,
      ];

      const unsealedDocument = await quorumService.unsealDocument<
        typeof secretDocument
      >(sealResult.documentId, unsealingMembers);

      // Verify the unsealed document matches the original
      expect(unsealedDocument).toEqual(secretDocument);
    });

    it('should fail to unseal with insufficient shareholders', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create 4 members
      const memberCount = 4;
      const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
      const memberIds: ShortHexGuid[] = [];

      for (let i = 0; i < memberCount; i++) {
        const memberWithMnemonic = createTestMember(
          `InsufficientMember${i}`,
          `insufficient${timestamp}${i}@example.com`,
        );
        memberData.push(memberWithMnemonic);

        const metadata: QuorumMemberMetadata = {
          name: `InsufficientMember${i}`,
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );
        memberIds.push(addedMember.id);
      }

      // Seal with threshold of 3
      const secretDocument = { secret: 'data', value: 42 };
      const sealResult = await quorumService.sealDocument(
        memberData[0].member,
        secretDocument,
        memberIds,
        3, // sharesRequired
      );

      // Try to unseal with only 2 members (should fail)
      await expect(
        quorumService.unsealDocument(sealResult.documentId, [
          memberData[0].member,
          memberData[1].member,
        ]),
      ).rejects.toThrow();
    });

    it('should correctly report can-unlock status', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create 4 members
      const memberCount = 4;
      const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
      const memberIds: ShortHexGuid[] = [];

      for (let i = 0; i < memberCount; i++) {
        const memberWithMnemonic = createTestMember(
          `CanUnlockMember${i}`,
          `canunlock${timestamp}${i}@example.com`,
        );
        memberData.push(memberWithMnemonic);

        const metadata: QuorumMemberMetadata = {
          name: `CanUnlockMember${i}`,
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );
        memberIds.push(addedMember.id);
      }

      // Seal with threshold of 2
      const secretDocument = { data: 'test' };
      const sealResult = await quorumService.sealDocument(
        memberData[0].member,
        secretDocument,
        memberIds,
        2,
      );

      // Check can-unlock with 1 member (should be false)
      const canUnlockWith1 = await quorumService.canUnlock(
        sealResult.documentId,
        [memberIds[0]],
      );
      expect(canUnlockWith1.canUnlock).toBe(false);
      expect(canUnlockWith1.sharesProvided).toBe(1);
      expect(canUnlockWith1.sharesRequired).toBe(2);

      // Check can-unlock with 2 members (should be true)
      const canUnlockWith2 = await quorumService.canUnlock(
        sealResult.documentId,
        [memberIds[0], memberIds[1]],
      );
      expect(canUnlockWith2.canUnlock).toBe(true);
      expect(canUnlockWith2.sharesProvided).toBe(2);

      // Check can-unlock with all members (should be true)
      const canUnlockWithAll = await quorumService.canUnlock(
        sealResult.documentId,
        memberIds,
      );
      expect(canUnlockWithAll.canUnlock).toBe(true);
      expect(canUnlockWithAll.sharesProvided).toBe(memberCount);
    });

    it('should handle member removal while preserving document access', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create 3 members
      const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
      const memberIds: ShortHexGuid[] = [];

      for (let i = 0; i < 3; i++) {
        const memberWithMnemonic = createTestMember(
          `RemovalMember${i}`,
          `removal${timestamp}${i}@example.com`,
        );
        memberData.push(memberWithMnemonic);

        const metadata: QuorumMemberMetadata = {
          name: `RemovalMember${i}`,
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );
        memberIds.push(addedMember.id);
      }

      // Seal a document with all 3 members, threshold of 2
      const secretDocument = { important: 'data' };
      const sealResult = await quorumService.sealDocument(
        memberData[0].member,
        secretDocument,
        memberIds,
        2,
      );

      // Remove member 2 from the quorum
      await quorumService.removeMember(memberIds[2]);

      // Verify member 2 is no longer active
      const member2 = await quorumService.getMember(memberIds[2]);
      expect(member2).not.toBeNull();
      expect(member2!.isActive).toBe(false);

      // Member 2 should still be able to participate in unsealing the existing document
      // because they were part of the original sealing
      const unsealedDocument = await quorumService.unsealDocument<
        typeof secretDocument
      >(sealResult.documentId, [memberData[0].member, memberData[2].member]);

      expect(unsealedDocument).toEqual(secretDocument);
    });

    it('should seal and unseal complex nested documents', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create 2 members (minimum)
      const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
      const memberIds: ShortHexGuid[] = [];

      for (let i = 0; i < 2; i++) {
        const memberWithMnemonic = createTestMember(
          `ComplexMember${i}`,
          `complex${timestamp}${i}@example.com`,
        );
        memberData.push(memberWithMnemonic);

        const metadata: QuorumMemberMetadata = {
          name: `ComplexMember${i}`,
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );
        memberIds.push(addedMember.id);
      }

      // Create a complex nested document
      const complexDocument = {
        metadata: {
          version: '1.0.0',
          created: new Date().toISOString(),
          tags: ['confidential', 'financial', 'q4-2025'],
        },
        data: {
          accounts: [
            { id: 1, name: 'Account A', balance: 10000 },
            { id: 2, name: 'Account B', balance: 25000 },
            { id: 3, name: 'Account C', balance: 50000 },
          ],
          transactions: [
            { from: 1, to: 2, amount: 500, date: '2025-01-15' },
            { from: 2, to: 3, amount: 1000, date: '2025-01-16' },
          ],
        },
        signature: 'abc123def456',
      };

      // Seal with threshold of 2 (all members required)
      const sealResult = await quorumService.sealDocument(
        memberData[0].member,
        complexDocument,
        memberIds,
        2,
      );

      // Unseal with both members
      const unsealedDocument = await quorumService.unsealDocument<
        typeof complexDocument
      >(sealResult.documentId, [memberData[0].member, memberData[1].member]);

      // Verify the complex document was preserved exactly
      expect(unsealedDocument).toEqual(complexDocument);
      expect(unsealedDocument.data.accounts.length).toBe(3);
      expect(unsealedDocument.data.transactions.length).toBe(2);
    });
  });

  // ============================================================================
  // SECTION 4: Integrated Block + CBL + Quorum E2E Tests
  // ============================================================================

  describe('Integrated Block + CBL + Quorum E2E', () => {
    it('should store blocks, create CBL, seal CBL reference, and recover', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create quorum members
      const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
      const memberIds: ShortHexGuid[] = [];

      for (let i = 0; i < 3; i++) {
        const memberWithMnemonic = createTestMember(
          `IntegratedMember${i}`,
          `integrated${timestamp}${i}@example.com`,
        );
        memberData.push(memberWithMnemonic);

        const metadata: QuorumMemberMetadata = {
          name: `IntegratedMember${i}`,
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );
        memberIds.push(addedMember.id);
      }

      // Step 1: Store multiple blocks (simulating file chunks)
      const fileChunks = [
        Buffer.from('File chunk 1 - header data'),
        Buffer.from('File chunk 2 - main content'),
        Buffer.from('File chunk 3 - footer data'),
      ];
      const blockChecksums: string[] = [];

      for (const chunk of fileChunks) {
        const block = new RawDataBlock(blockSize, chunk);
        await blockStore.setData(block, {
          durabilityLevel: DurabilityLevel.Standard,
        });
        blockChecksums.push(uint8ArrayToHex(block.idChecksum.toUint8Array()));
      }

      // Step 2: Create a document that references the CBL/blocks
      const fileReference = {
        fileName: 'important-document.pdf',
        fileSize: fileChunks.reduce((acc, c) => acc + c.length, 0),
        blockAddresses: blockChecksums,
        createdAt: new Date().toISOString(),
        checksum: 'sha256:abc123',
      };

      // Step 3: Seal the file reference with quorum
      const sealResult = await quorumService.sealDocument(
        memberData[0].member,
        fileReference,
        memberIds,
        2, // threshold
      );

      // Step 4: Unseal with 2 members to get the file reference
      const unsealedReference = await quorumService.unsealDocument<
        typeof fileReference
      >(sealResult.documentId, [memberData[0].member, memberData[1].member]);

      // Step 5: Use the unsealed reference to recover all blocks
      expect(unsealedReference.blockAddresses).toEqual(blockChecksums);

      const recoveredChunks: Buffer[] = [];
      for (const addressHex of unsealedReference.blockAddresses) {
        const checksum = Checksum.fromHex(addressHex);
        const block = await blockStore.getData(checksum);
        recoveredChunks.push(Buffer.from(block.data));
      }

      // Verify all chunks were recovered correctly
      expect(recoveredChunks.length).toBe(fileChunks.length);
      for (let i = 0; i < fileChunks.length; i++) {
        const recoveredSlice = recoveredChunks[i].slice(
          0,
          fileChunks[i].length,
        );
        expect(recoveredSlice.equals(fileChunks[i])).toBe(true);
      }
    });

    it('should handle multiple sealed documents with different shareholder groups', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create 5 members
      const memberData: IMemberWithMnemonic<GuidV4Buffer>[] = [];
      const memberIds: ShortHexGuid[] = [];

      for (let i = 0; i < 5; i++) {
        const memberWithMnemonic = createTestMember(
          `MultiDocMember${i}`,
          `multidoc${timestamp}${i}@example.com`,
        );
        memberData.push(memberWithMnemonic);

        const metadata: QuorumMemberMetadata = {
          name: `MultiDocMember${i}`,
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );
        memberIds.push(addedMember.id);
      }

      // Document 1: Sealed for members 0, 1, 2 with threshold 2
      const doc1 = { type: 'financial', data: 'Q4 Report' };
      const seal1 = await quorumService.sealDocument(
        memberData[0].member,
        doc1,
        [memberIds[0], memberIds[1], memberIds[2]],
        2,
      );

      // Document 2: Sealed for members 2, 3, 4 with threshold 2
      const doc2 = { type: 'legal', data: 'Contract Terms' };
      const seal2 = await quorumService.sealDocument(
        memberData[2].member,
        doc2,
        [memberIds[2], memberIds[3], memberIds[4]],
        2,
      );

      // Document 3: Sealed for all members with threshold 3
      const doc3 = { type: 'executive', data: 'Board Minutes' };
      const seal3 = await quorumService.sealDocument(
        memberData[0].member,
        doc3,
        memberIds,
        3,
      );

      // Unseal doc1 with members 0 and 1
      const unsealed1 = await quorumService.unsealDocument<typeof doc1>(
        seal1.documentId,
        [memberData[0].member, memberData[1].member],
      );
      expect(unsealed1).toEqual(doc1);

      // Unseal doc2 with members 3 and 4
      const unsealed2 = await quorumService.unsealDocument<typeof doc2>(
        seal2.documentId,
        [memberData[3].member, memberData[4].member],
      );
      expect(unsealed2).toEqual(doc2);

      // Unseal doc3 with members 0, 2, and 4
      const unsealed3 = await quorumService.unsealDocument<typeof doc3>(
        seal3.documentId,
        [memberData[0].member, memberData[2].member, memberData[4].member],
      );
      expect(unsealed3).toEqual(doc3);

      // Verify member 1 cannot unseal doc2 (not in the shareholder group)
      const canUnlockDoc2WithMember1 = await quorumService.canUnlock(
        seal2.documentId,
        [memberIds[1], memberIds[2]],
      );
      // Member 1 is not in doc2's shareholder group, so only member 2 counts
      expect(canUnlockDoc2WithMember1.sharesProvided).toBe(1);
      expect(canUnlockDoc2WithMember1.canUnlock).toBe(false);
    });

    it('should demonstrate full workflow: store file, create CBL, seal access, distribute shares', async () => {
      const quorumService = createQuorumService();
      const timestamp = Date.now();

      // Create 4 shareholders (e.g., company executives)
      const shareholders: {
        member: IMemberWithMnemonic<GuidV4Buffer>;
        id: ShortHexGuid;
        role: string;
      }[] = [];

      const roles = ['CEO', 'CFO', 'CTO', 'Legal'];
      for (let i = 0; i < 4; i++) {
        const memberWithMnemonic = createTestMember(
          roles[i],
          `${roles[i].toLowerCase()}${timestamp}@company.com`,
        );

        const metadata: QuorumMemberMetadata = {
          name: roles[i],
          email: `${roles[i].toLowerCase()}${timestamp}@company.com`,
          role: roles[i],
        };

        const addedMember = await quorumService.addMember(
          memberWithMnemonic.member,
          metadata,
        );

        shareholders.push({
          member: memberWithMnemonic,
          id: addedMember.id,
          role: roles[i],
        });
      }

      // Simulate storing a sensitive file in blocks
      const sensitiveFileContent = `
        CONFIDENTIAL MERGER AGREEMENT
        =============================
        
        This agreement is between Company A and Company B...
        
        Terms:
        1. Acquisition price: $500M
        2. Closing date: Q2 2026
        3. Employee retention: 95%
        
        Signatures required from all parties.
      `;

      // Split into chunks and store as blocks
      const chunkSize = 100;
      const chunks: Buffer[] = [];
      for (let i = 0; i < sensitiveFileContent.length; i += chunkSize) {
        chunks.push(Buffer.from(sensitiveFileContent.slice(i, i + chunkSize)));
      }

      const blockAddresses: string[] = [];
      for (const chunk of chunks) {
        const block = new RawDataBlock(blockSize, chunk);
        await blockStore.setData(block, {
          durabilityLevel: DurabilityLevel.HighDurability,
        });
        blockAddresses.push(uint8ArrayToHex(block.idChecksum.toUint8Array()));
      }

      // Create a file manifest that references all blocks
      const fileManifest = {
        fileName: 'merger-agreement-confidential.txt',
        mimeType: 'text/plain',
        totalSize: sensitiveFileContent.length,
        chunkCount: chunks.length,
        blockAddresses,
        createdAt: new Date().toISOString(),
        createdBy: 'Legal Department',
      };

      // Seal the manifest with all 4 shareholders, requiring 3 to unseal
      const memberIds = shareholders.map((s) => s.id);
      const sealResult = await quorumService.sealDocument(
        shareholders[0].member.member,
        fileManifest,
        memberIds,
        3, // Require 3 of 4 executives to access
      );

      console.log(`
        ========================================
        SEALED DOCUMENT CREATED
        ========================================
        Document ID: ${sealResult.documentId}
        Shareholders: ${shareholders.map((s) => s.role).join(', ')}
        Shares Required: ${sealResult.sharesRequired} of ${memberIds.length}
        ========================================
      `);

      // Verify can-unlock scenarios
      // CEO + CFO = 2 shares (not enough)
      const twoExecs = await quorumService.canUnlock(sealResult.documentId, [
        shareholders[0].id,
        shareholders[1].id,
      ]);
      expect(twoExecs.canUnlock).toBe(false);
      expect(twoExecs.sharesProvided).toBe(2);

      // CEO + CFO + CTO = 3 shares (enough!)
      const threeExecs = await quorumService.canUnlock(sealResult.documentId, [
        shareholders[0].id,
        shareholders[1].id,
        shareholders[2].id,
      ]);
      expect(threeExecs.canUnlock).toBe(true);
      expect(threeExecs.sharesProvided).toBe(3);

      // Unseal with CEO, CFO, and Legal (3 shareholders)
      const unsealedManifest = await quorumService.unsealDocument<
        typeof fileManifest
      >(sealResult.documentId, [
        shareholders[0].member.member, // CEO
        shareholders[1].member.member, // CFO
        shareholders[3].member.member, // Legal
      ]);

      // Verify manifest was recovered
      expect(unsealedManifest.fileName).toBe(fileManifest.fileName);
      expect(unsealedManifest.blockAddresses).toEqual(blockAddresses);

      // Recover the original file from blocks
      let recoveredContent = '';
      for (const addressHex of unsealedManifest.blockAddresses) {
        const checksum = Checksum.fromHex(addressHex);
        const block = await blockStore.getData(checksum);
        // Find the actual content length for this chunk
        const chunkIndex = unsealedManifest.blockAddresses.indexOf(addressHex);
        const expectedLength =
          chunkIndex < chunks.length ? chunks[chunkIndex].length : 0;
        recoveredContent += Buffer.from(block.data)
          .slice(0, expectedLength)
          .toString();
      }

      // Verify the recovered content matches the original
      expect(recoveredContent).toBe(sensitiveFileContent);

      console.log(`
        ========================================
        FILE SUCCESSFULLY RECOVERED
        ========================================
        Original size: ${sensitiveFileContent.length} bytes
        Recovered size: ${recoveredContent.length} bytes
        Content match: ${recoveredContent === sensitiveFileContent}
        ========================================
      `);
    });
  });
});
