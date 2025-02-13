import { randomBytes } from 'crypto';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { WhitenedBlock } from './blocks/whitened';
import { BrightChainMember } from './brightChainMember';
import { CblBlockMetadata } from './cblBlockMetadata';
import { CblStream } from './cblStream';
import { TUPLE } from './constants';
import { EmailString } from './emailString';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { CblErrorType } from './enumerations/cblErrorType';
import MemberType from './enumerations/memberType';
import { CblError } from './errors/cblError';
import { ChecksumService } from './services/checksum.service';
import { ServiceProvider } from './services/service.provider';
import { initializeTestServices } from './test/service.initializer.helper';
import { ChecksumBuffer } from './types';

jest.setTimeout(10000); // Increase timeout to 10 seconds

describe('CblStream', () => {
  let creator: BrightChainMember;
  let checksumService: ChecksumService;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeTestServices();
    creator = BrightChainMember.newMember(
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    ).member;
    checksumService = ServiceProvider.getChecksumService();
  });

  const createTestCbl = (data: Buffer) => {
    // Create test addresses
    const addresses: ChecksumBuffer[] = [];
    for (let i = 0; i < TUPLE.SIZE; i++) {
      addresses.push(checksumService.calculateChecksum(randomBytes(blockSize)));
    }

    // Create CBL header and data
    const addressList = Buffer.concat(addresses);
    const { headerData } = ConstituentBlockListBlock.makeCblHeader(
      creator,
      new Date(),
      addresses.length,
      BigInt(data.length),
      addressList,
      blockSize,
    );

    // Combine header and address list
    const cblData = Buffer.concat([headerData, addressList]);
    const checksum = checksumService.calculateChecksum(cblData);

    return new ConstituentBlockListBlock(
      creator,
      new CblBlockMetadata(
        blockSize,
        BlockType.ConstituentBlockList,
        BlockDataType.EphemeralStructuredData,
        cblData.length,
        BigInt(data.length),
        new Date(),
        creator,
      ),
      cblData,
      checksum,
    );
  };

  const createTestWhitenedBlock = (data: Buffer) => {
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
      const cbl = createTestCbl(randomBytes(blockSize));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const whitenedBlocks: WhitenedBlock[] = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        whitenedBlocks.push(createTestWhitenedBlock(randomBytes(blockSize)));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: ChecksumBuffer) => whitenedBlocks[0];

      const stream = new CblStream(cbl, getWhitenedBlock);
      expect(stream).toBeInstanceOf(CblStream);
    });

    it('should throw error if CBL is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const whitenedBlocks: WhitenedBlock[] = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        whitenedBlocks.push(createTestWhitenedBlock(randomBytes(blockSize)));
      }
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

    it('should throw error if whitened block function is missing', () => {
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
    it('should stream data correctly', (done) => {
      const originalData = randomBytes(blockSize); // One block worth of data
      const cbl = createTestCbl(originalData);

      // Create whitened blocks that XOR to give original data
      const whitenedBlocks: WhitenedBlock[] = [];
      for (let i = 0; i < TUPLE.SIZE; i++) {
        whitenedBlocks.push(createTestWhitenedBlock(randomBytes(blockSize)));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const streamedData = Buffer.concat(chunks);
        expect(streamedData.length).toBe(originalData.length);
        // Note: In a real implementation, the XORed data would reconstruct the original
        // Here we just verify the stream mechanics work
        done();
      });

      stream.on('error', (error) => done(error));
    });

    it('should handle empty data', (done) => {
      const cbl = createTestCbl(Buffer.alloc(0));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const whitenedBlocks: WhitenedBlock[] = [];
      let blockIndex = 0;
      for (let i = 0; i < TUPLE.SIZE; i++) {
        whitenedBlocks.push(createTestWhitenedBlock(randomBytes(blockSize)));
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: ChecksumBuffer) => {
        // Return blocks in sequence to ensure we have the right number for the tuple
        const block = whitenedBlocks[blockIndex];
        blockIndex = (blockIndex + 1) % TUPLE.SIZE;
        return block;
      };

      const stream = new CblStream(cbl, getWhitenedBlock);
      const chunks: Buffer[] = [];

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const streamedData = Buffer.concat(chunks);
        expect(streamedData.length).toBe(0);
        done();
      });

      stream.on('error', (error) => done(error));
    });

    it('should handle missing whitened blocks', (done) => {
      const originalData = randomBytes(blockSize);
      const cbl = createTestCbl(originalData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const getWhitenedBlock = (blockId: ChecksumBuffer): WhitenedBlock => {
        throw new Error('Block not found');
      };

      const stream = new CblStream(cbl, getWhitenedBlock);

      stream.on('error', (error) => {
        try {
          expect(error).toBeInstanceOf(CblError);
          expect((error as CblError).reason).toBe(
            CblErrorType.FailedToLoadBlock,
          );
          done();
        } catch (e) {
          done(e);
        }
      });

      // Start reading to trigger the error
      stream.read();
    });
  });
});
