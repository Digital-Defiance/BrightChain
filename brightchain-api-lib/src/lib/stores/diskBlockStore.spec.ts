import {
  BlockSize,
  getGlobalServiceProvider,
  initializeBrightChain,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
  StoreError,
} from '@brightchain/brightchain-lib';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DiskBlockStore } from './diskBlockStore';

describe('DiskBlockStore', () => {
  let store: DiskBlockStore;
  let testDir: string;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
    testDir = join(
      tmpdir(),
      `diskblockstore-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    store = new DiskBlockStore({
      storePath: testDir,
      blockSize: BlockSize.Small,
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  function createTestBlock(content?: Uint8Array): RawDataBlock {
    const data = content ?? new Uint8Array(BlockSize.Small);
    // Fill with some non-zero data so checksum is meaningful
    if (!content) {
      for (let i = 0; i < data.length; i++) {
        data[i] = i % 256;
      }
    }
    return new RawDataBlock(BlockSize.Small, data);
  }

  describe('constructor', () => {
    it('should create the store directory if it does not exist', () => {
      const dir = join(testDir, 'nested', 'path');
      new DiskBlockStore({ storePath: dir, blockSize: BlockSize.Small });
      expect(existsSync(dir)).toBe(true);
    });

    it('should throw StoreError if storePath is empty', () => {
      expect(
        () => new DiskBlockStore({ storePath: '', blockSize: BlockSize.Small }),
      ).toThrow(StoreError);
    });

    it('should expose blockSize and storePath', () => {
      expect(store.blockSize).toBe(BlockSize.Small);
      expect(store.storePath).toBe(testDir);
    });
  });

  describe('has()', () => {
    it('should return false for a non-existent block', async () => {
      const checksumService = getGlobalServiceProvider().checksumService;
      const checksum = checksumService.calculateChecksum(
        new Uint8Array([1, 2, 3]),
      );
      expect(await store.has(checksum)).toBe(false);
    });

    it('should return true after storing a block', async () => {
      const block = createTestBlock();
      await store.setData(block);
      expect(await store.has(block.idChecksum)).toBe(true);
    });

    it('should accept string keys', async () => {
      const block = createTestBlock();
      await store.setData(block);
      expect(await store.has(block.idChecksum.toHex())).toBe(true);
    });
  });

  describe('setData() and getData()', () => {
    it('should store and retrieve a block', async () => {
      const block = createTestBlock();
      await store.setData(block);

      const retrieved = await store.getData(block.idChecksum);
      expect(retrieved.data).toEqual(block.data);
    });

    it('should be idempotent — storing the same block twice is a no-op', async () => {
      const block = createTestBlock();
      await store.setData(block);
      await store.setData(block); // Should not throw
      expect(await store.has(block.idChecksum)).toBe(true);
    });

    it('should throw KeyNotFound for non-existent block', async () => {
      const checksumService = getGlobalServiceProvider().checksumService;
      const checksum = checksumService.calculateChecksum(
        new Uint8Array([99, 98, 97]),
      );
      await expect(store.getData(checksum)).rejects.toThrow(StoreError);
    });

    it('should create blocks/ and meta/ directories on first write', async () => {
      const block = createTestBlock();
      await store.setData(block);

      expect(existsSync(join(testDir, 'blocks'))).toBe(true);
      expect(existsSync(join(testDir, 'meta'))).toBe(true);
    });

    it('should store block data at {basePath}/blocks/{checksumHex}', async () => {
      const block = createTestBlock();
      await store.setData(block);

      const expectedPath = join(testDir, 'blocks', block.idChecksum.toHex());
      expect(existsSync(expectedPath)).toBe(true);
    });

    it('should store metadata at {basePath}/meta/{checksumHex}.json', async () => {
      const block = createTestBlock();
      await store.setData(block);

      const expectedPath = join(
        testDir,
        'meta',
        `${block.idChecksum.toHex()}.json`,
      );
      expect(existsSync(expectedPath)).toBe(true);
    });
  });

  describe('deleteData()', () => {
    it('should delete a stored block', async () => {
      const block = createTestBlock();
      await store.setData(block);
      expect(await store.has(block.idChecksum)).toBe(true);

      await store.deleteData(block.idChecksum);
      expect(await store.has(block.idChecksum)).toBe(false);
    });

    it('should throw KeyNotFound when deleting non-existent block', async () => {
      const checksumService = getGlobalServiceProvider().checksumService;
      const checksum = checksumService.calculateChecksum(
        new Uint8Array([42, 43, 44]),
      );
      await expect(store.deleteData(checksum)).rejects.toThrow(StoreError);
    });
  });

  describe('put() and delete()', () => {
    it('should store via put and retrieve via getData', async () => {
      const data = new Uint8Array(BlockSize.Small);
      for (let i = 0; i < data.length; i++) {
        data[i] = (i * 7) % 256;
      }
      const checksumService = getGlobalServiceProvider().checksumService;
      const checksum = checksumService.calculateChecksum(data);

      await store.put(checksum, data);
      const retrieved = await store.getData(checksum);
      expect(retrieved.data).toEqual(data);
    });

    it('should delete via string key', async () => {
      const block = createTestBlock();
      await store.setData(block);
      await store.delete(block.idChecksum.toHex());
      expect(await store.has(block.idChecksum)).toBe(false);
    });
  });

  describe('get() (BlockHandle)', () => {
    it('should return a BlockHandle for a stored block', () => {
      // Store synchronously first via setData
      const block = createTestBlock();
      // We need to store first, so use a sync approach
      const data = block.data;
      const keyHex = block.idChecksum.toHex();

      // Manually create the directories and file for sync get()
      const blocksDir = join(testDir, 'blocks');
      if (!existsSync(blocksDir)) {
        mkdirSync(blocksDir, { recursive: true });
      }
      writeFileSync(join(blocksDir, keyHex), data);

      const handle = store.get(block.idChecksum);
      expect(handle).toBeDefined();
    });

    it('should throw KeyNotFound for non-existent block', () => {
      const checksumService = getGlobalServiceProvider().checksumService;
      const checksum = checksumService.calculateChecksum(
        new Uint8Array([10, 20, 30]),
      );
      expect(() => store.get(checksum)).toThrow(StoreError);
    });
  });

  describe('getMetadata() and updateMetadata()', () => {
    it('should return metadata after storing a block', async () => {
      const block = createTestBlock();
      await store.setData(block);

      const meta = await store.getMetadata(block.idChecksum);
      expect(meta).not.toBeNull();
      expect(meta!.blockId).toBe(block.idChecksum.toHex());
      expect(meta!.size).toBe(block.data.length);
    });

    it('should return null for non-existent block metadata', async () => {
      const checksumService = getGlobalServiceProvider().checksumService;
      const checksum = checksumService.calculateChecksum(
        new Uint8Array([5, 6, 7]),
      );
      const meta = await store.getMetadata(checksum);
      expect(meta).toBeNull();
    });

    it('should update metadata', async () => {
      const block = createTestBlock();
      await store.setData(block);

      await store.updateMetadata(block.idChecksum, {
        targetReplicationFactor: 3,
      });

      const meta = await store.getMetadata(block.idChecksum);
      expect(meta!.targetReplicationFactor).toBe(3);
    });

    it('should throw KeyNotFound when updating non-existent metadata', async () => {
      const checksumService = getGlobalServiceProvider().checksumService;
      const checksum = checksumService.calculateChecksum(
        new Uint8Array([8, 9, 10]),
      );
      await expect(
        store.updateMetadata(checksum, { targetReplicationFactor: 1 }),
      ).rejects.toThrow(StoreError);
    });
  });

  describe('getRandomBlocks()', () => {
    it('should return empty array when store is empty', async () => {
      const result = await store.getRandomBlocks(5);
      expect(result).toEqual([]);
    });

    it('should return stored block checksums', async () => {
      const block = createTestBlock();
      await store.setData(block);

      const result = await store.getRandomBlocks(1);
      expect(result.length).toBe(1);
    });
  });

  describe('CBL magnet URL operations', () => {
    it('should generate and parse a magnet URL', () => {
      const b1 = 'a'.repeat(128);
      const b2 = 'b'.repeat(128);
      const url = store.generateCBLMagnetUrl(b1, b2, BlockSize.Small);

      const parsed = store.parseCBLMagnetUrl(url);
      expect(parsed.blockId1).toBe(b1);
      expect(parsed.blockId2).toBe(b2);
      expect(parsed.blockSize).toBe(BlockSize.Small);
      expect(parsed.isEncrypted).toBe(false);
    });

    it('should throw on invalid magnet URL', () => {
      expect(() => store.parseCBLMagnetUrl('not-a-magnet')).toThrow();
    });
  });
});
