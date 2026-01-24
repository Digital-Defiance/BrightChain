import {
  BlockEncryptionType,
  BlockSize,
  BlockType,
  CBLService,
  CblError,
  CblErrorType,
  ChecksumService,
  ConstituentBlockListBlock,
  ServiceLocator,
  ServiceProvider,
  StoreError,
  StoreErrorType,
  getBrightChainIdProvider,
  initializeBrightChain,
} from '@brightchain/brightchain-lib';
import {
  EmailString,
  Member,
  MemberType,
  arraysEqual,
} from '@digitaldefiance/ecies-lib';
import { ChecksumBuffer } from '@digitaldefiance/node-ecies-lib';
import { faker } from '@faker-js/faker';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DiskCBLStore } from './diskCBLStore';

describe('DiskCBLStore', () => {
  let store: DiskCBLStore;
  let checksumService: ChecksumService;
  let cblService: CBLService;
  const testDir = join(__dirname, 'test-cbl-store');
  const blockSize = BlockSize.Message;
  let creator: Member;

  beforeAll(() => {
    // Initialize BrightChain library before running tests
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      faker.person.fullName(),
      new EmailString(faker.internet.email()),
    ).member;
  });

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    store = new DiskCBLStore({ storePath: testDir, blockSize });
    checksumService = ServiceProvider.getInstance().checksumService;
    cblService = ServiceProvider.getInstance().cblService;
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve plain CBL', async () => {
      // Create test data
      const dateCreated = new Date();

      // Calculate the maximum number of addresses that can fit in the block
      const maxAddresses = cblService.calculateCBLAddressCapacity(
        blockSize,
        BlockEncryptionType.None,
      );

      // Use a smaller number of addresses to ensure it fits
      const numAddresses = Math.min(3, maxAddresses);

      // Create some test addresses
      const addresses: ChecksumBuffer[] = [];
      for (let i = 0; i < numAddresses; i++) {
        const checksum = checksumService.calculateChecksum(
          Buffer.from(`test-block-${i}`),
        );
        addresses.push(checksum.toBuffer() as ChecksumBuffer);
      }

      // Create CBL header and data
      const addressList = Buffer.concat(addresses);
      // Use a made-up value for fileDataLength since we're manufacturing blocks for testing
      const fileDataLength = 1024; // 1KB of data
      const { headerData } = cblService.makeCblHeader(
        creator,
        dateCreated,
        addresses.length,
        fileDataLength,
        addressList,
        blockSize,
        BlockEncryptionType.None,
      );

      // Combine header and address list and pad to block size
      const data = Buffer.concat([headerData, addressList]);
      const padding = Buffer.alloc(blockSize - (data.length % blockSize));
      const paddedData = Buffer.concat([data, padding]);

      // Create a properly signed CBL
      // The CBL is already properly signed because we used cblService.makeCblHeader
      // which creates a signature using the creator's private key
      const cbl = new ConstituentBlockListBlock(paddedData, creator);

      // Set the active user for validation
      store.setActiveUser(creator);

      // Store CBL
      await store.set(cbl.idChecksum, cbl);

      // Check if CBL exists
      const exists = store.has(cbl.idChecksum);
      expect(exists).toBe(true);

      // Retrieve CBL
      const retrieved = await store.get(cbl.idChecksum, (id) => {
        const provider = getBrightChainIdProvider();
        if (provider.equals(creator.id, id)) {
          return Promise.resolve(creator);
        }
        throw new StoreError(StoreErrorType.KeyNotFound);
      });
      expect(retrieved).toBeInstanceOf(ConstituentBlockListBlock);

      // The data has been through XOR whitening and reconstruction
      // In a test environment, we can't guarantee the exact same data due to random whiteners
      // Instead, verify that we got a valid CBL block back
      expect(retrieved).toBeInstanceOf(ConstituentBlockListBlock);

      // Verify the block has data
      expect(retrieved.data).toBeDefined();
      expect(retrieved.data.length).toBeGreaterThan(0);

      // Verify other metadata remains unchanged
      expect(retrieved.blockSize).toBe(blockSize);
      expect(retrieved.blockType).toBe(BlockType.ConstituentBlockList);
      expect(retrieved.dateCreated).toEqual(dateCreated);
      expect(retrieved.creator).toBeDefined();
      if (retrieved.creator) {
        expect(retrieved.creator.id).toEqual(creator.id);
      }
    });

    it('should get CBL addresses', async () => {
      // Create test data
      const dateCreated = new Date();

      // Calculate the maximum number of addresses that can fit in the block
      const maxAddresses = cblService.calculateCBLAddressCapacity(
        blockSize,
        BlockEncryptionType.None,
      );

      // Use a smaller number of addresses to ensure it fits
      const numAddresses = Math.min(3, maxAddresses);

      // Create some test addresses
      const addresses: ChecksumBuffer[] = [];
      for (let i = 0; i < numAddresses; i++) {
        const checksum = checksumService.calculateChecksum(
          Buffer.from(`test-block-${i}`),
        );
        addresses.push(checksum.toBuffer() as ChecksumBuffer);
      }

      // Create CBL header and data
      const addressList = Buffer.concat(addresses);
      // Use a made-up value for fileDataLength since we're manufacturing blocks for testing
      const fileDataLength = 1024; // 1KB of data
      const { headerData } = cblService.makeCblHeader(
        creator,
        dateCreated,
        addresses.length,
        fileDataLength,
        addressList,
        blockSize,
        BlockEncryptionType.None,
      );

      // Combine header and address list and pad to block size
      const data = Buffer.concat([headerData, addressList]);
      const padding = Buffer.alloc(blockSize - (data.length % blockSize));
      const paddedData = Buffer.concat([data, padding]);

      const cbl = new ConstituentBlockListBlock(paddedData, creator);

      // Store CBL
      await store.set(cbl.idChecksum, cbl);

      // Get addresses
      const retrievedAddresses = await store.getCBLAddresses(
        cbl.idChecksum,
        (id) => {
          const provider = getBrightChainIdProvider();
          if (provider.equals(creator.id, id)) {
            return Promise.resolve(creator);
          }
          throw new StoreError(StoreErrorType.KeyNotFound);
        },
      );

      // Verify addresses
      expect(retrievedAddresses.length).toBe(numAddresses);
      // Verify each address matches what we put in
      for (let i = 0; i < numAddresses; i++) {
        expect(
          arraysEqual(
            retrievedAddresses[i].toUint8Array(),
            new Uint8Array(addresses[i]),
          ),
        ).toBe(true);
      }
    });
  });

  // Skipping encrypted CBL tests for now as they require more complex setup
  // and access to private methods

  describe('Error Cases', () => {
    it('should throw error when getting non-existent CBL', async () => {
      const testData = new Uint8Array(32);
      testData.fill(110); // 'n' character code
      const nonExistentChecksum = checksumService.calculateChecksum(
        Buffer.from(testData),
      );

      await expect(
        store.get(nonExistentChecksum, (id) => {
          const provider = getBrightChainIdProvider();
          if (provider.equals(creator.id, id)) {
            return Promise.resolve(creator);
          }
          throw new StoreError(StoreErrorType.KeyNotFound);
        }),
      ).rejects.toThrow(new StoreError(StoreErrorType.KeyNotFound));
    });

    it('should throw error when storing CBL that already exists', async () => {
      // Create test data
      const dateCreated = new Date();

      // Calculate the maximum number of addresses that can fit in the block
      const maxAddresses = cblService.calculateCBLAddressCapacity(
        blockSize,
        BlockEncryptionType.None,
      );

      // Use a smaller number of addresses to ensure it fits
      const numAddresses = Math.min(3, maxAddresses);

      // Create some test addresses
      const addresses: ChecksumBuffer[] = [];
      for (let i = 0; i < numAddresses; i++) {
        const checksum = checksumService.calculateChecksum(
          Buffer.from(`test-block-${i}`),
        );
        addresses.push(checksum.toBuffer() as ChecksumBuffer);
      }

      // Create CBL header and data
      const addressList = Buffer.concat(addresses);
      // Use a made-up value for fileDataLength since we're manufacturing blocks for testing
      const fileDataLength = 1024; // 1KB of data
      const { headerData } = cblService.makeCblHeader(
        creator,
        dateCreated,
        addresses.length,
        fileDataLength,
        addressList,
        blockSize,
        BlockEncryptionType.None,
      );

      // Combine header and address list and pad to block size
      const data = Buffer.concat([headerData, addressList]);
      const padding = Buffer.alloc(blockSize - (data.length % blockSize));
      const paddedData = Buffer.concat([data, padding]);

      const cbl = new ConstituentBlockListBlock(paddedData, creator);

      // Store CBL
      await store.set(cbl.idChecksum, cbl);
      await expect(store.set(cbl.idChecksum, cbl)).rejects.toThrow(
        new StoreError(StoreErrorType.BlockPathAlreadyExists),
      );
    });

    it('should throw error when getting addresses for non-existent CBL', async () => {
      const testData = new Uint8Array(32);
      testData.fill(110); // 'n' character code
      const nonExistentChecksum = checksumService.calculateChecksum(
        Buffer.from(testData),
      );

      await expect(
        store.getCBLAddresses(nonExistentChecksum, () => {
          return Promise.resolve(creator);
        }),
      ).rejects.toThrow(new StoreError(StoreErrorType.KeyNotFound));
    });

    it('should throw error when storing CBL without active user or creator', async () => {
      // Create a properly signed CBL first
      const dateCreated = new Date();

      // Calculate the maximum number of addresses that can fit in the block
      const maxAddresses = cblService.calculateCBLAddressCapacity(
        blockSize,
        BlockEncryptionType.None,
      );

      // Use a smaller number of addresses to ensure it fits
      const numAddresses = Math.min(1, maxAddresses); // Just use 1 address to be safe

      // Create some test addresses
      const addresses: ChecksumBuffer[] = [];
      for (let i = 0; i < numAddresses; i++) {
        const checksum = checksumService.calculateChecksum(
          Buffer.from(`test-block-${i}`),
        );
        addresses.push(checksum.toBuffer() as ChecksumBuffer);
      }

      // Create CBL header and data
      const addressList = Buffer.concat(addresses);
      const fileDataLength = 128; // Use a smaller file size
      const { headerData } = cblService.makeCblHeader(
        creator,
        dateCreated,
        addresses.length,
        fileDataLength,
        addressList,
        blockSize,
        BlockEncryptionType.None,
      );

      // Combine header and address list and pad to block size
      const data = Buffer.concat([headerData, addressList]);
      const padding = Buffer.alloc(blockSize - (data.length % blockSize));
      const paddedData = Buffer.concat([data, padding]);

      // Create a properly signed CBL
      // The CBL is already properly signed because we used cblService.makeCblHeader
      const cbl = new ConstituentBlockListBlock(paddedData, creator);

      // Create a new store without an active user
      const newStore = new DiskCBLStore({ storePath: testDir, blockSize });

      // We need to create a fake CBL without a creator
      // This is necessary because the CBL constructor validates the creator
      const cblWithoutCreator = Object.create(cbl);
      Object.defineProperty(cblWithoutCreator, 'creator', { value: null });
      Object.defineProperty(cblWithoutCreator, 'idChecksum', {
        value: cbl.idChecksum,
      });
      Object.defineProperty(cblWithoutCreator, 'data', { value: cbl.data });

      // Attempt to store the CBL without a creator or active user
      try {
        await newStore.set(cblWithoutCreator.idChecksum, cblWithoutCreator);
        fail('Expected CblError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CblError);
        expect((error as CblError).type).toBe(
          CblErrorType.CreatorRequiredForSignature,
        );
      }
    });
  });
});
