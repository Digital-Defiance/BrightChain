/**
 * Complete Ingestion and Reconstruction Workflow Integration Test
 * 
 * This test demonstrates the COMPLETE BrightChain file ingestion workflow:
 * 
 * INGESTION WORKFLOW:
 * 1. Take a real file/document
 * 2. Break into appropriately-sized blocks
 * 3. For each block, generate random whitening blocks
 * 4. XOR source blocks with whiteners to create prime whitened blocks
 * 5. Store all blocks (whitened + randoms) to disk/memory
 * 6. Create a Constituent Block List (CBL) as the "recipe"
 * 7. Store the CBL
 * 
 * RECONSTRUCTION WORKFLOW:
 * 1. Retrieve the CBL (the recipe)
 * 2. Extract block addresses from CBL
 * 3. Retrieve whitened and random blocks from storage
 * 4. XOR them back together to recover source blocks
 * 5. Concatenate source blocks to recover original file
 * 6. Verify integrity via checksums
 * 
 * This is the complete production-ready workflow!
 */

import { randomBytes } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { DiskBlockAsyncStore } from '@brightchain/brightchain-api-lib';
import { MemoryBlockStore } from '@brightchain/brightchain-lib/lib/stores/memoryBlockStore';
import { RandomBlock } from '@brightchain/brightchain-lib/lib/blocks/random';
import { RawDataBlock } from '@brightchain/brightchain-lib/lib/blocks/rawData';
import { WhitenedBlock } from '@brightchain/brightchain-lib/lib/blocks/whitened';
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { BlockType } from '@brightchain/brightchain-lib/lib/enumerations/blockType';
import { BlockDataType } from '@brightchain/brightchain-lib/lib/enumerations/blockDataType';
import { ServiceLocator } from '@brightchain/brightchain-lib/lib/services/serviceLocator';
import { ServiceProvider } from '@brightchain/brightchain-lib/lib/services/service.provider';
import { Member } from '@digitaldefiance/ecies-lib';
import { MemberType } from '@brightchain/brightchain-lib/lib/enumerations/memberType';
import { EmailString } from '@brightchain/brightchain-lib/lib/emailString';
import { uint8ArrayToHex, ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { TUPLE } from '@brightchain/brightchain-lib/lib/constants';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn().mockResolvedValue({
    ext: 'json',
    mime: 'application/json',
  }),
}));

