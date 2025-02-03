import { Readable } from 'stream';
import { BlockMetadata } from '../blockMetadata';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { MAX_TUPLE_SIZE, MIN_TUPLE_SIZE, TUPLE_SIZE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize, lengthToBlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { GuidV4 } from '../guid';
import { IConstituentBlockListBlock } from '../interfaces/cbl';
import { IConstituentBlockListBlockHeader } from '../interfaces/cblHeader';
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
 *
 * Header Structure:
 * [CreatorId][DateCreated][AddressCount][OriginalDataLength][TupleSize][CreatorSignature]
 * Followed by:
 * [Address Data][Padding]
 *
 * The signature is placed at the end of the header and signs both the header fields
 * and the address data that follows, ensuring integrity of the entire structure.
 */
export class ConstituentBlockListBlock
  extends EphemeralBlock
  implements IConstituentBlockListBlock
{
  private readonly _addressData: Buffer;
  private readonly _creatorSignature: SignatureBuffer;

  /**
   * The size of the creator ID in bytes
   */
  public static readonly CreatorLength = GuidV4.guidBrandToLength(
    GuidBrandType.RawGuidBuffer,
  );

  /**
   * Header field offsets
   */
  private static readonly HeaderOffsets = {
    CreatorId: 0,
    DateCreated: ConstituentBlockListBlock.CreatorLength,
    CblAddressCount: ConstituentBlockListBlock.CreatorLength + 8, // DateCreated is 8 bytes
    OriginalDataLength: ConstituentBlockListBlock.CreatorLength + 8 + 4, // AddressCount is 4 bytes
    TupleSize: ConstituentBlockListBlock.CreatorLength + 8 + 4 + 8, // OriginalDataLength is 8 bytes
    CreatorSignature: ConstituentBlockListBlock.CreatorLength + 8 + 4 + 8 + 1, // TupleSize is 1 byte
  };

  /**
   * Header sizes
   */
  public static readonly CblHeaderSize =
    ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
    StaticHelpersECIES.signatureLength;
  public static readonly CblHeaderSizeWithoutSignature =
    ConstituentBlockListBlock.HeaderOffsets.CreatorSignature;

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
    return Math.floor(
      (allowEncryption
        ? dataCapacityWithoutHeaderAndECIES
        : dataCapacityWithoutHeader) /
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
    );
  }

  /**
   * Create a CBL header
   * The signature is placed at the end of the header and signs both the header fields
   * and the address data that follows.
   */
  public static makeCblHeader(
    creator: BrightChainMember | GuidV4,
    dateCreated: Date,
    cblAddressCount: number,
    fileDataLength: bigint,
    addressList: Buffer,
    signature?: SignatureBuffer,
    tupleSize = TUPLE_SIZE,
  ): { headerData: Buffer; signature: SignatureBuffer } {
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeUInt32BE(
      Math.floor(dateCreated.getTime() / 0x100000000),
      0,
    ); // High 32 bits
    dateCreatedBuffer.writeUInt32BE(dateCreated.getTime() % 0x100000000, 4); // Low 32 bits

    const cblAddressCountBuffer = Buffer.alloc(4);
    cblAddressCountBuffer.writeUInt32BE(cblAddressCount);

    const originalDataLengthBuffer = Buffer.alloc(8);
    originalDataLengthBuffer.writeBigInt64BE(fileDataLength);

    const tupleSizeBuffer = Buffer.alloc(1);
    tupleSizeBuffer.writeUInt8(tupleSize);

    // Create header without signature
    const creatorId =
      creator instanceof BrightChainMember
        ? creator.id.asRawGuidBuffer
        : creator.asRawGuidBuffer;

    const headerWithoutSignature = Buffer.concat([
      creatorId,
      dateCreatedBuffer,
      cblAddressCountBuffer,
      originalDataLengthBuffer,
      tupleSizeBuffer,
    ]);

    // Sign header + address list
    const toSign = Buffer.concat([headerWithoutSignature, addressList]);
    const checksum = StaticHelpersChecksum.calculateChecksum(toSign);

    let finalSignature: SignatureBuffer;
    if (creator instanceof BrightChainMember) {
      if (signature) {
        // Always strip 0x04 prefix for verification since verifyMessage expects raw key
        const publicKeyForVerification = Buffer.from(
          creator.publicKey[0] === 0x04
            ? creator.publicKey.subarray(1)
            : creator.publicKey,
        );

        if (
          !StaticHelpersECIES.verifyMessage(
            publicKeyForVerification,
            checksum,
            signature,
          )
        ) {
          throw new Error('Invalid signature provided');
        }
        finalSignature = signature;
      } else {
        finalSignature = StaticHelpersECIES.signMessage(
          creator.privateKey,
          checksum,
        );
      }
    } else {
      // For GuidV4 creators, either use provided signature or create empty one
      finalSignature =
        signature ??
        (Buffer.alloc(StaticHelpersECIES.signatureLength) as SignatureBuffer);
    }

    // Place signature at end of header
    const headerData = Buffer.concat([headerWithoutSignature, finalSignature]);

    return {
      headerData,
      signature: finalSignature,
    };
  }

  /**
   * Create a new CBL block
   */
  constructor(
    creator: BrightChainMember | GuidV4,
    metadata: CblBlockMetadata,
    data: Buffer,
    checksum: ChecksumBuffer,
    signature?: SignatureBuffer,
  ) {
    super(
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      data,
      checksum,
      metadata,
      true, // canRead
      true, // canPersist
    );

    // Get address count and validate tuple size
    const addressCount = data.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
    const tupleSize = data.readUInt8(
      ConstituentBlockListBlock.HeaderOffsets.TupleSize,
    );
    if (addressCount % tupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }

    // Store address data (without padding) and signature
    const addressLength =
      addressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength;
    this._addressData = data.subarray(
      ConstituentBlockListBlock.CblHeaderSize,
      ConstituentBlockListBlock.CblHeaderSize + addressLength,
    );
    this._creatorSignature = data.subarray(
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
        StaticHelpersECIES.signatureLength,
    ) as SignatureBuffer;

    // Store creator for signature validation
    if (creator instanceof BrightChainMember && signature) {
      // Only validate if a signature was explicitly provided
      // Otherwise the signature was just generated in makeCblHeader
      const headerWithoutSignature = data.subarray(
        0,
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      );
      const toVerify = Buffer.concat([
        headerWithoutSignature,
        this._addressData,
      ]);
      const checksum = StaticHelpersChecksum.calculateChecksum(toVerify);

      // Always strip 0x04 prefix for verification since verifyMessage expects raw key
      const publicKeyForVerification = Buffer.from(
        creator.publicKey[0] === 0x04
          ? creator.publicKey.subarray(1)
          : creator.publicKey,
      );

      // Only validate if the signature wasn't generated by makeCblHeader
      const signatureFromHeader = data.subarray(
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
          StaticHelpersECIES.signatureLength,
      ) as SignatureBuffer;

      if (
        !signatureFromHeader.equals(signature) &&
        !StaticHelpersECIES.verifyMessage(
          publicKeyForVerification,
          checksum,
          this._creatorSignature,
        )
      ) {
        throw new Error('Invalid creator signature');
      }
    }
  }

  /**
   * Get the CBL block IDs
   */
  public getCblBlockIds(): Array<ChecksumBuffer> {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const addressCount = this.cblAddressCount;
    const checksumLength = StaticHelpersChecksum.Sha3ChecksumBufferLength;
    const blockIds: Array<ChecksumBuffer> = [];

    for (let i = 0; i < addressCount; i++) {
      const start = i * checksumLength;
      const end = start + checksumLength;
      blockIds.push(this._addressData.subarray(start, end) as ChecksumBuffer);
    }

    return blockIds;
  }

  /**
   * Get Block Handle Tuples for the CBL block
   */
  public async getHandleTuples(
    getDiskBlockPath: (id: ChecksumBuffer, blockSize: BlockSize) => string,
  ): Promise<Array<BlockHandleTuple>> {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const handleTuples: Array<BlockHandleTuple> = [];
    const blockIds = this.getCblBlockIds();

    for (let i = 0; i < blockIds.length; i += this.tupleSize) {
      const tupleIds = blockIds.slice(i, i + this.tupleSize);
      const handles = await Promise.all(
        tupleIds.map((id) =>
          BlockHandle.createFromPath(
            getDiskBlockPath(id, this.blockSize),
            new BlockMetadata(
              this._blockSize,
              this._blockType,
              this._blockDataType,
              this._data.length,
            ),
            id,
            true, // canRead
            true, // canPersist
          ),
        ),
      );
      handleTuples.push(new BlockHandleTuple(handles));
    }

    return handleTuples;
  }

  /**
   * Validate the creator's signature
   * @param data The full block data
   * @param creator The creator of the CBL with public key
   * @returns True if the signature is valid
   */
  public static ValidateSignature(
    data: Buffer,
    creator: BrightChainMember,
  ): boolean {
    // Get the header without signature
    const headerWithoutSignature = data.subarray(
      0,
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
    );

    // Get the address list
    const addressList = data.subarray(ConstituentBlockListBlock.CblHeaderSize);

    // Create the data to verify (same as what was signed in makeCblHeader)
    const toVerify = Buffer.concat([headerWithoutSignature, addressList]);
    const checksum = StaticHelpersChecksum.calculateChecksum(toVerify);

    // Get the signature from the data
    const signature = data.subarray(
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
        StaticHelpersECIES.signatureLength,
    ) as SignatureBuffer;

    // Always strip 0x04 prefix for verification since verifyMessage expects raw key
    const publicKeyForVerification = Buffer.from(
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey,
    );

    return StaticHelpersECIES.verifyMessage(
      publicKeyForVerification,
      checksum,
      signature,
    );
  }

  /**
   * Validate the creator's signature
   * The signature covers both the header fields and the address data
   */
  public validateSignature(): boolean {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    if (!this.creator) {
      throw new Error('Creator is required for signature validation');
    }

    const headerWithoutSignature = this.data.subarray(
      0,
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
    );
    const toVerify = Buffer.concat([headerWithoutSignature, this._addressData]);
    const checksum = StaticHelpersChecksum.calculateChecksum(toVerify);

    // Always strip 0x04 prefix for verification since verifyMessage expects raw key
    const publicKeyForVerification = Buffer.from(
      this.creator.publicKey[0] === 0x04
        ? this.creator.publicKey.subarray(1)
        : this.creator.publicKey,
    );

    const result = StaticHelpersECIES.verifyMessage(
      publicKeyForVerification,
      checksum,
      this._creatorSignature,
    );

    return result;
  }

  /**
   * Get the raw address data buffer
   */
  public get addressData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._addressData;
  }

  /**
   * Get the CBL addresses
   */
  public get addresses(): Array<ChecksumBuffer> {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const addressCount = this.cblAddressCount;
    const checksumLength = StaticHelpersChecksum.Sha3ChecksumBufferLength;
    const addresses: Array<ChecksumBuffer> = [];

    for (let i = 0; i < addressCount; i++) {
      const start = i * checksumLength;
      const end = start + checksumLength;
      addresses.push(this._addressData.subarray(start, end) as ChecksumBuffer);
    }

    return addresses;
  }

  /**
   * The number of addresses in the CBL
   */
  public get cblAddressCount(): number {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const addressCount = this.layerHeaderData.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
    if (
      addressCount < 0 ||
      addressCount >
        ConstituentBlockListBlock.CalculateCBLAddressCapacity(this.blockSize)
    ) {
      throw new Error('Invalid CBL address count');
    }
    return addressCount;
  }

  /**
   * The length of the original data
   */
  public get originalDataLength(): bigint {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const dataLength = this.layerHeaderData.readBigInt64BE(
      ConstituentBlockListBlock.HeaderOffsets.OriginalDataLength,
    );
    if (dataLength < 0n) {
      throw new Error('Original data length cannot be negative');
    }
    return dataLength;
  }

  /**
   * The size of the tuples
   */
  public get tupleSize(): number {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const tupleSize = this.layerHeaderData.readUInt8(
      ConstituentBlockListBlock.HeaderOffsets.TupleSize,
    );
    if (tupleSize < MIN_TUPLE_SIZE || tupleSize > MAX_TUPLE_SIZE) {
      throw new Error(
        `Tuple size must be between ${MIN_TUPLE_SIZE} and ${MAX_TUPLE_SIZE}`,
      );
    }
    return tupleSize;
  }

  /**
   * The creator signature
   * Located at the end of the header, just before the address data
   */
  public get creatorSignature(): SignatureBuffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._creatorSignature;
  }

  /**
   * Get this layer's header data
   * Returns the CBL header including signature
   */
  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this.data.subarray(0, ConstituentBlockListBlock.CblHeaderSize);
  }

  /**
   * Get the complete header data from all layers
   */
  public override get fullHeaderData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return Buffer.concat([super.fullHeaderData, this.layerHeaderData]);
  }

  /**
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    return this.blockSize - this.totalOverhead;
  }

  /**
   * Synchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If checksums do not match
   */
  public override validateSync(): void {
    // Call parent validation first
    super.validateSync();

    // Validate signature if creator exists
    if (this.creator && !this.validateSignature()) {
      throw new Error('Invalid creator signature');
    }

    // Validate CBL-specific fields
    if (
      this.cblAddressCount < 0 ||
      this.cblAddressCount % this.tupleSize !== 0
    ) {
      throw new Error('Invalid CBL address count');
    }

    if (this.originalDataLength < 0n) {
      throw new Error('Original data length cannot be negative');
    }

    if (this.tupleSize < MIN_TUPLE_SIZE || this.tupleSize > MAX_TUPLE_SIZE) {
      throw new Error(
        `Tuple size must be between ${MIN_TUPLE_SIZE} and ${MAX_TUPLE_SIZE}`,
      );
    }

    // Validate date
    if (this.dateCreated > new Date()) {
      throw new Error('Date created cannot be in the future');
    }
  }

  /**
   * Get the creator ID
   */
  public override get creatorId(): GuidV4 {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const creatorId = new GuidV4(
      this.layerHeaderData.subarray(
        ConstituentBlockListBlock.HeaderOffsets.CreatorId,
        ConstituentBlockListBlock.HeaderOffsets.CreatorId +
          ConstituentBlockListBlock.CreatorLength,
      ) as RawGuidBuffer,
    );
    return creatorId;
  }

  public override get dateCreated(): Date {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const dateHigh = this.layerHeaderData.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.DateCreated,
    );
    const dateLow = this.layerHeaderData.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.DateCreated + 4,
    );
    const dateCreated = new Date(
      Number((BigInt(dateHigh) << 32n) | BigInt(dateLow)),
    );
    if (isNaN(dateCreated.getTime())) {
      throw new Error('Invalid date created');
    } else if (dateCreated > new Date()) {
      throw new Error('Date created cannot be in the future');
    }
    return dateCreated;
  }

  /**
   * Parse a CBL header
   * @param data The raw block data (full block with data and padding)
   * @returns The CBL header fields
   */
  public static parseHeader(
    data: Buffer,
    creatorForValidation?: BrightChainMember,
  ): IConstituentBlockListBlockHeader {
    // guid self validates
    const creatorId = new GuidV4(
      data.subarray(
        ConstituentBlockListBlock.HeaderOffsets.CreatorId,
        ConstituentBlockListBlock.HeaderOffsets.CreatorId +
          ConstituentBlockListBlock.CreatorLength,
      ) as RawGuidBuffer,
    );
    if (creatorForValidation && !creatorForValidation.id.equals(creatorId)) {
      throw new Error('Creator ID mismatch');
    }
    const dateHigh = data.readUint32BE(
      ConstituentBlockListBlock.HeaderOffsets.DateCreated,
    );
    const dateLow = data.readUint32BE(
      ConstituentBlockListBlock.HeaderOffsets.DateCreated + 4,
    );
    const dateCreated = new Date(
      Number((BigInt(dateHigh) << 32n) | BigInt(dateLow)),
    );
    if (isNaN(dateCreated.getTime())) {
      throw new Error('Invalid date created');
    } else if (dateCreated > new Date()) {
      throw new Error('Date created cannot be in the future');
    }
    const cblAddressCount = data.readUint32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
    if (
      cblAddressCount < 0 ||
      cblAddressCount >
        ConstituentBlockListBlock.CalculateCBLAddressCapacity(
          lengthToBlockSize(data.length),
        )
    ) {
      throw new Error('Invalid CBL address count');
    }
    const originalDataLength = data.readBigInt64BE(
      ConstituentBlockListBlock.HeaderOffsets.OriginalDataLength,
    );
    if (originalDataLength < 0n) {
      throw new Error('Original data length cannot be negative');
    }
    const tupleSize = data.readUint8(
      ConstituentBlockListBlock.HeaderOffsets.TupleSize,
    );
    if (tupleSize < MIN_TUPLE_SIZE || tupleSize > MAX_TUPLE_SIZE) {
      throw new Error(
        `Tuple size must be between ${MIN_TUPLE_SIZE} and ${MAX_TUPLE_SIZE}`,
      );
    }
    const creatorSignature = data.subarray(
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
        StaticHelpersECIES.signatureLength,
    ) as SignatureBuffer;
    if (
      creatorForValidation &&
      !ConstituentBlockListBlock.ValidateSignature(data, creatorForValidation)
    ) {
      throw new Error('Invalid creator signature');
    }

    return {
      creatorId,
      dateCreated,
      cblAddressCount,
      originalDataLength,
      tupleSize,
      creatorSignature,
    };
  }

  /**
   * Create a CBL block from a buffer
   * @param block - The block to convert
   * @param creator - The creator of the block
   * @returns The CBL block
   */
  public static fromBaseBlockBuffer(
    block: BaseBlock,
    creator: BrightChainMember,
  ): ConstituentBlockListBlock {
    if (block.data instanceof Readable) {
      throw new Error('Block.data must be a buffer');
    }
    const metadata = ConstituentBlockListBlock.parseHeader(block.data, creator);
    const addressData = block.data.subarray(
      ConstituentBlockListBlock.CblHeaderSize,
    );
    const cblMetadata: CblBlockMetadata = new CblBlockMetadata(
      block.blockSize,
      block.blockType,
      block.blockDataType,
      addressData.length,
      metadata.originalDataLength,
      metadata.dateCreated,
      creator,
    );
    return new ConstituentBlockListBlock(
      creator,
      cblMetadata,
      block.data,
      block.idChecksum,
      metadata.creatorSignature,
    );
  }
}
