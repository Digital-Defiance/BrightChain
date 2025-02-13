import { Readable } from 'stream';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { CHECKSUM, TUPLE } from '../constants';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize, lengthToBlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { BlockAccessError, BlockValidationError } from '../errors/block';
import { GuidV4 } from '../guid';
import { IConstituentBlockListBlock } from '../interfaces/cbl';
import { IConstituentBlockListBlockHeader } from '../interfaces/cblHeader';
import { ChecksumBuffer, RawGuidBuffer, SignatureBuffer } from '../types';
import { BaseBlock } from './base';
import { BlockHandle } from './handle';
import { BlockHandleTuple } from './handleTuple';
import { OwnedDataBlock } from './ownedData';

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
  extends OwnedDataBlock
  implements IConstituentBlockListBlock
{
  /**
   * The size of the creator ID in bytes
   */
  public static readonly CreatorLength = GuidV4.guidBrandToLength(
    GuidBrandType.RawGuidBuffer,
  );

  /**
   * Header field offsets
   */
  public static readonly HeaderOffsets = {
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
  private static getSignatureSize() {
    ConstituentBlockListBlock.initialize();
    return ConstituentBlockListBlock.eciesService.signatureLength;
  }

  public static get CblHeaderSizeWithoutSignature(): number {
    return ConstituentBlockListBlock.HeaderOffsets.CreatorSignature;
  }

  public static get CblHeaderSize(): number {
    return (
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
      ConstituentBlockListBlock.getSignatureSize()
    );
  }

  /**
   * Calculate the capacity of a CBL block for addresses, with or without encryption overhead.
   * Returns the number of addresses it can contain
   */
  public static CalculateCBLAddressCapacity(
    blockSize: BlockSize,
    allowEncryption = true,
  ): number {
    // Calculate available space for addresses
    const blockRawCapacity = blockSize as number;
    const headerSize = ConstituentBlockListBlock.CblHeaderSize;
    const encryptionOverhead = allowEncryption
      ? ConstituentBlockListBlock.eciesService.eciesOverheadLength
      : 0;
    const availableSpace = blockRawCapacity - headerSize - encryptionOverhead;

    // Calculate how many addresses can fit
    const addressSize = CHECKSUM.SHA3_BUFFER_LENGTH;
    const addressCapacity = Math.floor(availableSpace / addressSize);

    // Ensure capacity is a multiple of tuple size
    return Math.floor(addressCapacity / TUPLE.SIZE) * TUPLE.SIZE;
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
    blockSize: BlockSize,
    signature?: SignatureBuffer,
    tupleSize = TUPLE.SIZE,
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

    // Sign header + address list + block size
    const blockSizeBuffer = Buffer.alloc(4);
    blockSizeBuffer.writeUInt32BE(blockSize);
    const toSign = Buffer.concat([
      headerWithoutSignature,
      addressList,
      blockSizeBuffer,
    ]);
    ConstituentBlockListBlock.initialize();
    const checksum =
      ConstituentBlockListBlock.checksumService.calculateChecksum(toSign);

    let finalSignature: SignatureBuffer;
    if (creator instanceof BrightChainMember) {
      if (signature) {
        // Use the public key as-is for verification
        if (
          !ConstituentBlockListBlock.eciesService.verifyMessage(
            creator.publicKey,
            checksum,
            signature,
          )
        ) {
          throw new BlockValidationError(
            BlockValidationErrorType.InvalidSignature,
          );
        }
        finalSignature = Buffer.from(signature) as SignatureBuffer;
      } else {
        // Create signature with private key
        const privateKeyBuffer = Buffer.from(creator.privateKey);
        finalSignature = ConstituentBlockListBlock.eciesService.signMessage(
          privateKeyBuffer,
          checksum,
        );
      }
    } else {
      // For GuidV4 creators, either use provided signature or create empty one
      finalSignature = signature
        ? (Buffer.from(signature) as SignatureBuffer)
        : (Buffer.alloc(
            ConstituentBlockListBlock.eciesService.signatureLength,
          ) as SignatureBuffer);
    }

    // Place signature at end of header
    const headerData = Buffer.concat([headerWithoutSignature, finalSignature]);

    return {
      headerData,
      signature: finalSignature,
    };
  }

  /**
   * Validate a block's signature
   * @param data The full block data
   * @param creator The creator with public key for verification
   * @returns True if the signature is valid
   */
  public static validateSignature(
    data: Buffer,
    creator: BrightChainMember,
    blockSize?: BlockSize,
  ): boolean {
    if (!creator) {
      throw new BlockAccessError(BlockAccessErrorType.CreatorMustBeProvided);
    }

    // Get the header without signature
    const headerWithoutSignature = Buffer.from(
      data.subarray(
        0,
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      ),
    );

    // Get the signature from the data
    const signature = Buffer.from(
      data.subarray(
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
          ConstituentBlockListBlock.eciesService.signatureLength,
      ),
    ) as SignatureBuffer;

    // Get the data to verify (header without signature + address data + block size)
    const addressCount = data.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
    const addressLength = addressCount * CHECKSUM.SHA3_BUFFER_LENGTH;
    const addressData = data.subarray(
      ConstituentBlockListBlock.CblHeaderSize,
      ConstituentBlockListBlock.CblHeaderSize + addressLength,
    );
    const blockSizeBuffer = Buffer.alloc(4);
    // Use the provided block size or try to determine it from data length
    const effectiveBlockSize = blockSize ?? lengthToBlockSize(data.length);
    blockSizeBuffer.writeUInt32BE(effectiveBlockSize);
    const toVerify = Buffer.concat([
      headerWithoutSignature,
      addressData,
      blockSizeBuffer,
    ]);

    // Calculate checksum and verify signature
    ConstituentBlockListBlock.initialize();
    const checksum =
      ConstituentBlockListBlock.checksumService.calculateChecksum(toVerify);

    return ConstituentBlockListBlock.eciesService.verifyMessage(
      creator.publicKey,
      checksum,
      signature,
    );
  }

  private _addressData: Buffer;
  private _cblAddressCount: number;
  private _creatorSignature: SignatureBuffer;
  private _originalDataLength: bigint;
  private _tupleSize: number;
  private readonly _blockCreatorId: GuidV4;

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

    // Store creator ID
    this._blockCreatorId =
      creator instanceof BrightChainMember ? creator.id : creator;

    // Validate tuple size
    const addressCount = data.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
    const tupleSize = data.readUInt8(
      ConstituentBlockListBlock.HeaderOffsets.TupleSize,
    );
    if (addressCount % tupleSize !== 0) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidCBLAddressCount,
      );
    }

    // Verify address count is within capacity
    const maxAddresses = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      this.blockSize,
      false, // Don't account for encryption overhead since this is raw data
    );
    if (addressCount > maxAddresses) {
      throw new BlockValidationError(
        BlockValidationErrorType.AddressCountExceedsCapacity,
      );
    }

    // Store creator for signature validation
    if (creator instanceof BrightChainMember && signature) {
      // Only validate if a signature was explicitly provided
      // Otherwise the signature was just generated in makeCblHeader
      const signatureFromHeader = Buffer.from(
        data.subarray(
          ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
          ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
            ConstituentBlockListBlock.eciesService.signatureLength,
        ),
      ) as SignatureBuffer;

      // If the provided signature doesn't match what's in the header,
      // validate the signature
      if (!signatureFromHeader.equals(signature)) {
        if (!ConstituentBlockListBlock.validateSignature(data, creator)) {
          throw new BlockValidationError(
            BlockValidationErrorType.InvalidSignature,
          );
        }
      }
    }

    this._creatorSignature = Buffer.from(
      data.subarray(
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
          ConstituentBlockListBlock.eciesService.signatureLength,
      ),
    ) as SignatureBuffer;

    // Extract address data before signature validation
    this._addressData = this.extractAddressData(data);
    this._cblAddressCount = addressCount;
    this._originalDataLength = data.readBigInt64BE(
      ConstituentBlockListBlock.HeaderOffsets.OriginalDataLength,
    );
    this._tupleSize = tupleSize;

    // Verify the signature matches what validateSignature() expects
    if (creator instanceof BrightChainMember) {
      const blockSizeBuffer = Buffer.alloc(4);
      blockSizeBuffer.writeUInt32BE(this.blockSize);
      const toVerify = Buffer.concat([
        data.subarray(
          0,
          ConstituentBlockListBlock.CblHeaderSizeWithoutSignature,
        ),
        this._addressData,
        blockSizeBuffer,
      ]);
      const verifyChecksum =
        ConstituentBlockListBlock.checksumService.calculateChecksum(toVerify);
      if (
        !ConstituentBlockListBlock.eciesService.verifyMessage(
          creator.publicKey,
          verifyChecksum,
          this._creatorSignature,
        )
      ) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidSignature,
        );
      }
    }
  }

  /**
   * Extract the address data from the raw block data
   */
  private extractAddressData(data: Buffer): Buffer {
    const addressCount = data.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
    const checksumLength = CHECKSUM.SHA3_BUFFER_LENGTH;
    const addressLength = addressCount * checksumLength;
    const start = ConstituentBlockListBlock.CblHeaderSize;
    const end = start + addressLength;

    // Verify address count is within capacity
    const maxAddresses = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      this.blockSize,
      false, // Don't account for encryption overhead since this is raw data
    );
    if (addressCount > maxAddresses) {
      throw new BlockValidationError(
        BlockValidationErrorType.AddressCountExceedsCapacity,
      );
    }

    // Verify we have enough data
    if (end > data.length) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataBufferIsTruncated,
      );
    }

    // Extract address data and create a new buffer to avoid sharing references
    const addressData = Buffer.from(data.subarray(start, end));

    // Verify each address has the correct length
    for (let i = 0; i < addressCount; i++) {
      const s = i * checksumLength;
      const e = s + checksumLength;
      const addr = addressData.subarray(s, e);
      if (addr.length !== checksumLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidAddressLength,
          undefined,
          {
            index: i,
            length: addr.length,
            expectedLength: checksumLength,
          },
        );
      }
    }

    return addressData;
  }

  /**
   * Get the CBL block IDs
   */
  public getCblBlockIds(): Array<ChecksumBuffer> {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const addressCount = this._cblAddressCount;
    const checksumLength = CHECKSUM.SHA3_BUFFER_LENGTH;
    const blockIds: Array<ChecksumBuffer> = [];

    for (let i = 0; i < addressCount; i++) {
      const start = i * checksumLength;
      const end = start + checksumLength;
      const addressBuffer = this._addressData.subarray(start, end);
      // Create a new buffer to avoid sharing references
      blockIds.push(Buffer.from(addressBuffer) as ChecksumBuffer);
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
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const handleTuples: Array<BlockHandleTuple> = [];
    const blockIds = this.getCblBlockIds();

    for (let i = 0; i < blockIds.length; i += this._tupleSize) {
      const tupleIds = blockIds.slice(i, i + this._tupleSize);
      const handles = await Promise.all(
        tupleIds.map((id) =>
          BlockHandle.createFromPath(
            getDiskBlockPath(id, this.blockSize),
            this.blockSize,
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
   * Get the raw address data
   */
  public get addressData(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return Buffer.from(this._addressData);
  }

  /**
   * Get the CBL addresses
   */
  public get addresses(): Array<ChecksumBuffer> {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this.getCblBlockIds();
  }

  /**
   * Get the number of addresses in the CBL
   */
  public get cblAddressCount(): number {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._cblAddressCount;
  }

  /**
   * Get the creator signature
   */
  public get creatorSignature(): SignatureBuffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return Buffer.from(this._creatorSignature) as SignatureBuffer;
  }

  /**
   * Get the creator ID
   */
  public override get creatorId(): GuidV4 {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._blockCreatorId;
  }

  /**
   * Get the original data length
   */
  public get originalDataLength(): bigint {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._originalDataLength;
  }

  /**
   * Get the tuple size
   */
  public get tupleSize(): number {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._tupleSize;
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
      throw new BlockValidationError(
        BlockValidationErrorType.CreatorIDMismatch,
      );
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
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidDateCreated,
      );
    } else if (dateCreated > new Date()) {
      throw new BlockValidationError(
        BlockValidationErrorType.FutureCreationDate,
      );
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
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidCBLAddressCount,
      );
    }
    const originalDataLength = data.readBigInt64BE(
      ConstituentBlockListBlock.HeaderOffsets.OriginalDataLength,
    );
    if (originalDataLength < 0n) {
      throw new BlockValidationError(
        BlockValidationErrorType.OriginalDataLengthNegative,
      );
    }
    const tupleSize = data.readUint8(
      ConstituentBlockListBlock.HeaderOffsets.TupleSize,
    );
    if (tupleSize < TUPLE.MIN_SIZE || tupleSize > TUPLE.MAX_SIZE) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidTupleSize);
    }
    const creatorSignature = data.subarray(
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
        ConstituentBlockListBlock.eciesService.signatureLength,
    ) as SignatureBuffer;
    ConstituentBlockListBlock.initialize();
    if (
      creatorForValidation &&
      !ConstituentBlockListBlock.validateSignature(data, creatorForValidation)
    ) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidSignature);
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
      throw new BlockValidationError(
        BlockValidationErrorType.BlockDataNotBuffer,
      );
    }
    const metadata = ConstituentBlockListBlock.parseHeader(block.data, creator);
    const cblMetadata: CblBlockMetadata = new CblBlockMetadata(
      block.blockSize,
      block.blockType,
      block.blockDataType,
      block.metadata.lengthWithoutPadding,
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

  /**
   * Validate the block's signature
   * @param creator The creator to validate against
   * @returns True if the signature is valid
   */
  public validateSignature(creator: BrightChainMember): boolean {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }

    if (!creator) {
      throw new BlockAccessError(BlockAccessErrorType.CreatorMustBeProvided);
    }

    return ConstituentBlockListBlock.validateSignature(
      this.data,
      creator,
      this.blockSize,
    );
  }
}
