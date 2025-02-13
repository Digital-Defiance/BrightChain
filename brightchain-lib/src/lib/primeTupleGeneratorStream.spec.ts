import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { BrightChainMember } from './brightChainMember'; // Import the actual class (Jest will mock it)
import { ECIES, TUPLE } from './constants';
import { EmailString } from './emailString'; // Import EmailString
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSize';
import { BlockType } from './enumerations/blockType';
import { MemberType } from './enumerations/memberType'; // Import MemberType
import { StreamErrorType } from './enumerations/streamErrorType';
import { StreamError } from './errors/streamError';
import { PrimeTupleGeneratorStream } from './primeTupleGeneratorStream';
import { ServiceProvider } from './services/service.provider';

// Mock modules
jest.mock('./secureString');
jest.mock('./brightChainMember'); // Keep the mock declaration

// Create mock arguments for the constructor
const mockType = MemberType.User; // Assuming MemberType.User exists
const mockName = 'Mock User';
const mockEmail = new EmailString('mock@example.com');
// Get service instances
const eciesService = ServiceProvider.getInstance().eciesService;
const votingService = ServiceProvider.getInstance().votingService;
const checksumService = ServiceProvider.getInstance().checksumService; // Already present later, but good to have here

// Generate realistic mock keys
const mnemonic = eciesService.generateNewMnemonic(); // Assign directly
const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);
const mockPrivateKey = wallet.getPrivateKey();
const mockPublicKeyWithoutPrefix = wallet.getPublicKey();
const mockPublicKey = Buffer.concat([
  Buffer.from([ECIES.PUBLIC_KEY_MAGIC]), // Add the 0x04 prefix
  mockPublicKeyWithoutPrefix,
]);
// Derive voting public key (private key is not needed for the mock)
const { publicKey: mockVotingPublicKey } =
  votingService.deriveVotingKeysFromECDH(mockPrivateKey, mockPublicKey);

// Create a mock instance of BrightChainMember with required args
// Jest's mock will handle the actual implementation, but TS needs the constructor call to be valid
const mockMemberInstance = new BrightChainMember(
  eciesService, // Pass service instance
  votingService, // Pass service instance
  mockType,
  mockName,
  mockEmail,
  mockPublicKey, // Use generated key
  mockVotingPublicKey, // Use derived key
  // Optionally pass mock private keys if needed by the mock implementation
  // mockPrivateKey,
  // wallet
);
// If the mock implementation doesn't automatically handle properties, assign them:
// (mockMemberInstance as any).id = { toString: () => '00000000-0000-0000-0000-000000000000' };
// (mockMemberInstance as any).publicKey = mockPublicKey;

describe('PrimeTupleGeneratorStream', () => {
  // checksumService is already initialized above
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    // checksumService = ServiceProvider.getInstance().checksumService; // Already initialized
    jest.setTimeout(10000);
  });

  afterAll(() => {
    ServiceProvider.resetInstance();
  });

  const createRandomBlock = () => RandomBlock.new(blockSize);
  const createWhitenedBlock = () => {
    const data = randomBytes(blockSize);
    return new WhitenedBlock(
      blockSize,
      data,
      checksumService.calculateChecksum(data),
      new Date(),
      true,
      true,
    );
  };

  describe('constructor', () => {
    it('should create stream with valid parameters', () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMemberInstance, // Use the mock instance
        createWhitenedBlock,
        createRandomBlock,
      );
      expect(stream).toBeInstanceOf(PrimeTupleGeneratorStream);
    });

    it('should throw error if block size is missing', () => {
      expect(
        () =>
          new PrimeTupleGeneratorStream(
            undefined as unknown as BlockSize,
            mockMemberInstance, // Use the mock instance
            createWhitenedBlock,
            createRandomBlock,
          ),
      ).toThrow(new StreamError(StreamErrorType.BlockSizeRequired));
    });

    it('should throw error if whitened block source is missing', () => {
      expect(
        () =>
          new PrimeTupleGeneratorStream(
            blockSize,
            mockMemberInstance, // Use the mock instance
            undefined as unknown as () => WhitenedBlock | undefined,
            createRandomBlock,
          ),
      ).toThrow(new StreamError(StreamErrorType.WhitenedBlockSourceRequired));
    });

    it('should throw error if random block source is missing', () => {
      expect(
        () =>
          new PrimeTupleGeneratorStream(
            blockSize,
            mockMemberInstance, // Use the mock instance
            createWhitenedBlock,
            undefined as unknown as () => RandomBlock,
          ),
      ).toThrow(new StreamError(StreamErrorType.RandomBlockSourceRequired));
    });
  });

  describe('data processing', () => {
    it('should process complete blocks', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMemberInstance, // Use the mock instance
        createWhitenedBlock,
        createRandomBlock,
      );

      const data = randomBytes(blockSize * 2); // Two complete blocks
      const source = Readable.from(data);

      const tuples: InMemoryBlockTuple[] = [];
      stream.on('data', (tuple: InMemoryBlockTuple) => {
        tuples.push(tuple);
      });

      source.pipe(stream);

      await new Promise<void>((resolve) => {
        stream.on('end', () => {
          expect(tuples.length).toBe(2); // Should create two tuples
          tuples.forEach((tuple) => {
            expect(tuple.blocks.length).toBe(TUPLE.SIZE);
            expect(tuple.blocks[0].blockSize).toBe(blockSize);
            expect(tuple.blocks[0].blockType).toBe(
              BlockType.EphemeralOwnedDataBlock,
            );
            expect(tuple.blocks[0].blockDataType).toBe(BlockDataType.RawData);
          });
          resolve();
        });
      });
    });

    it('should handle partial blocks', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMemberInstance, // Use the mock instance
        createWhitenedBlock,
        createRandomBlock,
      );

      const data = randomBytes(Math.floor(blockSize * 1.5)); // One complete block plus half
      const source = Readable.from(data);

      const tuples: InMemoryBlockTuple[] = [];
      stream.on('data', (tuple: InMemoryBlockTuple) => {
        tuples.push(tuple);
      });

      source.pipe(stream);

      await new Promise<void>((resolve) => {
        stream.on('end', () => {
          expect(tuples.length).toBe(2); // Should create two tuples (one for complete block, one for padded partial)
          tuples.forEach((tuple) => {
            expect(tuple.blocks.length).toBe(TUPLE.SIZE);
            expect(tuple.blocks[0].blockSize).toBe(blockSize);
          });
          resolve();
        });
      });
    });

    it('should handle empty input', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMemberInstance, // Use the mock instance
        createWhitenedBlock,
        createRandomBlock,
      );

      const source = Readable.from(Buffer.alloc(0));

      const tuples: InMemoryBlockTuple[] = [];
      stream.on('data', (tuple: InMemoryBlockTuple) => {
        tuples.push(tuple);
      });

      source.pipe(stream);

      await new Promise<void>((resolve) => {
        stream.on('end', () => {
          expect(tuples.length).toBe(0); // Should not create any tuples
          resolve();
        });
      });
    });

    it('should handle non-buffer input', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMemberInstance, // Use the mock instance
        createWhitenedBlock,
        createRandomBlock,
      );

      await new Promise<void>((resolve) => {
        stream.on('error', (error) => {
          expect(error).toBeInstanceOf(StreamError);
          expect((error as StreamError).type).toBe(
            StreamErrorType.InputMustBeBuffer,
          );
          resolve();
        });

        stream.write('not a buffer');
      });
    });
  });
});
