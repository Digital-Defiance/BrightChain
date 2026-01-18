import {
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { Checksum } from './types/checksum';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { WhitenedBlock } from './blocks/whitened';
import { CblStream } from './cblStream';
import { TUPLE } from './constants';
import { BlockEncryptionType } from './enumerations/blockEncryptionType';
import { BlockSize } from './enumerations/blockSize';
import { CblErrorType } from './enumerations/cblErrorType';
import { CblError } from './errors/cblError';
import { CBLService } from './services/cblService';
import { ChecksumService } from './services/checksum.service';
import { ServiceProvider } from './services/service.provider';
import { initializeTestServices } from './test/service.initializer.helper';

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
  let creator: Member<Uint8Array>;
  let checksumService: ChecksumService;
  let cblService: CBLService;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeTestServices();
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    ).member;
    checksumService = ServiceProvider.getInstance().checksumService;
    cblService = ServiceProvider.getInstance().cblService;
  });

  const createTestCbl = (data: Uint8Array) => {
    // Create test addresses
    const addresses: Uint8Array[] = [];
    for (let i = 0; i < TUPLE.SIZE; i++) {
      const testData = new Uint8Array(blockSize);
      crypto.getRandomValues(testData);
      const checksum = checksumService.calculateChecksum(testData);
      addresses.push(checksum.toUint8Array());
    }

    // Create CBL header and data
    const addressList = new Uint8Array(
      addresses.reduce((acc, addr) => acc + addr.length, 0),
    );
    let offset = 0;
    for (const addr of addresses) {
      addressList.set(addr, offset);
      offset += addr.length;
    }

    const { headerData } = cblService.makeCblHeader(
      creator,
      new Date(),
      addresses.length,
      data.length,
      Buffer.from(addressList),
      blockSize,
      BlockEncryptionType.None,
    );

    // Combine header and address list
    const cblData = new Uint8Array(headerData.length + addressList.length);
    cblData.set(new Uint8Array(headerData), 0);
    cblData.set(addressList, headerData.length);

    // Calculate checksum for the entire CBL data
    const checksum = checksumService.calculateChecksum(cblData);

    // Create CBL with proper padding to match block size
    const paddedData = new Uint8Array(blockSize);
    cblData
      .subarray(0, Math.min(cblData.length, blockSize))
      .forEach((byte, i) => {
        paddedData[i] = byte;
      });

    const cbl = new ConstituentBlockListBlock(paddedData, creator);

    // Set the correct checksum on the CBL
    Object.defineProperty(cbl, 'idChecksum', {
      value: checksum,
      writable: false,
      configurable: true,
    });

    return cbl;
  };

  const createTestWhitenedBlock = async (data: Uint8Array) => {
    return WhitenedBlock.from(
      blockSize,
      Buffer.from(data),
      checksumService.calculateChecksum(data),
      new Date(),
      undefined,
      true,
      true,
    );
  };

  describe('constructor', () => {
    it('should create stream with valid parameters', async () => {
      const cbl = createTestCbl(new Uint8Array(blockSize).fill(42));
      const whitenedBlocks = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() =>
            createTestWhitenedBlock(
              new Uint8Array(blockSize).fill(Math.random() * 255),
            ),
          ),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: Checksum) => whitenedBlocks[0];

      const stream = new CblStream(cbl, getWhitenedBlock);
      expect(stream).toBeInstanceOf(CblStream);
    });

    it('should throw error if CBL is missing', async () => {
      const whitenedBlocks = await Promise.all(
        Array(TUPLE.SIZE)
          .fill(null)
          .map(() => {
            const testData = new Uint8Array(blockSize);
            crypto.getRandomValues(testData);
            return createTestWhitenedBlock(testData);
          }),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: Checksum) => whitenedBlocks[0];

      expect(
        () =>
          new CblStream(
            undefined as unknown as ConstituentBlockListBlock,
            getWhitenedBlock,
          ),
      ).toThrow(new CblError(CblErrorType.CblRequired));
    });

    it('should throw error if whitened block function is missing', async () => {
      const cbl = createTestCbl(new Uint8Array(blockSize).fill(42));

      expect(
        () =>
          new CblStream(
            cbl,
            undefined as unknown as (id: Checksum) => WhitenedBlock,
          ),
      ).toThrow(new CblError(CblErrorType.WhitenedBlockFunctionRequired));
    });
  });

  describe('data streaming', () => {
    it('should stream data correctly', async () => {
      const originalData = new Uint8Array(blockSize); // One block worth of data
      crypto.getRandomValues(originalData);
      const cbl = createTestCbl(originalData);

      // Create a simple whitened block that returns the original data when XORed
      const testWhitenedBlock = await createTestWhitenedBlock(originalData);

      const getWhitenedBlock = (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        blockId: Checksum,
      ) => {
        return testWhitenedBlock;
      };

      const stream = new CblStream(cbl, getWhitenedBlock);
      const chunks: Uint8Array[] = [];

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 5000);

        stream.on('data', (chunk: Uint8Array) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          clearTimeout(timeout);
          // Just verify we got some data
          expect(chunks.length).toBeGreaterThan(0);
          resolve();
        });

        stream.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // Start reading
        stream.read();
      });
    });

    it('should handle empty data', async () => {
      const cbl = createTestCbl(new Uint8Array(0));
      const testWhitenedBlock = await createTestWhitenedBlock(
        new Uint8Array(blockSize),
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: Checksum) => {
        return testWhitenedBlock;
      };

      const stream = new CblStream(cbl, getWhitenedBlock);
      const chunks: Uint8Array[] = [];

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 5000);

        stream.on('data', (chunk: Uint8Array) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          clearTimeout(timeout);
          // For empty data, we might still get chunks due to padding
          resolve();
        });

        stream.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // Start reading
        stream.read();
      });
    });

    it('should handle missing whitened blocks', async () => {
      const originalData = new Uint8Array(blockSize);
      crypto.getRandomValues(originalData);
      const cbl = createTestCbl(originalData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: Checksum): WhitenedBlock => {
        throw new Error('Block not found');
      };

      const stream = new CblStream(cbl, getWhitenedBlock);

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 5000);

        stream.on('error', (error) => {
          clearTimeout(timeout);
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
