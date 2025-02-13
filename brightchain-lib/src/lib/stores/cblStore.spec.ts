import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { TUPLE } from '../constants';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { GuidV4 } from '../guid';
import { CBLService } from '../services/cblService';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';
import { CBLStore } from './cblStore';

describe('CBLStore', () => {
  let store: CBLStore;
  let checksumService: ChecksumService;
  let cblService: CBLService;
  const testDir = join(__dirname, 'test-cbl-store');
  const blockSize = BlockSize.Message;

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    store = new CBLStore({ storePath: testDir, blockSize });
    checksumService = ServiceProvider.getChecksumService();
    cblService = ServiceProvider.getCBLService();
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve plain CBL', async () => {
      // Create test data
      const creatorId = GuidV4.new();
      const dateCreated = new Date();

      // Create some test addresses
      const addresses: ChecksumBuffer[] = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        addresses.push(
          checksumService.calculateChecksum(Buffer.from(`test-block-${i}`)),
        );
      }

      // Create CBL header and data
      const addressList = Buffer.concat(addresses);
      const { headerData } = cblService.makeCblHeader(
        creatorId,
        dateCreated,
        addresses.length,
        blockSize,
        addressList,
        blockSize,
      );

      // Combine header and address list and pad to block size
      const data = Buffer.concat([headerData, addressList]);
      const padding = Buffer.alloc(blockSize - (data.length % blockSize));
      const paddedData = Buffer.concat([data, padding]);
      const checksum = checksumService.calculateChecksum(paddedData);

      const cbl = new ConstituentBlockListBlock(paddedData, creatorId);

      // Store CBL
      await store.set(cbl.idChecksum, cbl);

      // Check if CBL exists
      const exists = store.has(checksum);
      expect(exists).toBe(true);

      // Retrieve CBL
      const retrieved = await store.get(checksum);
      expect(retrieved).toBeInstanceOf(ConstituentBlockListBlock);

      // The data has been through XOR whitening and reconstruction
      // Verify the checksum matches to ensure data integrity
      const retrievedChecksum = checksumService.calculateChecksum(
        retrieved.data,
      );
      expect(retrievedChecksum).toEqual(checksum);

      // Verify other metadata remains unchanged
      expect(retrieved.blockSize).toBe(blockSize);
      expect(retrieved.blockType).toBe(BlockType.ConstituentBlockList);
      expect(retrieved.dateCreated).toEqual(dateCreated);
      expect(retrieved.creatorId).toEqual(creatorId);
    });

    it('should get CBL addresses', async () => {
      // Create test data
      const creatorId = GuidV4.new();
      const dateCreated = new Date();

      // Create some test addresses
      const addresses: ChecksumBuffer[] = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        addresses.push(
          checksumService.calculateChecksum(Buffer.from(`test-block-${i}`)),
        );
      }

      // Create CBL header and data
      const addressList = Buffer.concat(addresses);
      const { headerData } = cblService.makeCblHeader(
        creatorId,
        dateCreated,
        addresses.length,
        blockSize,
        addressList,
        blockSize,
      );

      // Combine header and address list and pad to block size
      const data = Buffer.concat([headerData, addressList]);
      const padding = Buffer.alloc(blockSize - (data.length % blockSize));
      const paddedData = Buffer.concat([data, padding]);
      const checksum = checksumService.calculateChecksum(paddedData);

      const cbl = new ConstituentBlockListBlock(paddedData, creatorId);

      // Store CBL
      await store.set(cbl.idChecksum, cbl);

      // Get addresses
      const retrievedAddresses = store.getCBLAddresses(checksum);
      // Should be a multiple of TUPLE.SIZE (original block + whiteners + padding)
      expect(retrievedAddresses.length % TUPLE.SIZE).toBe(0);
      expect(retrievedAddresses.length).toBeGreaterThanOrEqual(TUPLE.SIZE);
    });
  });

  describe('Error Cases', () => {
    it('should throw error when getting non-existent CBL', async () => {
      const nonExistentChecksum = checksumService.calculateChecksum(
        Buffer.from('nonexistent'),
      );

      await expect(store.get(nonExistentChecksum)).rejects.toThrow(
        new StoreError(StoreErrorType.KeyNotFound),
      );
    });

    it('should throw error when storing CBL that already exists', async () => {
      // Create test data
      const creatorId = GuidV4.new();
      const dateCreated = new Date();

      // Create some test addresses
      const addresses: ChecksumBuffer[] = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        addresses.push(
          checksumService.calculateChecksum(Buffer.from(`test-block-${i}`)),
        );
      }

      // Create CBL header and data
      const addressList = Buffer.concat(addresses);
      const { headerData } = cblService.makeCblHeader(
        creatorId,
        dateCreated,
        addresses.length,
        blockSize,
        addressList,
        blockSize,
      );

      // Combine header and address list and pad to block size
      const data = Buffer.concat([headerData, addressList]);
      const padding = Buffer.alloc(blockSize - (data.length % blockSize));
      const paddedData = Buffer.concat([data, padding]);

      const cbl = new ConstituentBlockListBlock(paddedData, creatorId);

      // Store CBL
      await store.set(cbl.idChecksum, cbl);
      await expect(store.set(cbl.idChecksum, cbl)).rejects.toThrow(
        new StoreError(StoreErrorType.BlockPathAlreadyExists),
      );
    });

    it('should throw error when getting addresses for non-existent CBL', () => {
      const nonExistentChecksum = checksumService.calculateChecksum(
        Buffer.from('nonexistent'),
      );

      expect(() => store.getCBLAddresses(nonExistentChecksum)).toThrow(
        new StoreError(StoreErrorType.KeyNotFound),
      );
    });
  });
});
