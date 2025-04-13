import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { TUPLE } from '../constants';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import { HandleTupleError } from '../errors/handleTupleError';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { BlockHandleTuple } from './handleTuple';
import { RawDataBlock } from './rawData';

// Simple in-memory block handle for testing
interface TestBlockHandle {
  blockId: ChecksumUint8Array;
  blockSize: BlockSize;
  data: Uint8Array;
  canRead: boolean;
  canPersist: boolean;
}

describe('BlockHandleTuple', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Message;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  const createTestHandle = (
    data?: Uint8Array,
    blockSize: BlockSize = defaultBlockSize,
  ): TestBlockHandle => {
    const blockData = data || new Uint8Array(blockSize).fill(Math.random() * 255);
    const checksum = checksumService.calculateChecksum(blockData);
    
    return {
      blockId: checksum,
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
      
      const tuple = new BlockHandleTuple(handles as any);
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
    });

    it('should reject invalid tuple size', () => {
      const handles = Array(TUPLE.SIZE - 1)
        .fill(null)
        .map(() => createTestHandle());
      
      expect(() => new BlockHandleTuple(handles as any)).toThrow(HandleTupleError);
    });

    it('should reject mismatched block sizes', () => {
      const handles = [
        createTestHandle(new Uint8Array(BlockSize.Message), BlockSize.Message),
        createTestHandle(new Uint8Array(BlockSize.Message), BlockSize.Message),
        createTestHandle(new Uint8Array(BlockSize.Tiny), BlockSize.Tiny), // Different size
      ];
      
      expect(() => new BlockHandleTuple(handles as any)).toThrow(HandleTupleError);
    });
  });

  describe('basic functionality', () => {
    it('should provide access to handles and block IDs', () => {
      const handles = Array(TUPLE.SIZE)
        .fill(null)
        .map(() => createTestHandle());
      
      const tuple = new BlockHandleTuple(handles as any);
      
      expect(tuple.handles).toHaveLength(TUPLE.SIZE);
      expect(tuple.blockIds).toHaveLength(TUPLE.SIZE);
      
      // Verify block IDs match handle IDs
      tuple.handles.forEach((handle, index) => {
        expect(tuple.blockIds[index]).toBe(handles[index].blockId);
      });
    });
  });
});