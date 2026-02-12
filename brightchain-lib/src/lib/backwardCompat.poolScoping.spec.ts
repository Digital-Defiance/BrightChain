/**
 * @fileoverview Unit tests for backward compatibility edge cases.
 *
 * **Feature: pool-scoped-whitening**
 *
 * Validates that existing unpooled code continues to work unchanged after
 * pool-scoped whitening was introduced.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockHandle, createBlockHandle } from './blocks/handle';
import { BlockHandleTuple } from './blocks/handleTuple';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { RandomBlock } from './blocks/random';
import { RawDataBlock } from './blocks/rawData';
import { WhitenedBlock } from './blocks/whitened';
import { TUPLE } from './constants';
import { BlockSize } from './enumerations/blockSize';
import { initializeBrightChain } from './init';
import { ServiceProvider } from './services/service.provider';
import { ServiceLocator } from './services/serviceLocator';
import { MemoryBlockStore } from './stores/memoryBlockStore';

// Longer timeout for tuple creation tests
jest.setTimeout(30000);

describe('Backward Compatibility - Pool Scoping', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  // ---------------------------------------------------------------------------
  // Requirement 8.1: Legacy getRandomBlocks on non-pooled MemoryBlockStore
  // ---------------------------------------------------------------------------

  describe('Requirement 8.1: Legacy getRandomBlocks on non-pooled store', () => {
    it('should return blocks from the global store when called on MemoryBlockStore', async () => {
      const blockSize = BlockSize.Small;
      const store = new MemoryBlockStore(blockSize);

      // Store some blocks in the global store
      const storedChecksums: string[] = [];
      for (let i = 0; i < 5; i++) {
        const data = new Uint8Array(blockSize);
        crypto.getRandomValues(data);
        const block = new RawDataBlock(blockSize, data);
        await store.put(block.idChecksum, data);
        storedChecksums.push(block.idChecksum.toHex());
      }

      // getRandomBlocks should return checksums from the global store
      const result = await store.getRandomBlocks(3);

      expect(result.length).toBeLessThanOrEqual(3);
      expect(result.length).toBeGreaterThan(0);

      // Every returned checksum should be one we stored
      for (const checksum of result) {
        expect(storedChecksums).toContain(checksum.toHex());
      }
    });

    it('should return empty array when global store is empty', async () => {
      const store = new MemoryBlockStore(BlockSize.Small);
      const result = await store.getRandomBlocks(5);
      expect(result).toEqual([]);
    });

    it('should cap results to available blocks when requesting more than stored', async () => {
      const blockSize = BlockSize.Small;
      const store = new MemoryBlockStore(blockSize);

      // Store exactly 2 blocks
      for (let i = 0; i < 2; i++) {
        const data = new Uint8Array(blockSize);
        crypto.getRandomValues(data);
        const block = new RawDataBlock(blockSize, data);
        await store.put(block.idChecksum, data);
      }

      const result = await store.getRandomBlocks(10);
      expect(result.length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 8.2: dataStreamToPlaintextTuplesAndCBL without poolOptions
  // ---------------------------------------------------------------------------

  describe('Requirement 8.2: TupleService without poolOptions', () => {
    it('should create tuples without poolOptions using makeTupleFromSourceXor', async () => {
      const blockSize = BlockSize.Message;
      const tupleService = ServiceProvider.getInstance().tupleService;
      const eciesService = ServiceProvider.getInstance().eciesService;
      const checksumService = ServiceProvider.getInstance().checksumService;
      const creator = Member.newMember(
        eciesService,
        MemberType.User,
        'test-user',
        new EmailString('test@example.com'),
      ).member;

      // Create a padded source block
      const paddedData = new Uint8Array(blockSize);
      crypto.getRandomValues(paddedData);
      const { EphemeralBlock } = await import('./blocks/ephemeral');
      const { BlockType } = await import('./enumerations/blockType');
      const { BlockDataType } = await import('./enumerations/blockDataType');

      const sourceBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        paddedData,
        checksumService.calculateChecksum(paddedData),
        creator,
      );

      const whiteners: WhitenedBlock[] = [];
      const randomBlocks = [
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
      ];

      // makeTupleFromSourceXor is the core tuple creation — no poolOptions involved
      const tuple = await tupleService.makeTupleFromSourceXor(
        sourceBlock,
        whiteners,
        randomBlocks,
      );

      // Verify tuple was created with no pool scoping
      expect(tuple).toBeDefined();
      expect(tuple.blocks.length).toBe(TUPLE.SIZE);
      expect(tuple.poolId).toBeUndefined();
    });

    it('should create InMemoryBlockTuple without poolId in legacy mode', () => {
      const blockSize = BlockSize.Message;

      const blocks = [
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
      ];

      // Legacy construction — no poolId parameter
      const tuple = new InMemoryBlockTuple(blocks);

      expect(tuple).toBeDefined();
      expect(tuple.blocks.length).toBe(TUPLE.SIZE);
      expect(tuple.poolId).toBeUndefined();
    });

    it('should not apply pool validation when poolOptions is undefined', () => {
      // Verify that TuplePoolOptions with undefined poolId does not trigger validation
      // by constructing InMemoryBlockTuple with explicit undefined poolId
      const blockSize = BlockSize.Message;

      const blocks = [
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
      ];

      // Passing undefined poolId — same as omitting it
      const tuple = new InMemoryBlockTuple(blocks, undefined);

      expect(tuple.poolId).toBeUndefined();
      expect(tuple.blocks.length).toBe(TUPLE.SIZE);
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 8.3: BlockHandleTuple without poolId with mixed-pool handles
  // ---------------------------------------------------------------------------

  describe('Requirement 8.3: BlockHandleTuple without poolId', () => {
    it('should accept mixed-pool handles when no poolId is specified', () => {
      const blockSize = BlockSize.Small;
      const checksumService = ServiceProvider.getInstance().checksumService;

      const handles: BlockHandle<RawDataBlock>[] = [];
      const pools = ['pool-alpha', 'pool-beta', undefined];

      for (let i = 0; i < TUPLE.SIZE; i++) {
        const data = new Uint8Array(blockSize);
        crypto.getRandomValues(data);
        const checksum = checksumService.calculateChecksum(data);
        const handle = createBlockHandle<RawDataBlock>(
          RawDataBlock,
          blockSize,
          data,
          checksum,
        );
        handle.poolId = pools[i % pools.length];
        handles.push(handle);
      }

      // Constructing WITHOUT poolId should succeed — only block sizes are validated
      const tuple = new BlockHandleTuple(handles);

      expect(tuple).toBeInstanceOf(BlockHandleTuple);
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
      expect(tuple.poolId).toBeUndefined();
    });

    it('should validate only block sizes when no poolId is specified', () => {
      const checksumService = ServiceProvider.getInstance().checksumService;

      // Create handles with DIFFERENT block sizes — should fail on size validation
      const handles: BlockHandle<RawDataBlock>[] = [];
      const sizes = [BlockSize.Message, BlockSize.Message, BlockSize.Tiny];

      for (let i = 0; i < TUPLE.SIZE; i++) {
        const size = sizes[i];
        const data = new Uint8Array(size);
        crypto.getRandomValues(data);
        const checksum = checksumService.calculateChecksum(data);
        const handle = createBlockHandle<RawDataBlock>(
          RawDataBlock,
          size,
          data,
          checksum,
        );
        handle.poolId = 'same-pool';
        handles.push(handle);
      }

      // Should throw due to block size mismatch, NOT pool mismatch
      expect(() => new BlockHandleTuple(handles)).toThrow();
    });

    it('should accept handles with no poolId set at all (fully legacy)', () => {
      const blockSize = BlockSize.Small;
      const checksumService = ServiceProvider.getInstance().checksumService;

      const handles: BlockHandle<RawDataBlock>[] = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        const data = new Uint8Array(blockSize);
        crypto.getRandomValues(data);
        const checksum = checksumService.calculateChecksum(data);
        const handle = createBlockHandle<RawDataBlock>(
          RawDataBlock,
          blockSize,
          data,
          checksum,
        );
        // Do NOT set poolId — simulating fully legacy handles
        handles.push(handle);
      }

      const tuple = new BlockHandleTuple(handles);

      expect(tuple).toBeInstanceOf(BlockHandleTuple);
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
      expect(tuple.poolId).toBeUndefined();

      // All handles should have undefined poolId
      for (const handle of tuple.handles) {
        expect(handle.poolId).toBeUndefined();
      }
    });
  });
});
