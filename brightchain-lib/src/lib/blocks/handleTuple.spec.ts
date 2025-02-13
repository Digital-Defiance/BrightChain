import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs';
import { BlockMetadata } from '../blockMetadata';
import { TUPLE } from '../constants';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import BlockType from '../enumerations/blockType';
import { HandleTupleError } from '../errors/handleTupleError';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { BlockHandle } from './handle';
import { BlockHandleTuple } from './handleTuple';
import { RawDataBlock } from './rawData';
import { BlockServices } from './services';

describe('BlockHandleTuple', () => {
  let checksumService: ChecksumService;
  let stores: Map<BlockSize, DiskBlockAsyncStore>;
  const defaultBlockSize = BlockSize.Message;

  beforeEach(() => {
    checksumService = ServiceProvider.getChecksumService();
    BlockServices.setChecksumService(checksumService);
    stores = new Map();
    // Initialize stores for each block size we'll use
    [BlockSize.Message, BlockSize.Tiny, BlockSize.Small].forEach((size) => {
      stores.set(
        size,
        new DiskBlockAsyncStore(`/tmp/brightchain-${size}`, size),
      );
    });
  });

  afterEach(() => {
    BlockServices.setChecksumService(undefined);
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

  const createTestHandle = (
    data?: Buffer,
    blockSize: BlockSize = defaultBlockSize,
  ): BlockHandle => {
    const block = createTestBlock(data, blockSize);
    const store = stores.get(blockSize)!;
    store.setData(block);
    return store.get(block.idChecksum);
  };

  describe('constructor', () => {
    it('should construct with valid handles', () => {
      const handles = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());
      const tuple = new BlockHandleTuple(handles);
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
      expect(tuple.blockIds).toHaveLength(TUPLE.SIZE);
    });

    it('should reject invalid tuple size', () => {
      const handles = Array(TUPLE.SIZE - 1)
        .fill(null)
        .map(() => createTestHandle());
      expect(() => new BlockHandleTuple(handles)).toThrow(HandleTupleError);
    });

    it('should reject mismatched block sizes', () => {
      // Create handles with different block sizes
      const handles = [
        createTestHandle(randomBytes(BlockSize.Message), BlockSize.Message), // 512B
        createTestHandle(randomBytes(BlockSize.Message), BlockSize.Message), // Same size
        createTestHandle(randomBytes(BlockSize.Tiny), BlockSize.Tiny), // 1KB - different size
      ];
      expect(() => new BlockHandleTuple(handles)).toThrow(HandleTupleError);
    });
  });

  describe('XOR operations', () => {
    it('should XOR blocks correctly', async () => {
      const data1 = randomBytes(defaultBlockSize);
      const data2 = randomBytes(defaultBlockSize);
      const data3 = randomBytes(defaultBlockSize);

      const handles = [
        createTestHandle(data1),
        createTestHandle(data2),
        createTestHandle(data3),
      ];

      const tuple = new BlockHandleTuple(handles);
      const metadata = new BlockMetadata(
        defaultBlockSize,
        BlockType.RawData,
        BlockDataType.RawData,
        defaultBlockSize,
        new Date(),
      );

      const resultHandle = await tuple.xor(
        stores.get(defaultBlockSize)!,
        metadata,
      );

      // Verify XOR result
      const expectedData = Buffer.alloc(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = data1[i] ^ data2[i] ^ data3[i];
      }

      expect(resultHandle.data).toEqual(expectedData);
    });

    it('should reject XOR with no blocks', async () => {
      const handles: BlockHandle[] = [];
      const tuple = new BlockHandleTuple(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() => createTestHandle()),
      );

      // Clear the handles array
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

      await expect(
        tuple.xor(stores.get(defaultBlockSize)!, metadata),
      ).rejects.toThrow(HandleTupleError);
    });
  });

  describe('verification', () => {
    it('should verify valid blocks', async () => {
      const handles = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());
      const tuple = new BlockHandleTuple(handles);
      const isValid = await tuple.verify();
      expect(isValid).toBe(true);
    });

    it('should fail verification with invalid blocks', async () => {
      const handles = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());

      // Corrupt one of the blocks
      // Create a valid block first
      const data = randomBytes(defaultBlockSize);
      const block = createTestBlock(data);
      const store = stores.get(defaultBlockSize)!;
      store.setData(block);
      handles[0] = store.get(block.idChecksum);

      // Now corrupt the data by writing directly to the file
      const corruptedData = Buffer.from(data);
      corruptedData[0] = (corruptedData[0] + 1) % 256;
      // Get the path from the handle since blockPath is protected
      const blockPath = handles[0].path;
      writeFileSync(blockPath, corruptedData);

      const tuple = new BlockHandleTuple(handles);
      const isValid = await tuple.verify();
      expect(isValid).toBe(false);
    });
  });
});
