import { BlockMetadata } from '../blockMetadata';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { TUPLE_SIZE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize, lengthToBlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { GuidV4 } from '../guid';
import { IConstituentBlockListBlock } from '../interfaces/cbl';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer, SignatureBuffer } from '../types';
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
  public static readonly SignatureSize = StaticHelpersECIES.signatureLength;
  public static readonly CblHeaderSizeWithoutSignature =
    ConstituentBlockListBlock.HeaderOffsets.CreatorSignature;
  public static readonly CblHeaderSize =
    ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
    ConstituentBlockListBlock.SignatureSize;

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
      ? StaticHelpersECIES.eciesOverheadLength
      : 0;
    const availableSpace = blockRawCapacity - headerSize - encryptionOverhead;

    // Calculate how many addresses can fit
    const addressSize = StaticHelpersChecksum.Sha3ChecksumBufferLength;
    const addressCapacity = Math.floor(availableSpace / addressSize);

    // Ensure capacity is a multiple of tuple size
    return Math.floor(addressCapacity / TUPLE_SIZE) * TUPLE_SIZE;
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

    // Sign header + address list + block size
    const blockSizeBuffer = Buffer.alloc(4);
    blockSizeBuffer.writeUInt32BE(blockSize);
    const toSign = Buffer.concat([
      headerWithoutSignature,
      addressList,
      blockSizeBuffer,
    ]);
    const checksum = StaticHelpersChecksum.calculateChecksum(toSign);

    let finalSignature: SignatureBuffer;
    if (creator instanceof BrightChainMember) {
      if (signature) {
        // Use the public key as-is for verification
        if (
          !StaticHelpersECIES.verifyMessage(
            creator.publicKey,
            checksum,
            signature,
          )
        ) {
          throw new Error('Invalid signature provided');
        }
        finalSignature = Buffer.from(signature) as SignatureBuffer;
      } else {
        // Create signature with private key
        const privateKeyBuffer = Buffer.from(creator.privateKey);
        finalSignature = StaticHelpersECIES.signMessage(
          privateKeyBuffer,
          checksum,
        );
      }
    } else {
      // For GuidV4 creators, either use provided signature or create empty one
      finalSignature = signature
        ? (Buffer.from(signature) as SignatureBuffer)
        : (Buffer.alloc(StaticHelpersECIES.signatureLength) as SignatureBuffer);
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
      throw new Error('Creator must be provided for signature validation');
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
          StaticHelpersECIES.signatureLength,
      ),
    ) as SignatureBuffer;

    // Get the data to verify (header without signature + address data + block size)
    const addressCount = data.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
    const addressLength =
      addressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength;
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
    const checksum = StaticHelpersChecksum.calculateChecksum(toVerify);

    return StaticHelpersECIES.verifyMessage(
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
      throw new Error('CBL address count must be a multiple of TupleSize');
    }

    // Verify address count is within capacity
    const maxAddresses = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      this.blockSize,
      false, // Don't account for encryption overhead since this is raw data
    );
    if (addressCount > maxAddresses) {
      throw new Error('Address count exceeds block capacity');
    }

    // Store creator for signature validation
    if (creator instanceof BrightChainMember && signature) {
      // Only validate if a signature was explicitly provided
      // Otherwise the signature was just generated in makeCblHeader
      const signatureFromHeader = Buffer.from(
        data.subarray(
          ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
          ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
            StaticHelpersECIES.signatureLength,
        ),
      ) as SignatureBuffer;

      // If the provided signature doesn't match what's in the header,
      // validate the signature
      if (!signatureFromHeader.equals(signature)) {
        if (!ConstituentBlockListBlock.validateSignature(data, creator)) {
          throw new Error('Invalid creator signature');
        }
      }
    }

    this._creatorSignature = Buffer.from(
      data.subarray(
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
          StaticHelpersECIES.signatureLength,
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
      const verifyChecksum = StaticHelpersChecksum.calculateChecksum(toVerify);
      if (
        !StaticHelpersECIES.verifyMessage(
          creator.publicKey,
          verifyChecksum,
          this._creatorSignature,
        )
      ) {
        throw new Error('Invalid signature');
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
    const checksumLength = StaticHelpersChecksum.Sha3ChecksumBufferLength;
    const addressLength = addressCount * checksumLength;
    const start = ConstituentBlockListBlock.CblHeaderSize;
    const end = start + addressLength;

    // Verify address count is within capacity
    const maxAddresses = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      this.blockSize,
      false, // Don't account for encryption overhead since this is raw data
    );
    if (addressCount > maxAddresses) {
      throw new Error('Address count exceeds block capacity');
    }

    // Verify we have enough data
    if (end > data.length) {
      throw new Error('Data buffer is truncated');
    }

    // Extract address data and create a new buffer to avoid sharing references
    const addressData = Buffer.from(data.subarray(start, end));

    // Verify each address has the correct length
    for (let i = 0; i < addressCount; i++) {
      const s = i * checksumLength;
      const e = s + checksumLength;
      const addr = addressData.subarray(s, e);
      if (addr.length !== checksumLength) {
        throw new Error(
          `Invalid address length at index ${i}: ${addr.length}, expected: ${checksumLength}`,
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
      throw new Error('Block cannot be read');
    }
    const addressCount = this._cblAddressCount;
    const checksumLength = StaticHelpersChecksum.Sha3ChecksumBufferLength;
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
      throw new Error('Block cannot be read');
    }
    const handleTuples: Array<BlockHandleTuple> = [];
    const blockIds = this.getCblBlockIds();

    for (let i = 0; i < blockIds.length; i += this._tupleSize) {
      const tupleIds = blockIds.slice(i, i + this._tupleSize);
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
   * Get the raw address data
   */
  public get addressData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return Buffer.from(this._addressData);
  }

  /**
   * Get the CBL addresses
   */
  public get addresses(): Array<ChecksumBuffer> {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this.getCblBlockIds();
  }

  /**
   * Get the number of addresses in the CBL
   */
  public get cblAddressCount(): number {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._cblAddressCount;
  }

  /**
   * Get the creator signature
   */
  public get creatorSignature(): SignatureBuffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return Buffer.from(this._creatorSignature) as SignatureBuffer;
  }

  /**
   * Get the creator ID
   */
  public override get creatorId(): GuidV4 {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._blockCreatorId;
  }

  /**
   * Get the original data length
   */
  public get originalDataLength(): bigint {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._originalDataLength;
  }

  /**
   * Get the tuple size
   */
  public get tupleSize(): number {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._tupleSize;
  }

  /**
   * Validate the block's signature
   * @param creator The creator to validate against
   * @returns True if the signature is valid
   */
  public validateSignature(creator: BrightChainMember): boolean {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }

    if (!creator) {
      throw new Error('Creator must be provided for signature validation');
    }

    return ConstituentBlockListBlock.validateSignature(
      this.data,
      creator,
      this.blockSize,
    );
  }
}
