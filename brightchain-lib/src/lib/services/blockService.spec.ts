import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { ExtendedCBL } from '../blocks/extendedCbl'; // Added import
import { RawDataBlock } from '../blocks/rawData';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockSize } from '../enumerations/blockSize';
import MemberType from '../enumerations/memberType';
import { BlockServiceError } from '../errors/blockServiceError';
// Removed IBlockStore import
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore'; // Added for mock
import { BlockService } from './blockService';
import { ECIESService } from './ecies.service'; // Added
import { ServiceProvider } from './service.provider'; // Added
import { VotingService } from './voting.service'; // Added

// Mock the DiskBlockAsyncStore
jest.mock('../stores/diskBlockAsyncStore');

describe('BlockService', () => {
  let blockService: BlockService;
  let member: BrightChainMember;
  let eciesService: ECIESService;
  let votingService: VotingService;
  let mockStore: jest.Mocked<DiskBlockAsyncStore>; // Use concrete class for mock type

  beforeAll(() => {
    // Get service instances needed for member creation
    eciesService = ServiceProvider.getInstance().eciesService;
    votingService = ServiceProvider.getInstance().votingService;
    // Create member using the correct arguments
    const result = BrightChainMember.newMember(
      eciesService,
      votingService,
      MemberType.User,
      faker.person.fullName(),
      new EmailString(faker.internet.email()),
    );
    member = result.member;
  });

  beforeEach(() => {
    // Reset the static store first to ensure clean state
    BlockService.diskBlockAsyncStore = undefined;

    // Create a mock store instance with correct constructor argument
    mockStore = new DiskBlockAsyncStore({
      blockSize: BlockSize.Small,
      storePath: './mock-test-store',
    }) as jest.Mocked<DiskBlockAsyncStore>; // Use concrete class for mock type

    // Mock methods needed by ingestFile
    mockStore.getRandomBlocks = jest.fn().mockResolvedValue([]);
    mockStore.getData = jest
      .fn()
      .mockResolvedValue(
        new RawDataBlock(BlockSize.Small, randomBytes(BlockSize.Small)),
      ); // Return a dummy block
    mockStore.setData = jest.fn().mockResolvedValue(undefined);
    mockStore.has = jest.fn().mockResolvedValue(false);
    mockStore.deleteData = jest.fn().mockResolvedValue(undefined);

    // Initialize BlockService with the mock store
    BlockService.initialize(mockStore);

    // Instantiate BlockService for each test after initialization
    blockService = new BlockService();
  });

  afterEach(() => {
    // Reset mocks and potentially the static store if needed
    jest.clearAllMocks();
    BlockService.diskBlockAsyncStore = undefined; // Clean up static store
  });

  describe('Instance Methods', () => {
    describe('createCBL', () => {
      it('should create a CBL block from an array of blocks', async () => {
        // Use constructor instead of static .new
        const block1 = new RawDataBlock(
          BlockSize.Small,
          randomBytes(BlockSize.Small),
        );
        const block2 = new RawDataBlock(
          BlockSize.Small,
          randomBytes(BlockSize.Small),
        );
        const blocks = [block1, block2];

        // Call the instance method
        const cbl = await blockService.createCBL(blocks, member, blocks.length); // Pass fileDataLength (can be 0 if not relevant)

        expect(cbl).toBeInstanceOf(ConstituentBlockListBlock);
        // Use cblAddressCount instead of blockCount
        expect(cbl.cblAddressCount).toBe(blocks.length);
        // Block size for CBL is determined internally, might not be Small
        // expect(cbl.blockSize).toBe(BlockSize.Small);
        expect(cbl.creatorId.equals(member.id)).toBe(true);
        expect(cbl.addresses.length).toBe(blocks.length);
        expect(cbl.addresses[0].equals(block1.idChecksum)).toBe(true);
        expect(cbl.addresses[1].equals(block2.idChecksum)).toBe(true);
      });

      it('should throw an error if blocks array is empty', async () => {
        // Call the instance method
        await expect(blockService.createCBL([], member, 0)).rejects.toThrow(
          BlockServiceError,
        );
      });

      it('should throw an error if blocks have different sizes', async () => {
        // Use constructor instead of static .new
        const block1 = new RawDataBlock(
          BlockSize.Small,
          randomBytes(BlockSize.Small),
        );
        const block2 = new RawDataBlock(
          BlockSize.Medium,
          randomBytes(BlockSize.Medium),
        );
        // Call the instance method
        await expect(
          blockService.createCBL([block1, block2], member, 2),
        ).rejects.toThrow(BlockServiceError);
      });
    });

    describe('ingestFile', () => {
      it('should ingest a file buffer and create a CBL', async () => {
        const fileSize = BlockSize.Small * 2.5; // Example size
        const fileData = randomBytes(fileSize);
        const creator = member; // Use the member created in beforeAll

        // Mocks are set up in beforeEach

        // Call the instance method
        const cbl = await blockService.ingestFile(
          fileData,
          false, // createECBL = false
          false, // encrypt = false
          creator,
        );

        expect(cbl).toBeInstanceOf(ConstituentBlockListBlock);
        expect(cbl.creatorId.equals(creator.id)).toBe(true);
        // Use originalDataLength instead of fileDataLength
        expect(cbl.originalDataLength).toBe(fileSize);
        // Check if blocks were "stored" (mocked)
        expect(mockStore.setData).toHaveBeenCalled();
      });

      it('should ingest a file buffer and create an ECBL', async () => {
        const fileSize = BlockSize.Small * 1.5;
        const fileData = randomBytes(fileSize);
        const creator = member;
        const filePath = '/tmp/testfile.txt';

        // Mocks are set up in beforeEach
        // Mock methods called by ingestFile if necessary (getMimeType/getFileName are part of BlockService)
        jest
          .spyOn(blockService, 'getMimeType')
          .mockResolvedValue('application/octet-stream');
        // getFileName uses basename, no need to mock directly if filePath is provided

        // Call the instance method
        const ecbl = await blockService.ingestFile(
          fileData,
          true, // createECBL = true
          false, // encrypt = false
          creator,
          undefined, // recipient
          filePath,
        );

        expect(ecbl).toBeInstanceOf(ExtendedCBL); // Check specific type
        // Use type guard to access ExtendedCBL properties
        if (ecbl instanceof ExtendedCBL) {
          expect(ecbl.creatorId.equals(creator.id)).toBe(true);
          expect(ecbl.originalDataLength).toBe(fileSize); // Use originalDataLength
          expect(ecbl.fileName).toBe('testfile.txt');
          expect(ecbl.mimeType).toBe('application/octet-stream');
        } else {
          fail('Expected ecbl to be an instance of ExtendedCBL');
        }
        expect(mockStore.setData).toHaveBeenCalled();
      });

      it('should handle encryption during ingestion', async () => {
        const fileSize = BlockSize.Tiny * 1.2;
        const fileData = randomBytes(fileSize);
        const creator = member;
        // Create another member as recipient using correct arguments
        const { member: recipientMember } = BrightChainMember.newMember(
          eciesService,
          votingService,
          MemberType.User,
          faker.person.fullName(),
          new EmailString(faker.internet.email()),
        );

        // Mocks are set up in beforeEach
        jest
          .spyOn(blockService, 'getMimeType')
          .mockResolvedValue('application/octet-stream');
        // getFileName uses basename, no need to mock directly if filePath is provided

        // Call the instance method
        const cbl = await blockService.ingestFile(
          fileData,
          false, // createECBL = false
          true, // encrypt = true
          creator,
          recipientMember, // recipient
          '/tmp/encrypted.dat',
        );

        expect(cbl).toBeInstanceOf(ConstituentBlockListBlock);
        // Further checks could involve trying to decrypt, but that's complex for this test
        expect(mockStore.setData).toHaveBeenCalled();
      });
    });

    // Add other instance method tests if needed

    describe('getBlockSizeForData', () => {
      it('should return correct block size for data length', () => {
        expect(blockService.getBlockSizeForData(100)).toBe(BlockSize.Message); // Corrected expectation: 100 bytes fits in Message size
        expect(blockService.getBlockSizeForData(BlockSize.Tiny)).toBe(
          BlockSize.Small,
        );
        expect(blockService.getBlockSizeForData(BlockSize.Small)).toBe(
          BlockSize.Medium,
        );
        expect(blockService.getBlockSizeForData(BlockSize.Medium)).toBe(
          BlockSize.Large,
        );
        expect(blockService.getBlockSizeForData(BlockSize.Large)).toBe(
          BlockSize.Huge,
        );
        expect(blockService.getBlockSizeForData(BlockSize.Huge)).toBe(
          BlockSize.Unknown,
        );
        expect(blockService.getBlockSizeForData(-1)).toBe(BlockSize.Unknown);
      });
    });

    describe('xorBlockWithWhiteners', () => {
      it('should XOR block data correctly', () => {
        const blockData = Buffer.from([0b11110000]);
        const whitener1 = Buffer.from([0b10101010]);
        const whitener2 = Buffer.from([0b00110011]);
        const expected = Buffer.from([0b11110000 ^ 0b10101010 ^ 0b00110011]); // 0b01101001

        const result = blockService.xorBlockWithWhiteners(blockData, [
          whitener1,
          whitener2,
        ]);
        expect(result).toEqual(expected);
      });

      it('should throw error if no whiteners provided', () => {
        const blockData = Buffer.from([1, 2, 3]);
        expect(() => blockService.xorBlockWithWhiteners(blockData, [])).toThrow(
          BlockServiceError,
        );
      });
    });

    // Add tests for determineBlockEncryptionType, isSingleRecipientEncrypted, isMultiRecipientEncrypted, etc.
    // Add tests for getFileLength, getMimeType, getFileName with streams
    // Add tests for streamToBuffer
  });
});
