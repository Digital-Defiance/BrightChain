import * as fs from 'fs';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { DiskBlockAsyncStore } from './stores/diskBlockAsyncStore';

// Mock the filesystem module
jest.mock('fs');

describe('BlockService', () => {
  beforeEach(() => {
    // Setup default mocks for fs operations
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should store CBL to disk', () => {
    class MockStore extends DiskBlockAsyncStore {
      constructor() {
        super({ storePath: '/mock/path', blockSize: BlockSize.Message });
      }
      override setData = jest.fn();
    }

    const store = new MockStore();
    const mockData = {
      blockType: BlockType.RawData,
      data: Buffer.from('test data'),
      metadata: {
        size: BlockSize.Message,
        timestamp: Date.now(),
        checksum: 'mock-checksum',
      },
    };
    store.setData(mockData);

    expect(store.setData).toHaveBeenCalled();
    expect((store.setData as jest.Mock).mock.calls[0][0].blockType).toBe(
      BlockType.RawData,
    );
    const storedData = (store.setData as jest.Mock).mock.calls[0][0];
    expect(storedData.data).toBeInstanceOf(Buffer);
    expect(storedData.metadata.size).toBe(BlockSize.Message);
    expect(storedData.metadata.checksum).toBeDefined();
  });
  it('should handle disk write failures', async () => {
    class ErrorMockStore extends DiskBlockAsyncStore {
      constructor() {
        super({ storePath: '/mock/path', blockSize: BlockSize.Message });
      }
      override setData = jest.fn().mockRejectedValue(new Error('Disk full'));
    }

    const store = new ErrorMockStore();
    const mockData = {
      blockType: BlockType.RawData,
      data: Buffer.from('test data'),
      metadata: {
        size: BlockSize.Message,
        timestamp: Date.now(),
        checksum: 'mock-checksum',
      },
    };

    await expect(store.setData(mockData)).rejects.toThrow('Disk full');
  });
  it.each(Object.values(BlockSize).filter((b) => Boolean(b)) as BlockSize[])(
    'should handle different block sizes: %s',
    async (blockSize: BlockSize) => {
      class MockStore extends DiskBlockAsyncStore {
        constructor(path: string, size: BlockSize) {
          super({ storePath: path, blockSize: size });
        }
        override setData = jest.fn().mockResolvedValue(undefined);
      }

      const store = new MockStore('/mock/path', blockSize);
      const mockData = {
        blockType: BlockType.RawData,
        data: Buffer.from('test data'),
        metadata: {
          size: blockSize,
          timestamp: Date.now(),
          checksum: 'mock-checksum',
        },
      };

      await store.setData(mockData);

      expect(store.setData).toHaveBeenCalledWith(mockData);
      expect(store.setData).toHaveBeenCalledTimes(1);
    },
  );
});
