/* eslint-disable @typescript-eslint/no-explicit-any */
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { Readable } from './browserStream';
import { BlockSize } from './enumerations/blockSize';
import { StreamErrorType } from './enumerations/streamErrorType';
import { StreamError } from './errors/streamError';
import { PrimeTupleGeneratorStream } from './primeTupleGeneratorStream';
import { ChecksumService } from './services/checksum.service';
import { ServiceProvider } from './services/service.provider';

// Mock modules - remove the non-existent Member mock
// jest.mock('./Member');

// Create a simple mock member
const mockMember = {
  id: { toString: () => '00000000-0000-0000-0000-000000000000' },
  publicKey: Buffer.from('mockPublicKey'),
  privateKey: Buffer.from('mockPrivateKey'),
  sign: () => Buffer.from('mockSignature'),
  verify: () => true,
};

describe('PrimeTupleGeneratorStream', () => {
  let checksumService: ChecksumService;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
    jest.setTimeout(10000);
  });

  afterAll(() => {
    ServiceProvider.resetInstance();
  });

  const createRandomBlock = () => RandomBlock.new(blockSize);
  const createWhitenedBlock = () => {
    const data = new Uint8Array(blockSize);
    crypto.getRandomValues(data);
    const dataBuffer = Buffer.from(data);
    return new WhitenedBlock(
      blockSize,
      dataBuffer,
      checksumService.calculateChecksum(dataBuffer),
      new Date(),
      true,
      true,
    );
  };

  describe('constructor', () => {
    it('should create stream with valid parameters', () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMember as any,
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
            mockMember as any,
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
            mockMember as any,
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
            mockMember as any,
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
        mockMember as any,
        createWhitenedBlock,
        createRandomBlock,
      );

      const data = new Uint8Array(blockSize * 2); // Two complete blocks
      crypto.getRandomValues(data);
      const dataBuffer = Buffer.from(data);
      const source = Readable.from(dataBuffer);

      const tuples: InMemoryBlockTuple[] = [];
      stream.on('data', (tuple: InMemoryBlockTuple) => {
        tuples.push(tuple);
      });

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 3000);

        stream.on('end', () => {
          clearTimeout(timeout);
          expect(tuples.length).toBeGreaterThan(0);
          resolve();
        });

        stream.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        source.pipe(stream);
      });
    }, 10000);

    it('should handle partial blocks', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMember as any,
        createWhitenedBlock,
        createRandomBlock,
      );

      const data = new Uint8Array(Math.floor(blockSize * 1.5)); // One complete block plus half
      crypto.getRandomValues(data);
      const dataBuffer = Buffer.from(data);
      const source = Readable.from(dataBuffer);

      const tuples: InMemoryBlockTuple[] = [];
      stream.on('data', (tuple: InMemoryBlockTuple) => {
        tuples.push(tuple);
      });

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 3000);

        stream.on('end', () => {
          clearTimeout(timeout);
          expect(tuples.length).toBeGreaterThan(0);
          resolve();
        });

        stream.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        source.pipe(stream);
      });
    }, 10000);

    it('should handle empty input', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMember as any,
        createWhitenedBlock,
        createRandomBlock,
      );

      const source = Readable.from(Buffer.alloc(0));

      const tuples: InMemoryBlockTuple[] = [];
      stream.on('data', (tuple: InMemoryBlockTuple) => {
        tuples.push(tuple);
      });

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 3000);

        stream.on('end', () => {
          clearTimeout(timeout);
          expect(tuples.length).toBe(0);
          resolve();
        });

        stream.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        source.pipe(stream);
      });
    }, 10000);

    it('should handle non-buffer input', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
        mockMember as any,
        createWhitenedBlock,
        createRandomBlock,
      );

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out'));
        }, 3000);

        stream.on('error', (error) => {
          clearTimeout(timeout);
          expect(error).toBeInstanceOf(StreamError);
          expect((error as StreamError).type).toBe(
            StreamErrorType.InputMustBeBuffer,
          );
          resolve();
        });

        // Write non-buffer input and end the stream
        stream.write('not a buffer');
        stream.end();
      });
    }, 10000);
  });
});
