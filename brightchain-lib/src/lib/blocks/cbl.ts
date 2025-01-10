import { BrightChainMember } from '../brightChainMember';
import { TUPLE_SIZE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import {
  BlockSize,
  blockSizeLengths,
  lengthToBlockSizeIndex,
  validBlockSizes,
} from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { GuidV4 } from '../guid';
import { IConstituentBlockListBlock } from '../interfaces/cbl';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer, RawGuidBuffer, SignatureBuffer } from '../types';
import { BaseBlock } from './base';
import { EphemeralBlock } from './ephemeral';
import { BlockHandle } from './handle';
import { BlockHandleTuple } from './handleTuple';

/**
 * Constituent Block List
 * Instance cannot be encrypted, see EncryptedConstituentBlockListBlock
 */
export class ConstituentBlockListBlock
  extends EphemeralBlock
  implements IConstituentBlockListBlock
{
  /**
   * The size of the creator ID in bytes
   */
  public static CreatorLength = GuidV4.guidBrandToLength(
    GuidBrandType.RawGuidBuffer,
  );
  /**
   * The offset of the creator ID in the block data
   */
  public static readonly CreatorIdOffset = 0;
  /**
   * The offset of the date created in the block data
   */
  public static readonly DateCreatedOffset =
    ConstituentBlockListBlock.CreatorLength;
  /**
   * The offset of the CBL address count in the block data
   */
  public static readonly CblAddressCountOffset =
    ConstituentBlockListBlock.DateCreatedOffset + 8;
  /**
   * The offset of the original data length in the block data
   */
  public static readonly OriginalDataLengthOffset =
    ConstituentBlockListBlock.CblAddressCountOffset + 4;
  /**
   * The offset of the tuple size in the block data
   */
  public static readonly TupleSizeOffset =
    ConstituentBlockListBlock.OriginalDataLengthOffset + 8;
  /**
   * The offset of the creator signature in the block data
   */
  public static readonly CreatorSignatureOffset =
    ConstituentBlockListBlock.TupleSizeOffset + 1;
  /**
   * The offset of the CBL data in the block data
   */
  public static readonly CblDataOffset =
    ConstituentBlockListBlock.CreatorSignatureOffset +
    StaticHelpersECIES.signatureLength;
  /**
   * The size of the CBL header in bytes
   */
  public static readonly CblHeaderSize =
    ConstituentBlockListBlock.CblDataOffset;
  /**
   * The size of the CBL header in bytes without the creator signature
   */
  public static readonly CblHeaderSizeWithoutSignature =
    ConstituentBlockListBlock.CreatorSignatureOffset;

  /**
   * Calculate the capacity of a CBL block for addresses, with or without encryption overhead.
   * Returns the number of addresses it can contain
   */
  public static CalculateCBLAddressCapacity(
    blockSize: BlockSize,
    allowEncryption = true,
  ): number {
    const blockRawCapacity = blockSize as number;
    const dataCapacityWithoutHeader =
      blockRawCapacity - ConstituentBlockListBlock.CblHeaderSize;
    const dataCapacityWithoutHeaderAndECIES =
      dataCapacityWithoutHeader - StaticHelpersECIES.eciesOverheadLength;
    return allowEncryption
      ? dataCapacityWithoutHeaderAndECIES
      : dataCapacityWithoutHeader;
  }
  /**
   * Whether the block can be encrypted
   */
  public override get canEncrypt(): boolean {
    if (!super.canEncrypt) {
      return false;
    }
    // if the number of addresses times the length of an address is less/equal to the computed capacity, return true
    const capacity = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      this.blockSize,
      true,
    );
    return (
      this.cblAddressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength <=
      capacity
    );
  }
  /**
   * Get the CBL block IDs
   * @returns The CBL block IDs
   */
  public getCblBlockIds(): Array<ChecksumBuffer> {
    const cblBlockIds: Array<ChecksumBuffer> = [];
    let offset = 0;
    for (let i = 0; i < this.cblAddressCount; i++) {
      const cblBlockId = this.payload.subarray(
        offset,
        offset + StaticHelpersChecksum.Sha3ChecksumBufferLength,
      ) as ChecksumBuffer;
      cblBlockIds.push(cblBlockId);
      offset += StaticHelpersChecksum.Sha3ChecksumBufferLength;
    }
    return cblBlockIds;
  }
  /**
   * Get Block Handle Tuples for the CBL block
   */
  public getHandleTuples(
    getDiskBlockPath: (id: ChecksumBuffer, blockSize: BlockSize) => string,
  ): Array<BlockHandleTuple> {
    // loop through the cblBlockIds and create a handle tuple for each set of TupleSize
    const handleTuples: Array<BlockHandleTuple> = [];
    let offset = 0;
    for (let i = 0; i < this.cblAddressCount; i += TUPLE_SIZE) {
      // gather TupleSize addresses from the data, starting at the offset
      const cblBlockIds: ChecksumBuffer[] = [];
      for (let j = 0; j < TUPLE_SIZE; j++) {
        const cblBlockId = this.payload.subarray(
          offset,
          offset + StaticHelpersChecksum.Sha3ChecksumBufferLength,
        ) as ChecksumBuffer;
        cblBlockIds.push(cblBlockId);
        offset += StaticHelpersChecksum.Sha3ChecksumBufferLength;
      }
      const handleTuple = new BlockHandleTuple(
        cblBlockIds.map(
          (id) =>
            new BlockHandle(
              id,
              this.blockSize,
              getDiskBlockPath(id, this.blockSize),
            ),
        ),
      );
      handleTuples.push(handleTuple);
    }
    return handleTuples;
  }
  /**
   * Create a CBL header
   * @param creator - The creator of the CBL, BrightChainMember
   * @param dateCreated - The date the CBL was created
   * @param cblAddressCount - The number of addresses in the CBL
   * @param originalDataLength - The length of the original encrypted data
   * @param addressList - The list of addresses in the CBL
   * @param signature - The signature of the creator
   * @param tupleSize - The size of the tuples
   * @returns The header data and signature
   */
  public static makeCblHeader(
    creator: BrightChainMember | GuidV4,
    dateCreated: Date,
    cblAddressCount: number,
    originalDataLength: bigint,
    addressList: Buffer,
    signature?: SignatureBuffer,
    tupleSize = TUPLE_SIZE,
  ): { headerData: Buffer; signature: SignatureBuffer; validated: boolean } {
    if (cblAddressCount % TUPLE_SIZE !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeBigInt64BE(BigInt(dateCreated.getTime()));
    const cblAddressCountBuffer = Buffer.alloc(4);
    cblAddressCountBuffer.writeUInt32BE(cblAddressCount);
    const originalDataLengthBuffer = Buffer.alloc(8);
    originalDataLengthBuffer.writeBigInt64BE(originalDataLength);
    const tupleSizeBuffer = Buffer.alloc(1);
    tupleSizeBuffer.writeUInt8(tupleSize);
    const headerWithoutSignature = Buffer.concat([
      creator instanceof BrightChainMember
        ? creator.id.asRawGuidBuffer
        : creator.asRawGuidBuffer, // 16 bytes
      dateCreatedBuffer, // 8 bytes
      cblAddressCountBuffer, // 4 bytes
      originalDataLengthBuffer, // 8 bytes
      tupleSizeBuffer, // 1 byte
      //creatorSignature, // 65 bytes
    ]); // 102 bytes
    if (
      headerWithoutSignature.length !=
      ConstituentBlockListBlock.CblHeaderSizeWithoutSignature
    ) {
      throw new Error('Header length is incorrect');
    }
    const toSign = Buffer.concat([headerWithoutSignature, addressList]);
    const checksum = StaticHelpersChecksum.calculateChecksum(toSign);
    if (signature !== undefined) {
      let validated = false;
      if (creator instanceof BrightChainMember) {
        if (!creator.verify(signature, checksum)) {
          throw new Error('Signature is not valid');
        }
        validated = true;
      }
      return {
        headerData: Buffer.concat([headerWithoutSignature, signature]),
        signature: signature,
        validated,
      };
    } else if (creator instanceof BrightChainMember) {
      const creatorSignature = signature ?? creator.sign(checksum);
      return {
        headerData: Buffer.concat([headerWithoutSignature, creatorSignature]),
        signature: creatorSignature,
        validated: true,
      };
    } else {
      throw new Error(
        'Creator must be a BrightChainMember or a signature must be provided',
      );
    }
  }
  /**
   * Read a CBL header
   * @param data - The data to read
   * @param blockSize - The size of the block
   * @returns The header data
   */
  public static readCBLHeader(
    data: Buffer,
    blockSize: BlockSize,
  ): {
    creatorId: GuidV4;
    creatorSignature: SignatureBuffer;
    dateCreated: Date;
    cblAddressCount: number;
    originalDataLength: bigint;
    tupleSize: number;
  } {
    if (data.length < ConstituentBlockListBlock.CblHeaderSize) {
      throw new Error('Header is too short');
    }
    const creatorLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
    const creatorIdBuffer = data.subarray(
      ConstituentBlockListBlock.CreatorIdOffset,
      creatorLength,
    ) as RawGuidBuffer;
    const creatorId = new GuidV4(creatorIdBuffer);
    const dateCreated = new Date(
      Number(data.readBigInt64BE(ConstituentBlockListBlock.DateCreatedOffset)),
    );
    // if date created is not in the past, error
    if (dateCreated > new Date()) {
      throw new Error('Date created is in the future');
    }
    const cblAddressCount = data.readUInt32BE(
      ConstituentBlockListBlock.CblAddressCountOffset,
    );
    const originalDataLength = data.readBigInt64BE(
      ConstituentBlockListBlock.OriginalDataLengthOffset,
    );
    const tupleSize = data.readUInt8(ConstituentBlockListBlock.TupleSizeOffset);
    const creatorSignature = data.subarray(
      ConstituentBlockListBlock.CreatorSignatureOffset,
      ConstituentBlockListBlock.CblDataOffset,
    ) as SignatureBuffer;
    if (cblAddressCount % tupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }
    // if address count is larger than the max for the block size, error
    const blockSizeIndex = lengthToBlockSizeIndex(blockSize as number);
    const cblBlockMaxIDCountsForBlockSize =
      ConstituentBlockListBlock.CblBlockMaxIDCountsWithEncryption[
        blockSizeIndex
      ];
    if (
      cblAddressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength >
      cblBlockMaxIDCountsForBlockSize
    ) {
      throw new Error(
        'CBL address count is larger than the max for the block size',
      );
    }
    if (cblAddressCount < 0) {
      throw new Error('CBL address count must be positive');
    }
    if (
      originalDataLength < 0 ||
      originalDataLength >
        ConstituentBlockListBlock.maxFileSizesWithCBLAndEncryption[
          blockSizeIndex
        ]
    ) {
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
      tupleSize,
    };
  }
  /**
   * Create a new CBL block from a plaintext buffer
   * @param plaintextData - The plaintext data
   * @param blockSize - The size of the block
   * @returns The new CBL block
   */
  public static newFromPlaintextBuffer(
    plaintextData: Buffer,
    blockSize: BlockSize,
  ) {
    const cblHeaderData = ConstituentBlockListBlock.readCBLHeader(
      plaintextData,
      blockSize,
    );
    return new ConstituentBlockListBlock(
      blockSize,
      cblHeaderData.creatorId,
      cblHeaderData.originalDataLength,
      ConstituentBlockListBlock.GetCBLAddresses(
        ConstituentBlockListBlock.GetCBLAddressData(plaintextData),
      ),
      cblHeaderData.dateCreated,
      cblHeaderData.creatorSignature,
      cblHeaderData.tupleSize,
    );
  }
  /**
   * Create a new CBL block from a base block
   * @param block - The base block
   * @returns The new CBL block
   */
  public static fromBaseBlock(block: BaseBlock): ConstituentBlockListBlock {
    return ConstituentBlockListBlock.newFromPlaintextBuffer(
      block.data,
      block.blockSize,
    );
  }
  /**
   * Create a new CBL block
   * @param blockSize - The size of the block
   * @param creator - The creator of the CBL
   * @param fileDataLength - The length of the file data
   * @param dataAddresses - The addresses of the data blocks
   * @param dateCreated - The date the CBL was created
   * @param signature - The signature of the creator
   * @param tupleSize - The size of the tuples
   */
  constructor(
    blockSize: BlockSize,
    creator: BrightChainMember | GuidV4,
    fileDataLength: bigint,
    dataAddresses: Array<ChecksumBuffer>,
    dateCreated?: Date,
    signature?: SignatureBuffer,
    tupleSize?: number,
  ) {
    if (!dateCreated) {
      dateCreated = new Date();
    }
    const cblAddressCount = dataAddresses.length;
    const addresses = Buffer.concat(dataAddresses);
    const { headerData } = ConstituentBlockListBlock.makeCblHeader(
      creator,
      dateCreated,
      cblAddressCount,
      fileDataLength,
      addresses,
      signature,
      tupleSize,
    );
    const data = Buffer.concat([headerData, addresses]);
    const CblDataSize =
      ConstituentBlockListBlock.CblHeaderSize +
      cblAddressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength;
    super(
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      blockSize,
      data,
      undefined,
      creator,
      dateCreated,
      CblDataSize,
    );
  }
  /**
   *
   * @param creator
   * @returns
   */
  public validateSignature(creator: BrightChainMember): boolean {
    const headerMinusSignature = this.data.subarray(
      0,
      ConstituentBlockListBlock.CblHeaderSizeWithoutSignature,
    );
    const checksum = StaticHelpersChecksum.calculateChecksum(
      Buffer.concat([headerMinusSignature, this.payload]),
    );
    return creator.verify(this.creatorSignature, checksum);
  }

  /**
   * Available capacity for each block size
   */
  public static readonly CblBlockCapacities = blockSizeLengths.map(
    (length) => length - ConstituentBlockListBlock.CblHeaderSize,
  );

  /**
   * Available capacity for each block size with ECIE encryption overhead
   */
  public static readonly CblBlockCapacitiesWithEcieEncryption =
    this.CblBlockCapacities.map(
      (length) => length - StaticHelpersECIES.eciesOverheadLength,
    );

  /**
   * Maximum number of IDs that can be stored in a CBL block for each block size without encryption
   */
  public static readonly CblBlockMaxIDCounts =
    ConstituentBlockListBlock.CblBlockCapacities.map((length) =>
      Math.floor(length / StaticHelpersChecksum.Sha3ChecksumBufferLength),
    );

  /**
   * Maximum number of IDs that can be stored in a CBL block for each block size
   */
  public static readonly CblBlockMaxIDCountsWithEncryption =
    ConstituentBlockListBlock.CblBlockCapacitiesWithEcieEncryption.map(
      (length) =>
        Math.floor(length / StaticHelpersChecksum.Sha3ChecksumBufferLength),
    );

  /**
   * Maximum number of tuples that can be stored in a CBL block for each block size, without encryption
   */
  public static readonly cblBlockMaxTupleCounts =
    ConstituentBlockListBlock.CblBlockMaxIDCounts.map((count) =>
      Math.floor(count / TUPLE_SIZE),
    );

  /**
   * Maximum number of tuples that can be stored in a CBL block for each block size, with encryption
   */
  public static readonly cblBlockMaxTupleCountsWithEncryption =
    ConstituentBlockListBlock.CblBlockMaxIDCountsWithEncryption.map((count) =>
      Math.floor(count / TUPLE_SIZE),
    );

  /**
   * Maximum file sizes for each block size using a CBL and raw blocks
   * Functionally 1/5 the CBL because of the whitening block tuples
   */
  public static readonly maxFileSizesWithCBL =
    ConstituentBlockListBlock.cblBlockMaxTupleCounts.map(
      (count, index) => BigInt(blockSizeLengths[index]) * BigInt(count),
    );

  /**
   * Maximum file sizes for each block size using an encrypted CBL and raw blocks
   * Functionally 1/5 the CBL because of the whitening block tuples
   */
  public static readonly maxFileSizesWithCBLAndEncryption =
    ConstituentBlockListBlock.cblBlockMaxTupleCountsWithEncryption.map(
      (count, index) => BigInt(blockSizeLengths[index]) * BigInt(count),
    );

  /**
   * Given a file size, return the smallest block size that can fit enough addresses to store the file's tuples
   */
  public static fileSizeToCBLBlockSize(
    fileSize: bigint,
    encrypted: boolean,
  ): BlockSize {
    if (fileSize <= 0n) {
      throw new Error(`Invalid fileSize ${fileSize}`);
    }
    const index = encrypted
      ? ConstituentBlockListBlock.maxFileSizesWithCBLAndEncryption.findIndex(
          (size) => size >= fileSize,
        )
      : ConstituentBlockListBlock.maxFileSizesWithCBL.findIndex(
          (size) => size >= fileSize,
        );
    if (index < 0) {
      return BlockSize.Unknown;
    }
    return validBlockSizes[index];
  }

  /**
   * Get the CBL data from a block
   * @param dataWithHeader - The data with the header
   * @returns The CBL data
   */
  public static GetCBLAddressData(dataWithHeader: Buffer): Buffer {
    return dataWithHeader.subarray(ConstituentBlockListBlock.CblDataOffset);
  }

  /**
   * Get the CBL addresses from a block
   * @param dataWithoutHeader - The data without the header
   * @returns The CBL addresses
   */
  public static GetCBLAddresses(
    dataWithoutHeader: Buffer,
  ): Array<ChecksumBuffer> {
    const cblAddressCount = Math.ceil(
      dataWithoutHeader.length / StaticHelpersChecksum.Sha3ChecksumBufferLength,
    );
    const addresses: Array<ChecksumBuffer> = [];
    for (let i = 0; i < cblAddressCount; i++) {
      const address = dataWithoutHeader.subarray(
        i * StaticHelpersChecksum.Sha3ChecksumBufferLength,
        (i + 1) * StaticHelpersChecksum.Sha3ChecksumBufferLength,
      ) as ChecksumBuffer;
      addresses.push(address);
    }
    return addresses;
  }

  /**
   * Get the CBL data from a block
   */
  public get addressData(): Buffer {
    return this.payload;
  }

  /**
   * Get the CBL addresses from a block
   */
  public get addresses(): Array<ChecksumBuffer> {
    return ConstituentBlockListBlock.GetCBLAddresses(this.payload);
  }
  /**
   * The overhead of the block (size of the header)
   */
  public override get overhead(): number {
    return super.overhead + ConstituentBlockListBlock.CblHeaderSize;
  }
  /**
   * The number of addresses in the CBL
   */
  public get cblAddressCount(): number {
    return this.layerOverheadData.readUInt32BE(
      ConstituentBlockListBlock.CblAddressCountOffset,
    );
  }
  /**
   * The length of the original data
   */
  public get originalDataLength(): bigint {
    return this.layerOverheadData.readBigInt64BE(
      ConstituentBlockListBlock.OriginalDataLengthOffset,
    );
  }
  /**
   * The size of the tuples
   */
  public get tupleSize(): number {
    return this.layerOverheadData.readUInt8(
      ConstituentBlockListBlock.TupleSizeOffset,
    );
  }
  /**
   * The creator signature
   */
  public get creatorSignature(): SignatureBuffer {
    return this.layerOverheadData.subarray(
      ConstituentBlockListBlock.CreatorSignatureOffset,
      ConstituentBlockListBlock.CreatorSignatureOffset +
        StaticHelpersECIES.signatureLength,
    ) as SignatureBuffer;
  }
  /**
   * The creator ID
   */
  public override get creatorId(): GuidV4 {
    const superCreatorId = super.creatorId;
    const ourCreatorId = new GuidV4(
      this.layerOverheadData.subarray(
        ConstituentBlockListBlock.CreatorIdOffset,
        ConstituentBlockListBlock.CreatorIdOffset +
          ConstituentBlockListBlock.CreatorLength,
      ) as RawGuidBuffer,
    );
    if (superCreatorId && !superCreatorId.equals(ourCreatorId)) {
      throw new Error('Creator ID mismatch');
    }
    return ourCreatorId;
  }
}
