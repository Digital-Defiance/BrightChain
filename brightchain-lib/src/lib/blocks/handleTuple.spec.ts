import { randomBytes } from 'crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BlockMetadata } from '../blockMetadata';
import { TUPLE } from '../constants';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import { HandleTupleError } from '../errors/handleTupleError';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import {
  BlockHandle,
  BlockHandleType,
  createBlockHandleFromPath,
} from './handle';
import { BlockHandleTuple } from './handleTuple';
import { RawDataBlock } from './rawData';

// Test helper class to expose protected methods for testing
class TestDiskBlockAsyncStore extends DiskBlockAsyncStore {
  public ensureTestBlockPath(blockId: ChecksumBuffer): void {
    this.ensureBlockPath(blockId);
  }

  public getTestBlockPath(blockId: ChecksumBuffer): string {
    return this.blockPath(blockId);
  }

  public async getTestHandle(block: RawDataBlock): Promise<BlockHandle> {
    await this.setData(block);
    return this.get(block.idChecksum);
  }
}

describe('BlockHandleTuple', () => {
  let checksumService: ChecksumService;
  let stores: Map<BlockSize, TestDiskBlockAsyncStore>;
  const defaultBlockSize = BlockSize.Message;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
    stores = new Map();
    // Initialize stores for each block size we'll use
    [BlockSize.Message, BlockSize.Tiny, BlockSize.Small].forEach((size) => {
      const storePath = `/tmp/brightchain-${size}`;
      // Create store directory with proper structure
      const blockSizeDir = join(storePath, size.toString(16).padStart(8, '0'));
      mkdirSync(blockSizeDir, { recursive: true });
      // Create first and second level directories for test blocks
      const firstLevelDir = join(blockSizeDir, '00');
      const secondLevelDir = join(firstLevelDir, '00');
      mkdirSync(secondLevelDir, { recursive: true });
      stores.set(
        size,
        new TestDiskBlockAsyncStore({ storePath, blockSize: size }),
      );
    });
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
    // Clean up test directories
    stores.forEach((_, size) => {
      const storePath = `/tmp/brightchain-${size}`;
      rmSync(storePath, { recursive: true, force: true });
    });
    stores.clear();
  });

  const createTestBlock = (
    data?: Buffer,
    blockSize: BlockSize = defaultBlockSize,
  ): RawDataBlock => {
    const blockData = data || randomBytes(blockSize);
    const checksum = checksumService.calculateChecksum(blockData);
    return new RawDataBlock(
      blockSize,
      blockData,
      new Date(),
      checksum,
      BlockType.RawData,
      BlockDataType.RawData,
      true,
      true,
    );
  };

  const createTestHandle = async (
    data?: Buffer,
    blockSize: BlockSize = defaultBlockSize,
  ): Promise<BlockHandleType<BaseBlock>> => {
    const block = createTestBlock(data, blockSize);
    const store = stores.get(blockSize);
    if (!store) {
      throw new Error(`Store not found for block size ${blockSize}`);
    }
    // Ensure block directory exists
    store.ensureTestBlockPath(block.idChecksum);
    // Get the block path and create the file
    const blockPath = store.getTestBlockPath(block.idChecksum);
    writeFileSync(blockPath, block.data);

    // Use createBlockHandleFromPath directly with proper constructor casting
    const checksumService = ServiceProvider.getInstance().checksumService;
    return await createBlockHandleFromPath(
      checksumService,
      RawDataBlock as unknown as new (...args: unknown[]) => BaseBlock,
      blockPath,
      blockSize,
      block.idChecksum,
      true, // canRead
      true, // canPersist
    );
  };

  describe('constructor', () => {
    it('should construct with valid handles', async () => {
      const promises = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());
      const handles = await Promise.all(promises);
      const tuple = new BlockHandleTuple(handles);
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
      expect(tuple.blockIds).toHaveLength(TUPLE.SIZE);
    });

    it('should reject invalid tuple size', async () => {
      const promises = Array(TUPLE.SIZE - 1)
        .fill(null)
        .map(() => createTestHandle());
      const handles = await Promise.all(promises);
      expect(() => new BlockHandleTuple(handles)).toThrow(HandleTupleError);
    });

    it('should reject mismatched block sizes', async () => {
      // Create handles with different block sizes
      const handle1 = await createTestHandle(
        randomBytes(BlockSize.Message),
        BlockSize.Message,
      ); // 512B
      const handle2 = await createTestHandle(
        randomBytes(BlockSize.Message),
        BlockSize.Message,
      ); // Same size
      const handle3 = await createTestHandle(
        randomBytes(BlockSize.Tiny),
        BlockSize.Tiny,
      ); // 1KB - different size

      expect(() => new BlockHandleTuple([handle1, handle2, handle3])).toThrow(
        HandleTupleError,
      );
    });
  });

  describe('XOR operations', () => {
    it('should XOR blocks correctly', async () => {
      const data1 = randomBytes(defaultBlockSize);
      const data2 = randomBytes(defaultBlockSize);
      const data3 = randomBytes(defaultBlockSize);

      const promises = [
        createTestHandle(data1),
        createTestHandle(data2),
        createTestHandle(data3),
      ];
      const handles = await Promise.all(promises);

      const tuple = new BlockHandleTuple(handles);
      const metadata = new BlockMetadata(
        defaultBlockSize,
        BlockType.RawData,
        BlockDataType.RawData,
        defaultBlockSize,
        new Date(),
      );

      // Get the store and ensure directory exists
      const store = stores.get(defaultBlockSize);
      if (!store) {
        throw new Error(`Store not found for block size ${defaultBlockSize}`);
      }

      // XOR the blocks and get the result
      const xorResult = await tuple.xor(checksumService, store, metadata);

      // Ensure the block path exists
      store.ensureTestBlockPath(xorResult.idChecksum);

      // Get the block path and delete the file if it exists (to avoid BlockPathAlreadyExists error)
      const blockPath = store.getTestBlockPath(xorResult.idChecksum);
      if (existsSync(blockPath)) {
        rmSync(blockPath);
      }

      // Store the result and get a handle
      await store.setData(xorResult);
      const resultHandle = store.get(xorResult.idChecksum);

      // Verify XOR result
      const expectedData = Buffer.alloc(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = data1[i] ^ data2[i] ^ data3[i];
      }

      expect(resultHandle.data).toEqual(expectedData);
    });

    it('should reject XOR with no blocks', async () => {
      // Create a valid set of handles first
      const promises = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());
      const validHandles = await Promise.all(promises);

      const tuple = new BlockHandleTuple(validHandles);

      // Replace handles with empty array
      const handles: BlockHandleType<BaseBlock>[] = [];
      Object.defineProperty(tuple, '_handles', {
        value: handles,
        writable: false,
        enumerable: true,
        configurable: true,
      });

      const metadata = new BlockMetadata(
        defaultBlockSize,
        BlockType.RawData,
        BlockDataType.RawData,
        defaultBlockSize,
        new Date(),
      );

      const store = stores.get(defaultBlockSize);
      if (!store) {
        throw new Error(`Store not found for block size ${defaultBlockSize}`);
      }

      await expect(tuple.xor(checksumService, store, metadata)).rejects.toThrow(
        HandleTupleError,
      );
    });
  });

  describe('verification', () => {
    it('should verify valid blocks', async () => {
      // Create valid test blocks
      const promises = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());
      const handles = await Promise.all(promises);

      // Create tuple with valid blocks
      const tuple = new BlockHandleTuple(handles);

      // Verify the blocks - this should pass since all blocks are valid
      const isValid = await tuple.verify();
      expect(isValid).toBe(true);
    });

    it('should fail verification with invalid blocks', async () => {
      const promises = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());
      const handles = await Promise.all(promises);

      // Create a corrupted block
      const data = randomBytes(defaultBlockSize);
      const block = createTestBlock(data);
      const store = stores.get(defaultBlockSize);
      if (!store) {
        throw new Error(`Store not found for block size ${defaultBlockSize}`);
      }

      // Get the block path
      const blockPath = store.getTestBlockPath(block.idChecksum);

      // Create directory and write corrupted data
      store.ensureTestBlockPath(block.idChecksum);
      const corruptedData = Buffer.from(data);
      corruptedData[0] = (corruptedData[0] + 1) % 256;
      writeFileSync(blockPath, corruptedData);

      // Create handle with the corrupted data using createBlockHandleFromPath
      handles[0] = await createBlockHandleFromPath(
        checksumService,
        RawDataBlock as unknown as new (...args: unknown[]) => BaseBlock,
        blockPath,
        defaultBlockSize,
        block.idChecksum,
        true, // canRead
        true, // canPersist
      );

      const tuple = new BlockHandleTuple(handles);
      const isValid = await tuple.verify();
      expect(isValid).toBe(false);
    });
  });
});
