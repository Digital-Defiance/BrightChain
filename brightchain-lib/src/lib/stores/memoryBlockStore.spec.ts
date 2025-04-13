import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import { initializeBrightChain } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { MemoryBlockStore } from './memoryBlockStore';

describe('MemoryBlockStore Browser Tests', () => {
  let blockStore: MemoryBlockStore;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    // Initialize BrightChain with browser-compatible configuration
    initializeBrightChain();
    // Set up the service locator
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    // Initialize BrightChain with browser-compatible configuration
    initializeBrightChain();
    // Set up the service locator
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
    blockStore = new MemoryBlockStore(blockSize);
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Browser-compatible operations', () => {
    it('should store and retrieve blocks using Uint8Array', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      // Create block after service is initialized
      const block = new RawDataBlock(blockSize, data);

      await blockStore.put(block.idChecksum, data);
      const retrieved = await blockStore.getData(block.idChecksum);

      expect(arraysEqual(retrieved.data, data)).toBe(true);
    });

    it('should generate random IDs without Node.js crypto', () => {
      const id1 = MemoryBlockStore.randomId();
      const id2 = MemoryBlockStore.randomId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBe(32); // 16 bytes * 2 hex chars
    });

    it('should handle has/delete operations', async () => {
      const data = new Uint8Array([1, 2, 3]);
      // Create block after service is initialized
      const block = new RawDataBlock(blockSize, data);

      await blockStore.put(block.idChecksum, data);
      expect(await blockStore.has(block.idChecksum)).toBe(true);

      await blockStore.delete(block.idChecksum);
      expect(await blockStore.has(block.idChecksum)).toBe(false);
    });
  });
});
