import {
  BlockSize,
  blockSizeLengths,
  validBlockSizes,
} from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { EthereumECIES } from '../ethereumECIES';
import { GuidV4 } from '../guid';
import { ChecksumBuffer, RawGuidBuffer, SignatureBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { TupleSize } from '../constants';
import { BlockHandleTuple } from './handleTuple';
import { BlockHandle } from './handle';

export class ConstituentBlockListBlock extends EphemeralBlock {
  public static readonly CblHeaderSize = 101;
  public override readonly blockType = BlockType.ConstituentBlockList;
  public override readonly reconstituted: boolean = true;
  public readonly creatorId: RawGuidBuffer;
  public readonly creatorSignature: SignatureBuffer;
  public readonly originalDataLength: bigint;
  public readonly cblAddressCount: number;
  public getCblBlockIds(): ChecksumBuffer[] {
    let offset = ConstituentBlockListBlock.CblHeaderSize;
    const cblBlockIds: ChecksumBuffer[] = [];
    for (let i = 0; i < this.cblAddressCount; i++) {
      const cblBlockId = this.data.subarray(
        offset,
        offset + StaticHelpersChecksum.Sha3ChecksumBufferLength
      ) as ChecksumBuffer;
      cblBlockIds.push(cblBlockId);
      offset += StaticHelpersChecksum.Sha3ChecksumBufferLength;
    }
    return cblBlockIds;
  }
  public getHandleTuples(getDiskBlockPath: (id: ChecksumBuffer, blockSize: BlockSize) => string): BlockHandleTuple[] {
    // loop through the cblBlockIds and create a handle tuple for each set of TupleSize
    const handleTuples: BlockHandleTuple[] = [];
    let offset = ConstituentBlockListBlock.CblHeaderSize;
    for (let i=0; i< this.cblAddressCount; i+= TupleSize) {
      // gather TupleSize addresses from the data, starting at the offset
      const cblBlockIds: ChecksumBuffer[] = [];
      for (let j=0; j<TupleSize; j++) {
        const cblBlockId = this.data.subarray(
          offset,
          offset + StaticHelpersChecksum.Sha3ChecksumBufferLength
        ) as ChecksumBuffer;
        cblBlockIds.push(cblBlockId);
        offset += StaticHelpersChecksum.Sha3ChecksumBufferLength;
      }
      const handleTuple = new BlockHandleTuple(cblBlockIds.map((id) => new BlockHandle(id, this.blockSize, getDiskBlockPath(id, this.blockSize))));
      handleTuples.push(handleTuple);
    }
    return handleTuples;
  }
  public static makeCblHeader(
    creatorId: RawGuidBuffer,
    creatorSignature: SignatureBuffer,
    dateCreated: Date,
    cblAddressCount: number,
    originalEncryptedDataLength: bigint
  ): Buffer {
    if (
      creatorId.length !== GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer)
    ) {
      throw new Error('Creator ID must be a raw guid buffer');
    }
    if (creatorSignature.length != EthereumECIES.signatureLength) {
      throw new Error('Creator signature must be a valid signature');
    }
    if (cblAddressCount % TupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeBigInt64BE(BigInt(dateCreated.getTime()));
    const cblAddressCountBuffer = Buffer.alloc(4);
    cblAddressCountBuffer.writeUInt32BE(cblAddressCount);
    const originalDataLengthBuffer = Buffer.alloc(8);
    originalDataLengthBuffer.writeBigInt64BE(originalEncryptedDataLength);
    const header = Buffer.concat([
      creatorId, // 16 bytes
      creatorSignature, // 65 bytes
      dateCreatedBuffer, // 8 bytes
      cblAddressCountBuffer, // 4 bytes
      originalDataLengthBuffer, // 8 bytes
    ]); // 101 bytes
    if (header.length != ConstituentBlockListBlock.CblHeaderSize) {
      throw new Error('Header length is incorrect');
    }
    return header;
  }
  public static readCBLHeader(data: Buffer): {
    creatorId: RawGuidBuffer;
    creatorSignature: SignatureBuffer;
    dateCreated: Date;
    cblAddressCount: number;
    originalDataLength: bigint;
  } {
    let offset = 0;
    const creatorLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    const creatorId = data.subarray(offset, creatorLength) as RawGuidBuffer;
    offset += creatorLength;
    const creatorSignature = data.subarray(
      offset,
      offset + EthereumECIES.signatureLength
    ) as SignatureBuffer;
    offset += EthereumECIES.signatureLength;
    const dateCreated = new Date(Number(data.readBigInt64BE(offset)));
    offset += 8;
    const cblAddressCount = data.readUInt32BE(offset);
    offset += 4;
    const originalDataLength = data.readBigInt64BE(offset);
    offset += 8;
    return {
      creatorId,
      creatorSignature,
      cblAddressCount,
      originalDataLength,
      dateCreated,
    };
  }
  public static newFromBuffer(data: Buffer) {
    const cblData = ConstituentBlockListBlock.readCBLHeader(data);
    const cblBlock = new ConstituentBlockListBlock(
      cblData.creatorId,
      cblData.creatorSignature,
      cblData.originalDataLength,
      cblData.cblAddressCount,
      data,
      cblData.dateCreated
    );
    return cblBlock;
  }
  constructor(
    creatorId: RawGuidBuffer,
    creatorSignature: SignatureBuffer,
    originalDataLength: bigint,
    cblAddressCount: number,
    data: Buffer,
    dateCreated?: Date
  ) {
    super(data, dateCreated);
    this.creatorId = creatorId;
    this.creatorSignature = creatorSignature;
    this.originalDataLength = originalDataLength;
    this.cblAddressCount = cblAddressCount;
    if (this.cblAddressCount % TupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }
  }

  public static readonly cblBlockDataLengths = [
    blockSizeLengths[0] - ConstituentBlockListBlock.CblHeaderSize, // 2**8 - 101 = 155
    blockSizeLengths[1] - ConstituentBlockListBlock.CblHeaderSize, // 2**9 - 101 = 411
    blockSizeLengths[2] - ConstituentBlockListBlock.CblHeaderSize, // 2**10 - 101 = 923
    blockSizeLengths[3] - ConstituentBlockListBlock.CblHeaderSize, // 2**12 - 101 = 3995
    blockSizeLengths[4] - ConstituentBlockListBlock.CblHeaderSize, // 2**20 - 101 = 1048475
    blockSizeLengths[5] - ConstituentBlockListBlock.CblHeaderSize, // 2**26 - 101 = 67108763
    blockSizeLengths[6] - ConstituentBlockListBlock.CblHeaderSize, // 2**28 - 101 = 268435355
  ];

  /**
   * Maximum number of IDs that can be stored in a CBL block for each block size
   */
  public static readonly cblBlockMaxIDCounts = [
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengths[0] /
        StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 155 / 64 = 2
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengths[1] /
        StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 411 / 64 = 6
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengths[2] /
        StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 923 / 64 = 14
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengths[3] /
        StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 3995 / 64 = 62
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengths[4] /
        StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 1048475 / 64 = 16382
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengths[5] /
        StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 67108763 / 64 = 1048574
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengths[6] /
        StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 268435355 / 64 = 4194302
  ];

  public static readonly cblBlockMaxTupleCounts = [
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[0] / TupleSize), // 2 / 5 = 0
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[1] / TupleSize), // 6 / 5 = 1
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[2] / TupleSize), // 14 / 5 = 2
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[3] / TupleSize), // 62 / 5 = 12
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[4] / TupleSize), // 16382 / 5 = 3276
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[5] / TupleSize), // 1048574 / 5 = 209714
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[6] / TupleSize), // 4194302 / 5 = 838860
  ];

  /**
   * Maximum file sizes for each block size using a CBL and raw blocks
   * Functionally 1/5 the CBL because of the whitening block tuples
   */
  public static readonly maxFileSizesWithCBL = [
    BigInt(blockSizeLengths[0]) *
      BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[0]), // 0 * 2**8 = 0
    BigInt(blockSizeLengths[1]) *
      BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[1]), // 1 * 2**9 = 512 (512b)
    BigInt(blockSizeLengths[2]) *
      BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[2]), // 2 * 2**10 = 2048 (2KiB)
    BigInt(blockSizeLengths[3]) *
      BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[3]), // 12 * 2**12 = 49152 (48KiB)
    BigInt(blockSizeLengths[4]) *
      BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[4]), // 3276 * 2**20 = 3435134976 (3.1GiB)
    BigInt(blockSizeLengths[5]) *
      BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[5]), // 209714 * 2**26 = 14073668304896 (12.79TiB)
    BigInt(blockSizeLengths[6]) *
      BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[6]), // 838860 * 2**28 = 225179766620160 (225.2TiB)
  ];

  /**
   * Given a file size, return the smallest block size that can fit enough addresses to store the file's tuples
   */
  public static fileSizeToCBLBlockSize(fileSize: bigint): BlockSize {
    if (fileSize <= 0n) {
      throw new Error(`Invalid fileSize ${fileSize}`);
    }
    const index = ConstituentBlockListBlock.maxFileSizesWithCBL.findIndex(
      (size) => size >= fileSize
    );
    if (index < 0) {
      return BlockSize.Unknown;
    }
    return validBlockSizes[index];
  }

  public static readonly ValidCBLBlockSizes = [
    BlockSize.Tiny,
    BlockSize.Small,
    BlockSize.Medium,
    BlockSize.Large,
    BlockSize.Huge,
  ];
}