describe('Complete Ingestion & Reconstruction Workflow', () => {
  let tempDir: string;
  let diskStore: DiskBlockAsyncStore;
  let memoryStore: MemoryBlockStore;
  let creator: Member;
  const blockSize = BlockSize.Small;

  beforeAll(async () => {
    // Initialize services
    const serviceProvider = ServiceProvider.getInstance();
    ServiceLocator.setServiceProvider(serviceProvider);
    
    // Create test member
    const eciesService = serviceProvider.eciesService;
    creator = Member.newMember(
      eciesService,
      MemberType.User,
      'TestUser',
      new EmailString('test@brightchain.io'),
    ).member;

    // Create temp directory for disk store
    tempDir = await mkdtemp(join(tmpdir(), 'brightchain-test-'));
    diskStore = new DiskBlockAsyncStore({
      storePath: tempDir,
      blockSize,
    });
  });

  afterAll(async () => {
    // Cleanup
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    memoryStore = new MemoryBlockStore(blockSize);
  });

  describe('Single Block Ingestion & Reconstruction', () => {
    it('should ingest and reconstruct a small document', async () => {
      // ============ INGESTION WORKFLOW ============
      
      // Step 1: Create source document
      const originalDocument = {
        title: 'My First BrightChain Document',
        content: 'This is a test document that will be ingested into BrightChain.',
        timestamp: new Date().toISOString(),
        version: 1,
      };
      
      const sourceData = Buffer.from(JSON.stringify(originalDocument, null, 2));
      const paddedSource = Buffer.alloc(blockSize);
      sourceData.copy(paddedSource);
      
      const sourceChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(paddedSource);
      const sourceBlock = new RawDataBlock(
        blockSize,
        paddedSource,
        new Date(),
        sourceChecksum,
        BlockType.RawData,
        BlockDataType.RawData,
      );
      
      // Step 2: Generate random whitening blocks (3 for TUPLE.SIZE=4, leaving 1 for prime)
      const numWhiteners = TUPLE.SIZE - 1; // 3 whiteners
      const whiteners: RandomBlock[] = [];
      for (let i = 0; i < numWhiteners; i++) {
        whiteners.push(RandomBlock.new(blockSize));
      }
      
      // Step 3: XOR source with whiteners to create prime whitened block
      let whitenedData = Buffer.from(sourceBlock.data);
      for (const whitener of whiteners) {
        const whitenerData = Buffer.from(whitener.data);
        for (let i = 0; i < blockSize; i++) {
          whitenedData[i] ^= whitenerData[i];
        }
      }
      
      const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitenedData);
      const primeWhitenedBlock = new WhitenedBlock(blockSize, whitenedData, whitenedChecksum);
      
      // Step 4: Store all blocks to memory store
      const storedBlockIds: string[] = [];
      
      // Store whiteners
      for (const whitener of whiteners) {
        await memoryStore.put(whitener.idChecksum, whitener.data);
        storedBlockIds.push(uint8ArrayToHex(whitener.idChecksum.toUint8Array()));
      }
      
      // Store prime whitened block
      await memoryStore.put(primeWhitenedBlock.idChecksum, primeWhitenedBlock.data);
      storedBlockIds.push(uint8ArrayToHex(primeWhitenedBlock.idChecksum.toUint8Array()));
      
      // Step 5: Create CBL (Constituent Block List) - the recipe
      const cbl = {
        blockIds: storedBlockIds,
        originalLength: sourceData.length,
        originalChecksum: uint8ArrayToHex(sourceChecksum.toUint8Array()),
        blockSize,
        tupleSize: TUPLE.SIZE,
        createdAt: new Date().toISOString(),
        creator: creator.id.toString(),
      };
      
      // Step 6: Store CBL metadata
      const cblData = Buffer.from(JSON.stringify(cbl));
      const cblChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(cblData);
      await memoryStore.put(cblChecksum, cblData);
      
      // At this point, ingestion is complete!
      // The original source block is NOT stored anywhere
      // Only the whitened block and random blocks exist
      
      // ============ RECONSTRUCTION WORKFLOW ============
      
      // Step 1: Retrieve the CBL
      const retrievedCblData = await memoryStore.get(cblChecksum);
      const retrievedCbl = JSON.parse(retrievedCblData.data.toString());
      
      // Step 2: Extract block IDs from CBL
      const blockIds = retrievedCbl.blockIds as string[];
      expect(blockIds).toHaveLength(TUPLE.SIZE);
      
      // Step 3: Retrieve blocks from storage
      // Convention: first (n-1) are whiteners, last is prime whitened
      const retrievedWhiteners = [];
      for (let i = 0; i < numWhiteners; i++) {
        retrievedWhiteners.push(await memoryStore.get(blockIds[i]));
      }
      const retrievedPrime = await memoryStore.get(blockIds[numWhiteners]);
      
      // Step 4: XOR back to recover source
      let reconstructedSource = Buffer.from(retrievedPrime.fullData);
      for (const whitener of retrievedWhiteners) {
        const whitenerData = Buffer.from(whitener.fullData);
        for (let i = 0; i < blockSize; i++) {
          reconstructedSource[i] ^= whitenerData[i];
        }
      }
      
      // Step 5: Verify integrity
      const reconstructedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(reconstructedSource);
      expect(uint8ArrayToHex(reconstructedChecksum.toUint8Array())).toBe(retrievedCbl.originalChecksum);
      
      // Step 6: Extract original document
      const reconstructedDocument = JSON.parse(
        reconstructedSource.subarray(0, retrievedCbl.originalLength).toString()
      );
      
      // Verify perfect reconstruction
      expect(reconstructedDocument).toEqual(originalDocument);
      expect(reconstructedDocument.title).toBe('My First BrightChain Document');
    });
  });

  describe('Multi-Block Ingestion & Reconstruction', () => {
    it('should ingest and reconstruct a larger document', async () => {
      // ============ INGESTION WORKFLOW ============
      
      // Create a document that spans multiple blocks
      const largeDocument = {
        type: 'research-paper',
        title: 'BrightChain: A Revolutionary Approach to Distributed Storage',
        abstract: 'This paper presents BrightChain, a novel distributed storage system based on the Owner Free Filesystem concept...',
        sections: [
          {
            id: 1,
            title: 'Introduction',
            content: 'The Owner Free Filesystem (OFF) was first proposed as a method to store data in a distributed manner where no single node holds meaningful information. BrightChain extends this concept with modern cryptographic techniques and a reputation-based quorum system.',
          },
          {
            id: 2,
            title: 'Technical Architecture',
            content: 'The system consists of three main components: the block store layer, the whitening layer, and the constituent block list management system. Each component plays a crucial role in ensuring data privacy and integrity.',
          },
          {
            id: 3,
            title: 'Implementation',
            content: 'Our implementation uses TypeScript and Node.js, providing both disk-based and memory-based storage backends. The system supports multiple block sizes and automatic size selection based on data length.',
          },
        ],
        metadata: {
          authors: ['Digital Defiance', 'BrightChain Contributors'],
          date: new Date().toISOString(),
          version: '1.0.0',
        },
      };
      
      const fullDocumentData = Buffer.from(JSON.stringify(largeDocument, null, 2));
      
      // Calculate blocks needed
      const numBlocks = Math.ceil(fullDocumentData.length / blockSize);
      
      // Store all block tuples
      const allBlockIds: string[][] = []; // Array of tuples
      
      for (let blockIndex = 0; blockIndex < numBlocks; blockIndex++) {
        const start = blockIndex * blockSize;
        const end = Math.min(start + blockSize, fullDocumentData.length);
        const chunk = Buffer.alloc(blockSize);
        fullDocumentData.copy(chunk, 0, start, end);
        
        // Create source block
        const sourceChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(chunk);
        const sourceBlock = new RawDataBlock(blockSize, chunk, new Date(), sourceChecksum);
        
        // Generate whiteners for this block
        const whiteners: RandomBlock[] = [];
        for (let i = 0; i < TUPLE.SIZE - 1; i++) {
          whiteners.push(RandomBlock.new(blockSize));
        }
        
        // Whiten the source block
        let whitenedData = Buffer.from(sourceBlock.data);
        for (const whitener of whiteners) {
          const whitenerData = Buffer.from(whitener.data);
          for (let i = 0; i < blockSize; i++) {
            whitenedData[i] ^= whitenerData[i];
          }
        }
        
        const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitenedData);
        const primeWhitened = new WhitenedBlock(blockSize, whitenedData, whitenedChecksum);
        
        // Store all blocks for this tuple
        const tupleBlockIds: string[] = [];
        
        for (const whitener of whiteners) {
          await memoryStore.put(whitener.idChecksum, whitener.data);
          tupleBlockIds.push(uint8ArrayToHex(whitener.idChecksum.toUint8Array()));
        }
        
        await memoryStore.put(primeWhitened.idChecksum, primeWhitened.data);
        tupleBlockIds.push(uint8ArrayToHex(primeWhitened.idChecksum.toUint8Array()));
        
        allBlockIds.push(tupleBlockIds);
      }
      
      // Create master CBL
      const masterCbl = {
        documentType: 'multi-block',
        blockTuples: allBlockIds,
        originalLength: fullDocumentData.length,
        originalChecksum: uint8ArrayToHex(
          ServiceLocator.getServiceProvider().checksumService.calculateChecksum(fullDocumentData).toUint8Array()
        ),
        numBlocks,
        blockSize,
        tupleSize: TUPLE.SIZE,
        createdAt: new Date().toISOString(),
      };
      
      const cblData = Buffer.from(JSON.stringify(masterCbl));
      const cblChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(cblData);
      await memoryStore.put(cblChecksum, cblData);
      
      // ============ RECONSTRUCTION WORKFLOW ============
      
      // Retrieve CBL
      const retrievedCblData = await memoryStore.get(cblChecksum);
      const retrievedCbl = JSON.parse(retrievedCblData.data.toString());
      
      expect(retrievedCbl.numBlocks).toBe(numBlocks);
      expect(retrievedCbl.blockTuples).toHaveLength(numBlocks);
      
      // Reconstruct each block
      const reconstructedBlocks: Buffer[] = [];
      
      for (let blockIndex = 0; blockIndex < retrievedCbl.numBlocks; blockIndex++) {
        const tupleIds = retrievedCbl.blockTuples[blockIndex];
        
        // Retrieve whiteners (first n-1)
        const whiteners = [];
        for (let i = 0; i < TUPLE.SIZE - 1; i++) {
          whiteners.push(await memoryStore.get(tupleIds[i]));
        }
        
        // Retrieve prime whitened (last)
        const primeWhitened = await memoryStore.get(tupleIds[TUPLE.SIZE - 1]);
        
        // XOR to recover source
        let reconstructed = Buffer.from(primeWhitened.fullData);
        for (const whitener of whiteners) {
          const whitenerData = Buffer.from(whitener.fullData);
          for (let i = 0; i < blockSize; i++) {
            reconstructed[i] ^= whitenerData[i];
          }
        }
        
        reconstructedBlocks.push(reconstructed);
      }
      
      // Combine blocks
      const reconstructedDocument = Buffer.concat(reconstructedBlocks)
        .subarray(0, retrievedCbl.originalLength);
      
      // Verify checksum
      const reconstructedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        reconstructedDocument
      );
      expect(uint8ArrayToHex(reconstructedChecksum.toUint8Array())).toBe(retrievedCbl.originalChecksum);
      
      // Parse and verify
      const parsedDoc = JSON.parse(reconstructedDocument.toString());
      expect(parsedDoc).toEqual(largeDocument);
      expect(parsedDoc.title).toBe('BrightChain: A Revolutionary Approach to Distributed Storage');
      expect(parsedDoc.sections).toHaveLength(3);
      expect(parsedDoc.sections[0].title).toBe('Introduction');
    });
  });

  describe('Disk Storage Workflow', () => {
    it('should ingest and reconstruct using disk storage', async () => {
      // Similar to memory but using actual disk
      const document = {
        message: 'This document is stored on actual disk using DiskBlockAsyncStore',
        persistent: true,
        timestamp: new Date().toISOString(),
      };
      
      const sourceData = Buffer.from(JSON.stringify(document, null, 2));
      const paddedSource = Buffer.alloc(blockSize);
      sourceData.copy(paddedSource);
      
      const sourceChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(paddedSource);
      
      // Generate whiteners
      const whiteners: RandomBlock[] = [];
      for (let i = 0; i < TUPLE.SIZE - 1; i++) {
        whiteners.push(RandomBlock.new(blockSize));
      }
      
      // Whiten
      let whitenedData = Buffer.from(paddedSource);
      for (const whitener of whiteners) {
        const whitenerData = Buffer.from(whitener.data);
        for (let i = 0; i < blockSize; i++) {
          whitenedData[i] ^= whitenerData[i];
        }
      }
      
      const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitenedData);
      const primeWhitened = new WhitenedBlock(blockSize, whitenedData, whitenedChecksum);
      
      // Store to disk using DiskBlockAsyncStore
      const storedBlockChecksums: import('@brightchain/brightchain-lib').Checksum[] = [];
      
      for (const whitener of whiteners) {
        await diskStore.setData(whitener);
        storedBlockChecksums.push(whitener.idChecksum);
      }
      
      await diskStore.setData(primeWhitened);
      storedBlockChecksums.push(primeWhitened.idChecksum);
      
      // Create CBL
      const cbl = {
        blockIds: storedBlockChecksums.map(c => uint8ArrayToHex(c.toUint8Array())),
        originalLength: sourceData.length,
        storage: 'disk',
        storePath: tempDir,
      };
      
      // Verify blocks exist on disk
      for (const checksum of storedBlockChecksums) {
        expect(await diskStore.has(checksum)).toBe(true);
      }
      
      // Reconstruct
      const retrievedWhiteners: RawDataBlock[] = [];
      for (let i = 0; i < TUPLE.SIZE - 1; i++) {
        retrievedWhiteners.push(await diskStore.getData(storedBlockChecksums[i]));
      }
      const retrievedPrime = await diskStore.getData(storedBlockChecksums[TUPLE.SIZE - 1]);
      
      let reconstructed = Buffer.from(retrievedPrime.data);
      for (const whitener of retrievedWhiteners) {
        const whitenerData = Buffer.from(whitener.data);
        for (let i = 0; i < blockSize; i++) {
          reconstructed[i] ^= whitenerData[i];
        }
      }
      
      const recoveredDoc = JSON.parse(reconstructed.subarray(0, cbl.originalLength).toString());
      expect(recoveredDoc).toEqual(document);
      expect(recoveredDoc.persistent).toBe(true);
    });
  });

  describe('Workflow Verification', () => {
    it('should demonstrate that intermediate source blocks are never stored', async () => {
      const secret = Buffer.from('TOP SECRET: This should never be stored directly');
      const paddedSecret = Buffer.alloc(blockSize);
      secret.copy(paddedSecret);
      
      const sourceChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(paddedSecret);
      
      // Generate and store only whitened + random blocks
      const whiteners = [RandomBlock.new(blockSize), RandomBlock.new(blockSize)];
      
      let whitenedData = Buffer.from(paddedSecret);
      for (const whitener of whiteners) {
        const whitenerData = Buffer.from(whitener.data);
        for (let i = 0; i < blockSize; i++) {
          whitenedData[i] ^= whitenerData[i];
        }
      }
      
      const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitenedData);
      const primeWhitened = new WhitenedBlock(blockSize, whitenedData, whitenedChecksum);
      
      // Store only whitened and random blocks
      await memoryStore.put(whiteners[0].idChecksum, whiteners[0].data);
      await memoryStore.put(whiteners[1].idChecksum, whiteners[1].data);
      await memoryStore.put(primeWhitened.idChecksum, primeWhitened.data);
      
      // Verify source block is NOT in storage
      expect(await memoryStore.has(sourceChecksum)).toBe(false);
      
      // Verify no stored block contains the secret text
      const storedBlock1 = await memoryStore.get(whiteners[0].idChecksum);
      const storedBlock2 = await memoryStore.get(whiteners[1].idChecksum);
      const storedBlock3 = await memoryStore.get(primeWhitened.idChecksum);
      
      expect(storedBlock1.fullData.toString()).not.toContain('TOP SECRET');
      expect(storedBlock2.fullData.toString()).not.toContain('TOP SECRET');
      expect(storedBlock3.fullData.toString()).not.toContain('TOP SECRET');
      
      // But we can still reconstruct the secret
      let reconstructed = Buffer.from(storedBlock3.fullData);
      for (const storedBlock of [storedBlock1, storedBlock2]) {
        const data = Buffer.from(storedBlock.fullData);
        for (let i = 0; i < blockSize; i++) {
          reconstructed[i] ^= data[i];
        }
      }
      
      expect(reconstructed.subarray(0, secret.length).toString()).toBe('TOP SECRET: This should never be stored directly');
    });

    it('should demonstrate complete workflow with metadata', async () => {
      const workflow = {
        stage: 'ingestion',
        steps: [
          '1. Break file into blocks',
          '2. Generate random whiteners',
          '3. XOR source with whiteners',
          '4. Store whitened + random blocks',
          '5. Create CBL with block addresses',
          '6. Store CBL',
        ],
      };
      
      const data = Buffer.from(JSON.stringify(workflow));
      const padded = Buffer.alloc(blockSize);
      data.copy(padded);
      
      // Full ingestion
      const whiteners = [RandomBlock.new(blockSize), RandomBlock.new(blockSize), RandomBlock.new(blockSize)];
      
      let whitened = Buffer.from(padded);
      for (const w of whiteners) {
        const wData = Buffer.from(w.data);
        for (let i = 0; i < blockSize; i++) {
          whitened[i] ^= wData[i];
        }
      }
      
      const whitenedChecksum = ServiceLocator.getServiceProvider().checksumService.calculateChecksum(whitened);
      const prime = new WhitenedBlock(blockSize, whitened, whitenedChecksum);
      
      for (const w of whiteners) await memoryStore.put(w.idChecksum, w.data);
      await memoryStore.put(prime.idChecksum, prime.data);
      
      const cblIds = [...whiteners.map(w => uint8ArrayToHex(w.idChecksum.toUint8Array())), uint8ArrayToHex(prime.idChecksum.toUint8Array())];
      
      // Full reconstruction
      const retrieved = await Promise.all(cblIds.map(id => memoryStore.get(id)));
      
      let reconstructed = Buffer.from(retrieved[retrieved.length - 1].fullData);
      for (let i = 0; i < retrieved.length - 1; i++) {
        const d = Buffer.from(retrieved[i].fullData);
        for (let j = 0; j < blockSize; j++) {
          reconstructed[j] ^= d[j];
        }
      }
      
      const recovered = JSON.parse(reconstructed.subarray(0, data.length).toString());
      expect(recovered.stage).toBe('ingestion');
      expect(recovered.steps).toHaveLength(6);
    });
  });
});
