import {
  BlockHandle,
  BlockHandleTuple,
  BlockSize,
  Checksum,
  HandleTupleError,
  RawDataBlock,
  ServiceProvider,
  TUPLE,
} from '@brightchain/brightchain-lib';

// Simple in-memory block handle for testing
interface TestBlockHandle {
  blockId: Checksum;
  idChecksum: Checksum;
  blockSize: BlockSize;
  data: Uint8Array;
  canRead: boolean;
  canPersist: boolean;
}

describe('BlockHandleTuple (browser)', () => {
  const defaultBlockSize = BlockSize.Message;

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  const createTestHandle = (
    data?: Uint8Array,
    blockSize: BlockSize = defaultBlockSize,
  ): TestBlockHandle => {
    const checksumService = ServiceProvider.getInstance().checksumService;
    const blockData =
      data || new Uint8Array(blockSize).fill(Math.random() * 255);
    const checksum = checksumService.calculateChecksum(blockData);

    return {
      blockId: checksum,
      idChecksum: checksum,
      blockSize,
      data: blockData,
      canRead: true,
      canPersist: true,
    };
  };

  describe('constructor', () => {
    it('should construct with valid handles', () => {
      const handles = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());

      const tuple = new BlockHandleTuple(
        handles as unknown as BlockHandle<RawDataBlock>[],
      );
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
    });

    it('should reject invalid tuple size', () => {
      const handles = Array(TUPLE.SIZE - 1)
        .fill(null)
        .map(() => createTestHandle());

      expect(
        () =>
          new BlockHandleTuple(
            handles as unknown as BlockHandle<RawDataBlock>[],
          ),
      ).toThrow(HandleTupleError);
    });

    it('should reject mismatched block sizes', () => {
      const handles = [
        createTestHandle(new Uint8Array(BlockSize.Message), BlockSize.Message),
        createTestHandle(new Uint8Array(BlockSize.Message), BlockSize.Message),
        createTestHandle(new Uint8Array(BlockSize.Tiny), BlockSize.Tiny), // Different size
      ];

      expect(
        () =>
          new BlockHandleTuple(
            handles as unknown as BlockHandle<RawDataBlock>[],
          ),
      ).toThrow(HandleTupleError);
    });
  });

  describe('basic functionality', () => {
    it('should provide access to handles and block IDs', () => {
      const handles = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());

      const tuple = new BlockHandleTuple(
        handles as unknown as BlockHandle<RawDataBlock>[],
      );

      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
      expect(tuple.blockIds).toHaveLength(TUPLE.SIZE);

      // Verify block IDs match handle IDs
      tuple.handles.forEach((handle, index) => {
        expect(tuple.blockIds[index]).toBe(handles[index].blockId);
      });
    });
  });
});
