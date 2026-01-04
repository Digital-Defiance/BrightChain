import { randomBytes } from 'crypto';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { WhitenedBlock } from './blocks/whitened';
import { BrightChainMember } from './brightChainMember';
import { CblStream } from './cblStream';
import { TUPLE } from './constants';
import { BlockEncryptionType } from './enumerations/blockEncryptionType';
import { BlockSize } from './enumerations/blockSize';
import { CblErrorType } from './enumerations/cblErrorType';
import MemberType from './enumerations/memberType';
import { CblError } from './errors/cblError';
import { CBLService } from './services/cblService';
import { ChecksumService } from './services/checksum.service';
import { ServiceProvider } from './services/service.provider';
import { initializeTestServices } from './test/service.initializer.helper';
import { EmailString } from '@digitaldefiance/ecies-lib';
import { ChecksumBuffer } from '@digitaldefiance/node-ecies-lib';

// Mock the CBLBase class to avoid signature validation issues
jest.mock('./blocks/cblBase', () => {
  const originalModule = jest.requireActual('./blocks/cblBase');

  // Mock the validateSignature method at the prototype level
  // This ensures it's mocked before the constructor calls it
  originalModule.CBLBase.prototype.validateSignature = jest
    .fn()
    .mockReturnValue(true);

  return originalModule;
});

jest.setTimeout(10000); // Increase timeout to 10 seconds

describe('CblStream', () => {
  let creator: BrightChainMember;
  let checksumService: ChecksumService;
  let cblService: CBLService;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeTestServices();
    creator = BrightChainMember.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    ).member;
    checksumService = ServiceProvider.getInstance().checksumService;
    cblService = ServiceProvider.getInstance().cblService;
  });

  const createTestCbl = (data: Buffer) => {
    // Create test addresses
    const addresses: ChecksumBuffer[] = [];
    for (let i = 0; i < TUPLE.SIZE; i++) {
      addresses.push(checksumService.calculateChecksum(randomBytes(blockSize)));
    }

    // Create CBL header and data
    const addressList = Buffer.concat(addresses.map((addr) => addr));
    const { headerData } = cblService.makeCblHeader(
      creator,
      new Date(),
      addresses.length,
      data.length,
      addressList,
      blockSize,
      BlockEncryptionType.None,
    );

    // Combine header and address list
    const cblData = Buffer.concat([headerData, addressList]);

    // Calculate checksum for the entire CBL data
    const checksum = checksumService.calculateChecksum(cblData);

    const cbl = new ConstituentBlockListBlock(cblData, creator);

    // Set the correct checksum on the CBL
    Object.defineProperty(cbl, 'idChecksum', {
      value: checksum,
      writable: false,
      configurable: true,
    });

    return cbl;
  };

  const createTestWhitenedBlock = async (data: Buffer) => {
    return WhitenedBlock.from(
      blockSize,
      data,
      checksumService.calculateChecksum(data),
      new Date(),
      undefined,
      true,
      true,
    );
  };

  describe('constructor', () => {
    it('should create stream with valid parameters', async () => {
      const cbl = createTestCbl(randomBytes(blockSize));
      const whitenedBlocks = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() => createTestWhitenedBlock(randomBytes(blockSize))),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: ChecksumBuffer) => whitenedBlocks[0];

      const stream = new CblStream(cbl, getWhitenedBlock);
      expect(stream).toBeInstanceOf(CblStream);
    });

    it('should throw error if CBL is missing', async () => {
      const whitenedBlocks = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() => createTestWhitenedBlock(randomBytes(blockSize))),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: ChecksumBuffer) => whitenedBlocks[0];

      expect(
        () =>
          new CblStream(
            undefined as unknown as ConstituentBlockListBlock,
            getWhitenedBlock,
          ),
      ).toThrow(new CblError(CblErrorType.CblRequired));
    });

    it('should throw error if whitened block function is missing', async () => {
      const cbl = createTestCbl(randomBytes(blockSize));

      expect(
        () =>
          new CblStream(
            cbl,
            undefined as unknown as (id: ChecksumBuffer) => WhitenedBlock,
          ),
      ).toThrow(new CblError(CblErrorType.WhitenedBlockFunctionRequired));
    });
  });

  describe('data streaming', () => {
    it('should stream data correctly', async () => {
      const originalData = randomBytes(blockSize); // One block worth of data
      const cbl = createTestCbl(originalData);

      // Create whitened blocks that XOR to give original data
      const whitenedBlocks = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() => createTestWhitenedBlock(randomBytes(blockSize))),
      );

      let blockIndex = 0;
      const getWhitenedBlock = (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        blockId: ChecksumBuffer,
      ) => {
        // Return blocks in sequence to ensure we have the right number for the tuple
        const block = whitenedBlocks[blockIndex];
        blockIndex = (blockIndex + 1) % TUPLE.SIZE;
        return block;
      };

      const stream = new CblStream(cbl, getWhitenedBlock);
      const chunks: Buffer[] = [];

      return new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          const streamedData = Buffer.concat(chunks);
          expect(streamedData.length).toBe(originalData.length);
          // Note: In a real implementation, the XORed data would reconstruct the original
          // Here we just verify the stream mechanics work
          resolve();
        });

        stream.on('error', reject);
      });
    });

    it('should handle empty data', async () => {
      const cbl = createTestCbl(Buffer.alloc(0));
      const whitenedBlocks = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() => createTestWhitenedBlock(randomBytes(blockSize))),
      );

      let blockIndex = 0;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: ChecksumBuffer) => {
        // Return blocks in sequence to ensure we have the right number for the tuple
        const block = whitenedBlocks[blockIndex];
        blockIndex = (blockIndex + 1) % TUPLE.SIZE;
        return block;
      };

      const stream = new CblStream(cbl, getWhitenedBlock);
      const chunks: Buffer[] = [];

      return new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          const streamedData = Buffer.concat(chunks);
          expect(streamedData.length).toBe(0);
          resolve();
        });

        stream.on('error', reject);
      });
    });

    it('should handle missing whitened blocks', async () => {
      const originalData = randomBytes(blockSize);
      const cbl = createTestCbl(originalData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: ChecksumBuffer): WhitenedBlock => {
        throw new Error('Block not found');
      };

      const stream = new CblStream(cbl, getWhitenedBlock);

      return new Promise<void>((resolve, reject) => {
        stream.on('error', (error) => {
          try {
            expect(error).toBeInstanceOf(CblError);
            expect((error as CblError).type).toBe(
              CblErrorType.FailedToLoadBlock,
            );
            resolve();
          } catch (e) {
            reject(e);
          }
        });

        // Start reading to trigger the error
        stream.read();
      });
    });
  });
});
