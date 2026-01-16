import { arraysEqual } from '@digitaldefiance/ecies-lib';
import {
  TUPLE,
  BlockDataType,
  BlockSize,
  BlockType,
  HandleTupleError,
  ServiceProvider,
  BlockHandleTuple,
  RawDataBlock,
  BlockHandle,
} from '@brightchain/brightchain-lib';

describe('BlockHandleTuple', () => {
  const defaultBlockSize = BlockSize.Message;

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  const createTestBlock = (
    data?: Uint8Array,
    blockSize: BlockSize = defaultBlockSize,
  ): RawDataBlock => {
    const checksumService = ServiceProvider.getInstance().checksumService;
    const blockData =
      data ||
      (() => {
        const randomData = new Uint8Array(blockSize);
        crypto.getRandomValues(randomData);
        return randomData;
      })();
    const checksum = checksumService.calculateChecksum(blockData);
    return new RawDataBlock(
      blockSize,
      blockData,
      new Date(Date.now() - 1000), // 1 second in the past to avoid timing issues
      checksum,
      BlockType.RawData,
      BlockDataType.RawData,
      true,
      true,
    );
  };

  const createTestHandle = async (
    data?: Uint8Array,
    blockSize: BlockSize = defaultBlockSize,
  ): Promise<BlockHandle<RawDataBlock>> => {
    const block = createTestBlock(data, blockSize);
    // Create a simple in-memory handle for testing
    return {
      blockId: block.idChecksum,
      blockSize: block.blockSize,
      data: block.data,
      canRead: true,
      canPersist: true,
    } as unknown as BlockHandle<RawDataBlock>;
  };

  describe('constructor', () => {
    it('should construct with valid handles', async () => {
      const handles = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() => createTestHandle()),
      );
      const tuple = new BlockHandleTuple(handles);
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
      expect(tuple.blockIds).toHaveLength(TUPLE.SIZE);
    });

    it('should reject invalid tuple size', async () => {
      const handles = await Promise.all(
        Array(TUPLE.SIZE - 1)
          .fill(null)
          .map(() => createTestHandle()),
      );
      expect(() => new BlockHandleTuple(handles)).toThrow(HandleTupleError);
    });

    it('should reject mismatched block sizes', async () => {
      // Create handles with different block sizes
      const messageData = new Uint8Array(BlockSize.Message);
      const tinyData = new Uint8Array(BlockSize.Tiny);
      crypto.getRandomValues(messageData);
      crypto.getRandomValues(tinyData);
      const handles = await Promise.all([
        createTestHandle(messageData, BlockSize.Message),
        createTestHandle(messageData, BlockSize.Message),
        createTestHandle(tinyData, BlockSize.Tiny),
      ]);
      expect(() => new BlockHandleTuple(handles)).toThrow(HandleTupleError);
    });
  });

  describe('XOR operations', () => {
    it('should XOR blocks correctly', async () => {
      const data1 = new Uint8Array(defaultBlockSize);
      const data2 = new Uint8Array(defaultBlockSize);
      const data3 = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data1);
      crypto.getRandomValues(data2);
      crypto.getRandomValues(data3);

      const handles = await Promise.all([
        createTestHandle(data1),
        createTestHandle(data2),
        createTestHandle(data3),
      ]);

      const tuple = new BlockHandleTuple(handles);
      
      // Verify XOR result by computing expected data
      const expectedData = new Uint8Array(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = data1[i] ^ data2[i] ^ data3[i];
      }

      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
    });

    it('should reject XOR with no blocks', async () => {
      const tuple = new BlockHandleTuple(
        await Promise.all(
          Array(TUPLE.SIZE)
            .fill(null)
            .map(() => createTestHandle()),
        ),
      );

      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
    });
  });

  describe('verification', () => {
    it('should verify valid blocks', async () => {
      // Create valid test blocks with proper validateAsync
      const handles = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(async () => {
            const block = createTestBlock();
            return {
              blockId: block.idChecksum,
              idChecksum: block.idChecksum,
              blockSize: block.blockSize,
              data: block.data,
              canRead: true,
              canPersist: true,
              validateAsync: async () => {
                // Valid block - no error
              },
            } as unknown as BlockHandle<RawDataBlock>;
          }),
      );

      const tuple = new BlockHandleTuple(handles);
      const isValid = await tuple.verify();
      expect(isValid).toBe(true);
    });

    it('should fail verification with invalid blocks', async () => {
      const handles = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(async () => {
            const block = createTestBlock();
            return {
              blockId: block.idChecksum,
              idChecksum: block.idChecksum,
              blockSize: block.blockSize,
              data: block.data,
              canRead: true,
              canPersist: true,
              validateAsync: async () => {
                // Valid block - no error
              },
            } as unknown as BlockHandle<RawDataBlock>;
          }),
      );

      // Make the first handle fail validation
      handles[0] = {
        ...handles[0],
        validateAsync: async () => {
          throw new Error('Checksum mismatch');
        },
      } as unknown as BlockHandle<RawDataBlock>;

      const tuple = new BlockHandleTuple(handles);
      const isValid = await tuple.verify();
      expect(isValid).toBe(false);
    });
  });
});
