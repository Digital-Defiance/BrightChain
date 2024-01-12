import {
  BlockSize,
  blockSizeLengths,
  lengthToBlockSizeIndex,
  validBlockSizes,
} from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { GuidV4 } from '../guid';
import { ChecksumBuffer, RawGuidBuffer, SignatureBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { TupleSize } from '../constants';
import { BlockHandleTuple } from './handleTuple';
import { BlockHandle } from './handle';
import { BrightChainMember } from '../brightChainMember';
import { EncryptedConstituentBlockListBlock } from './encryptedCbl';
import { BaseBlock } from './base';
import { BlockDataType } from '../enumerations/blockDataType';

/**
 * Constituent Block List
 * Instance cannot be encrypted, see EncryptedConstituentBlockListBlock
 */
export class ConstituentBlockListBlock extends EphemeralBlock {
  public static readonly CblHeaderSize = 102;
  public static readonly CblHeaderSizeWithoutSignature = ConstituentBlockListBlock.CblHeaderSize - StaticHelpersECIES.signatureLength;
  public override readonly blockType = BlockType.ConstituentBlockList;
  public readonly creatorId: RawGuidBuffer;
  public readonly creatorSignature: SignatureBuffer;
  public readonly originalDataLength: bigint;
  public readonly cblAddressCount: number;
  public readonly tupleSize: number;
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
  public getCblBlockIdData(): Buffer {
    const offset = ConstituentBlockListBlock.CblHeaderSize;
    const cblBlockIdData = this.data.subarray(
      offset,
      offset + (StaticHelpersChecksum.Sha3ChecksumBufferLength * this.cblAddressCount)
    );
    return cblBlockIdData;
  }
  public getHandleTuples(getDiskBlockPath: (id: ChecksumBuffer, blockSize: BlockSize) => string): BlockHandleTuple[] {
    // loop through the cblBlockIds and create a handle tuple for each set of TupleSize
    const handleTuples: BlockHandleTuple[] = [];
    let offset = ConstituentBlockListBlock.CblHeaderSize;
    for (let i = 0; i < this.cblAddressCount; i += TupleSize) {
      // gather TupleSize addresses from the data, starting at the offset
      const cblBlockIds: ChecksumBuffer[] = [];
      for (let j = 0; j < TupleSize; j++) {
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
  public override encrypt(creator: BrightChainMember): EncryptedConstituentBlockListBlock {
    const encrypted = super.encrypt(creator);
    return encrypted as EncryptedConstituentBlockListBlock;
  }
  public static makeCblHeaderAndSign(
    creator: BrightChainMember,
    dateCreated: Date,
    cblAddressCount: number,
    originalEncryptedDataLength: bigint,
    addressList: Buffer,
  ): Buffer {
    if (cblAddressCount % TupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeBigInt64BE(BigInt(dateCreated.getTime()));
    const cblAddressCountBuffer = Buffer.alloc(4);
    cblAddressCountBuffer.writeUInt32BE(cblAddressCount);
    const originalDataLengthBuffer = Buffer.alloc(8);
    originalDataLengthBuffer.writeBigInt64BE(originalEncryptedDataLength);
    const tupleSizeBuffer = Buffer.alloc(1);
    tupleSizeBuffer.writeUInt8(TupleSize);
    const header = Buffer.concat([
      creator.id.asRawGuidBuffer, // 16 bytes
      dateCreatedBuffer, // 8 bytes
      cblAddressCountBuffer, // 4 bytes
      originalDataLengthBuffer, // 8 bytes
      tupleSizeBuffer, // 1 byte
      //creatorSignature, // 65 bytes
    ]); // 102 bytes
    if (header.length != ConstituentBlockListBlock.CblHeaderSizeWithoutSignature) {
      throw new Error('Header length is incorrect');
    }
    const toSign = Buffer.concat([header, addressList]);
    const checksum = StaticHelpersChecksum.calculateChecksum(toSign);
    const creatorSignature = creator.sign(checksum);
    return Buffer.concat([header, creatorSignature]);
  }
  public static readCBLHeader(data: Buffer, blockSize: BlockSize): {
    creatorId: GuidV4;
    creatorSignature: SignatureBuffer;
    dateCreated: Date;
    cblAddressCount: number;
    originalDataLength: bigint;
    tupleSize: number;
  } {
    let offset = 0;
    const creatorLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    const creatorIdBuffer = data.subarray(offset, creatorLength) as RawGuidBuffer;
    const creatorId = new GuidV4(creatorIdBuffer);
    offset += creatorLength;
    const dateCreated = new Date(Number(data.readBigInt64BE(offset)));
    // if date created is not in the past, error
    if (dateCreated > new Date()) {
      throw new Error('Date created is in the future');
    }
    offset += 8;
    const cblAddressCount = data.readUInt32BE(offset);
    offset += 4;
    const originalDataLength = data.readBigInt64BE(offset);
    offset += 8;
    const tupleSize = data.readUInt8(offset);
    offset += 1;
    const creatorSignature = data.subarray(
      offset,
      offset + StaticHelpersECIES.signatureLength
    ) as SignatureBuffer;
    offset += StaticHelpersECIES.signatureLength;
    if (cblAddressCount % tupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }
    // if address count is larger than the max for the block size, error
    const blockSizeIndex = lengthToBlockSizeIndex(blockSize as number);
    const cblBlockMaxIDCountsForBlockSize = ConstituentBlockListBlock.cblBlockMaxIDCounts[blockSizeIndex];
    if (cblAddressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength > cblBlockMaxIDCountsForBlockSize) {
      throw new Error('CBL address count is larger than the max for the block size');
    }
    if (cblAddressCount < 0) {
      throw new Error('CBL address count must be positive');
    }
    if (originalDataLength < 0 || originalDataLength > ConstituentBlockListBlock.maxFileSizesWithCBL[blockSizeIndex]) {
      throw new Error('Original data length is out of range');
    }
    if (tupleSize < 2 || tupleSize > 15) {
      throw new Error('Tuple size is out of range');
    }
    return {
      creatorId,
      creatorSignature,
      cblAddressCount,
      originalDataLength,
      dateCreated,
      tupleSize
    };
  }
  public static newFromPlaintextBuffer(plaintextData: Buffer, blockSize: BlockSize) {
    const cblData = ConstituentBlockListBlock.readCBLHeader(plaintextData, blockSize);
    const cblBlock = new ConstituentBlockListBlock(
      blockSize,
      cblData.creatorId.asRawGuidBuffer,
      cblData.creatorSignature,
      cblData.originalDataLength,
      cblData.cblAddressCount,
      plaintextData,
      cblData.dateCreated
    );
    return cblBlock;
  }
  public static fromBaseBlock(block: BaseBlock): ConstituentBlockListBlock {
    if (block.encrypted) {
      throw new Error('Cannot create CBL from encrypted block');
    }
    return ConstituentBlockListBlock.newFromPlaintextBuffer(block.data, block.blockSize);
  }
  constructor(
    blockSize: BlockSize,
    creatorId: RawGuidBuffer,
    creatorSignature: SignatureBuffer,
    originalDataLength: bigint,
    cblAddressCount: number,
    data: Buffer,
    dateCreated?: Date,
    tupleSize?: number,
  ) {
    super(blockSize, data, BlockDataType.EphemeralStructuredData, ConstituentBlockListBlock.CblHeaderSize + (cblAddressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength), dateCreated);
    this.creatorId = creatorId;
    this.creatorSignature = creatorSignature;
    this.originalDataLength = originalDataLength;
    this.cblAddressCount = cblAddressCount;
    this.tupleSize = tupleSize ?? TupleSize;
    if (this.cblAddressCount % this.tupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }
  }
  public validateSignature(creator: BrightChainMember): boolean {
    const headerMinusSignature = this.data.subarray(0, ConstituentBlockListBlock.CblHeaderSizeWithoutSignature);
    const checksum = StaticHelpersChecksum.calculateChecksum(Buffer.concat([headerMinusSignature, this.getCblBlockIdData()]));
    return creator.verify(this.creatorSignature, checksum);
  }


  public static readonly cblBlockDataLengths = [
    blockSizeLengths[0] - ConstituentBlockListBlock.CblHeaderSize, // 2**9 - 102 = 410
    blockSizeLengths[1] - ConstituentBlockListBlock.CblHeaderSize, // 2**10 - 102 = 922
    blockSizeLengths[2] - ConstituentBlockListBlock.CblHeaderSize, // 2**12 - 102 = 3994
    blockSizeLengths[3] - ConstituentBlockListBlock.CblHeaderSize, // 2**20 - 102 = 1048474
    blockSizeLengths[4] - ConstituentBlockListBlock.CblHeaderSize, // 2**26 - 102 = 67108762
    blockSizeLengths[5] - ConstituentBlockListBlock.CblHeaderSize, // 2**28 - 102 = 268435354
  ];

  public static readonly cblBlockDataLengthsWithEcieEncryption = [
    this.cblBlockDataLengths[0] - StaticHelpersECIES.ecieOverheadLength, // 410 - 97 = 313
    this.cblBlockDataLengths[1] - StaticHelpersECIES.ecieOverheadLength, // 922 - 97 = 825
    this.cblBlockDataLengths[2] - StaticHelpersECIES.ecieOverheadLength, // 3994 - 97 = 3897
    this.cblBlockDataLengths[3] - StaticHelpersECIES.ecieOverheadLength, // 1048474 - 97 = 1048377
    this.cblBlockDataLengths[4] - StaticHelpersECIES.ecieOverheadLength, // 67108762 - 97 = 67108665
    this.cblBlockDataLengths[5] - StaticHelpersECIES.ecieOverheadLength, // 268435354 - 97 = 268435257
  ];

  /**
   * Maximum number of IDs that can be stored in a CBL block for each block size
   */
  public static readonly cblBlockMaxIDCounts = [
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengthsWithEcieEncryption[0] /
      StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 313 / 64 = 4
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengthsWithEcieEncryption[1] /
      StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 825 / 64 = 12
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengthsWithEcieEncryption[2] /
      StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 3897 / 64 = 60
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengthsWithEcieEncryption[3] /
      StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 1048377 / 64 = 16380
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengthsWithEcieEncryption[4] /
      StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 67108665 / 64 = 1048572
    Math.floor(
      ConstituentBlockListBlock.cblBlockDataLengthsWithEcieEncryption[5] /
      StaticHelpersChecksum.Sha3ChecksumBufferLength
    ), // 268435257 / 64 = 4194300
  ];

  public static readonly cblBlockMaxTupleCounts = [
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[0] / TupleSize), // 4 / 3 = 1
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[1] / TupleSize), // 12 / 3 = 4
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[2] / TupleSize), // 60 / 3 = 20
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[3] / TupleSize), // 16380 / 3 = 5460
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[4] / TupleSize), // 1048572 / 3 = 349524
    Math.floor(ConstituentBlockListBlock.cblBlockMaxIDCounts[5] / TupleSize), // 4194300 / 3 = 1398100
  ];

  /**
   * Maximum file sizes for each block size using a CBL and raw blocks
   * Functionally 1/5 the CBL because of the whitening block tuples
   */
  public static readonly maxFileSizesWithCBL = [
    BigInt(blockSizeLengths[0]) *
    BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[0]), // 1 * 2**9 = 512 (0.5KiB)
    BigInt(blockSizeLengths[1]) *
    BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[1]), // 4 * 2**10 = 4096 (4KiB)
    BigInt(blockSizeLengths[2]) *
    BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[2]), // 20 * 2**12 = 81920 (80KiB)
    BigInt(blockSizeLengths[3]) *
    BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[3]), // 5460 * 2**20 = 5725224960 (5.33GiB)
    BigInt(blockSizeLengths[4]) *
    BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[4]), // 349524 * 2**26 = 23456158580736 (21.33TiB)
    BigInt(blockSizeLengths[5]) *
    BigInt(ConstituentBlockListBlock.cblBlockMaxTupleCounts[5]), // 1398100 * 2**28 = 375299611033600 (341.3TiB)
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
}
