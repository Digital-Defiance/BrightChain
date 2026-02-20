import { BlockSize } from '../enumerations/blockSize';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { MemoryBlockStore } from '../stores/memoryBlockStore';
import { BlockStoreFactory } from './blockStoreFactory';

describe('BlockStoreFactory', () => {
  afterEach(() => {
    BlockStoreFactory.clearDiskStoreFactory();
  });

  describe('createMemoryStore', () => {
    it('should return a MemoryBlockStore', () => {
      const store = BlockStoreFactory.createMemoryStore({
        blockSize: BlockSize.Small,
      });
      expect(store).toBeInstanceOf(MemoryBlockStore);
      expect(store.blockSize).toBe(BlockSize.Small);
    });
  });

  describe('createDiskStore', () => {
    it('should fall back to MemoryBlockStore when no factory is registered', () => {
      const store = BlockStoreFactory.createDiskStore({
        storePath: '/tmp/test',
        blockSize: BlockSize.Small,
      });
      expect(store).toBeInstanceOf(MemoryBlockStore);
      expect(store.blockSize).toBe(BlockSize.Small);
    });

    it('should use the registered factory when one is provided', () => {
      const mockStore: IBlockStore = {
        blockSize: BlockSize.Medium,
      } as IBlockStore;

      BlockStoreFactory.registerDiskStoreFactory(() => mockStore);

      const store = BlockStoreFactory.createDiskStore({
        storePath: '/tmp/test',
        blockSize: BlockSize.Medium,
      });
      expect(store).toBe(mockStore);
    });

    it('should pass config to the registered factory', () => {
      const factoryFn = jest.fn().mockReturnValue({
        blockSize: BlockSize.Large,
      } as IBlockStore);

      BlockStoreFactory.registerDiskStoreFactory(factoryFn);

      BlockStoreFactory.createDiskStore({
        storePath: '/data/blocks',
        blockSize: BlockSize.Large,
      });

      expect(factoryFn).toHaveBeenCalledWith({
        storePath: '/data/blocks',
        blockSize: BlockSize.Large,
      });
    });
  });

  describe('clearDiskStoreFactory', () => {
    it('should revert to fallback after clearing', () => {
      const mockStore = { blockSize: BlockSize.Small } as IBlockStore;
      BlockStoreFactory.registerDiskStoreFactory(() => mockStore);

      // Registered factory is active
      expect(
        BlockStoreFactory.createDiskStore({
          storePath: '/tmp/test',
          blockSize: BlockSize.Small,
        }),
      ).toBe(mockStore);

      // Clear and verify fallback
      BlockStoreFactory.clearDiskStoreFactory();
      const store = BlockStoreFactory.createDiskStore({
        storePath: '/tmp/test',
        blockSize: BlockSize.Small,
      });
      expect(store).toBeInstanceOf(MemoryBlockStore);
    });
  });
});
