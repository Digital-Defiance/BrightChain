import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { TUPLE } from './constants';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { StreamErrorType } from './enumerations/streamErrorType';
import { StreamError } from './errors/streamError';
import { PrimeTupleGeneratorStream } from './primeTupleGeneratorStream';
import { ChecksumService } from './services/checksum.service';
import { ServiceProvider } from './services/service.provider';

describe('PrimeTupleGeneratorStream', () => {
  let checksumService: ChecksumService;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    checksumService = ServiceProvider.getChecksumService();
    jest.setTimeout(10000);
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
            expect(tuple.blocks[0].blockType).toBe(BlockType.OwnedDataBlock);
            expect(tuple.blocks[0].blockDataType).toBe(BlockDataType.RawData);
          });
          resolve();
        });
      });
    });

    it('should handle partial blocks', async () => {
      const stream = new PrimeTupleGeneratorStream(
        blockSize,
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
        createWhitenedBlock,
        createRandomBlock,
      );

      await new Promise<void>((resolve) => {
        stream.on('error', (error) => {
          expect(error).toBeInstanceOf(StreamError);
          expect((error as StreamError).reason).toBe(
            StreamErrorType.InputMustBeBuffer,
          );
          resolve();
        });

        stream.write('not a buffer');
      });
    });
  });
});
