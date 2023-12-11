import { BlockSize } from '../enumerations/blockSize';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { MemoryBlockStore } from '../stores/memoryBlockStore';
import { BlockStoreFactory } from './blockStoreFactory';

describe('BlockStoreFactory', () => {
  afterEach(() => {
    BlockStoreFactory.clearDiskStoreFactory();
  });

  describe('createMemoryStore', () => {
    it('should return a MemoryBlockStore with supportedBlockSizes', () => {
      const store = BlockStoreFactory.createMemoryStore({
        supportedBlockSizes: [BlockSize.Small],
      });
      expect(store).toBeInstanceOf(MemoryBlockStore);
      expect(store.supportedBlockSizes).toEqual([BlockSize.Small]);
    });

    it('should support multiple block sizes', () => {
      const store = BlockStoreFactory.createMemoryStore({
        supportedBlockSizes: [BlockSize.Small, BlockSize.Medium],
      });
      expect(store).toBeInstanceOf(MemoryBlockStore);
      expect(store.supportedBlockSizes).toEqual([
        BlockSize.Small,
        BlockSize.Medium,
      ]);
    });
  });

  describe('createDiskStore', () => {
    it('should fall back to MemoryBlockStore when no factory is registered', () => {
      const store = BlockStoreFactory.createDiskStore({
        storePath: '/tmp/test',
        supportedBlockSizes: [BlockSize.Small],
      });
      expect(store).toBeInstanceOf(MemoryBlockStore);
      expect(store.supportedBlockSizes).toEqual([BlockSize.Small]);
    });

    it('should use the registered factory when one is provided', () => {
      const mockStore = {
        supportedBlockSizes: [BlockSize.Medium],
      } as unknown as IBlockStore;

      BlockStoreFactory.registerDiskStoreFactory(() => mockStore);

      const store = BlockStoreFactory.createDiskStore({
        storePath: '/tmp/test',
        supportedBlockSizes: [BlockSize.Medium],
      });
      expect(store).toBe(mockStore);
    });

    it('should pass config to the registered factory', () => {
      const factoryFn = jest.fn().mockReturnValue({
        supportedBlockSizes: [BlockSize.Large],
      } as unknown as IBlockStore);

      BlockStoreFactory.registerDiskStoreFactory(factoryFn);

      BlockStoreFactory.createDiskStore({
        storePath: '/data/blocks',
        supportedBlockSizes: [BlockSize.Large],
      });

      expect(factoryFn).toHaveBeenCalledWith({
        storePath: '/data/blocks',
        supportedBlockSizes: [BlockSize.Large],
      });
    });
  });

  describe('clearDiskStoreFactory', () => {
    it('should revert to fallback after clearing', () => {
      const mockStore = {
        supportedBlockSizes: [BlockSize.Small],
      } as unknown as IBlockStore;
      BlockStoreFactory.registerDiskStoreFactory(() => mockStore);

      // Registered factory is active
      expect(
        BlockStoreFactory.createDiskStore({
          storePath: '/tmp/test',
          supportedBlockSizes: [BlockSize.Small],
        }),
      ).toBe(mockStore);

      // Clear and verify fallback
      BlockStoreFactory.clearDiskStoreFactory();
      const store = BlockStoreFactory.createDiskStore({
        storePath: '/tmp/test',
        supportedBlockSizes: [BlockSize.Small],
      });
      expect(store).toBeInstanceOf(MemoryBlockStore);
    });
  });
});
