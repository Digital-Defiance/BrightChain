import { BrightChainMember } from '../brightChainMember';
import { TUPLE_SIZE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidBrandType } from '../enumerations/guidBrandType';
import { GuidV4 } from '../guid';
import { IConstituentBlockListBlock } from '../interfaces/cbl';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer, RawGuidBuffer, SignatureBuffer } from '../types';
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
  private static makeCblHeader(
    creator: BrightChainMember | GuidV4,
    dateCreated: Date,
    cblAddressCount: number,
    originalDataLength: bigint,
    addressList: Buffer,
    signature?: SignatureBuffer,
    tupleSize = TUPLE_SIZE,
  ): { headerData: Buffer; signature: SignatureBuffer } {
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeBigInt64BE(BigInt(dateCreated.getTime()));

    const cblAddressCountBuffer = Buffer.alloc(4);
    cblAddressCountBuffer.writeUInt32BE(cblAddressCount);

    const originalDataLengthBuffer = Buffer.alloc(8);
    originalDataLengthBuffer.writeBigInt64BE(originalDataLength);

    const tupleSizeBuffer = Buffer.alloc(1);
    tupleSizeBuffer.writeUInt8(tupleSize);

    // Create header without signature
    const headerWithoutSignature = Buffer.concat([
      creator instanceof BrightChainMember
        ? creator.id.asRawGuidBuffer
        : creator.asRawGuidBuffer,
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
        // Handle public key with or without 0x04 prefix for verification
        const publicKey = creator.publicKey;
        const publicKeyForVerification =
          publicKey[0] === 0x04
            ? publicKey
            : Buffer.concat([Buffer.from([0x04]), publicKey]);

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
    return {
      headerData: Buffer.concat([headerWithoutSignature, finalSignature]),
      signature: finalSignature,
    };
  }

  /**
   * Create a new CBL block
   */
  constructor(
    blockSize: BlockSize,
    creator: BrightChainMember | GuidV4,
    fileDataLength: bigint,
    dataAddresses: Array<ChecksumBuffer>,
    dateCreated?: Date,
    signature?: SignatureBuffer,
    tupleSize = TUPLE_SIZE,
  ) {
    if (!dateCreated) {
      dateCreated = new Date();
    }

    if (dateCreated > new Date()) {
      throw new Error('Date created cannot be in the future');
    }

    const cblAddressCount = dataAddresses.length;
    if (cblAddressCount % tupleSize !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }

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
    const cblDataSize =
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
      cblDataSize,
      true, // canRead
      false, // encrypted
    );

    // Only validate signature if creator is a BrightChainMember and signature is provided
    if (creator instanceof BrightChainMember && signature) {
      if (!this.validateSignature(creator)) {
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
    const addressData = this.addressData;
    const cblBlockIds: Array<ChecksumBuffer> = [];
    let offset = 0;
    for (let i = 0; i < this.cblAddressCount; i++) {
      const cblBlockId = addressData.subarray(
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
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const handleTuples: Array<BlockHandleTuple> = [];
    const blockIds = this.getCblBlockIds();

    for (let i = 0; i < blockIds.length; i += this.tupleSize) {
      const tupleIds = blockIds.slice(i, i + this.tupleSize);
      const handles = tupleIds.map(
        (id) =>
          new BlockHandle(
            id,
            this.blockSize,
            getDiskBlockPath(id, this.blockSize),
          ),
      );
      handleTuples.push(new BlockHandleTuple(handles));
    }

    return handleTuples;
  }

  /**
   * Validate the creator's signature
   * The signature covers both the header fields and the address data
   */
  public validateSignature(creator: BrightChainMember): boolean {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }

    // Extract the same components used in makeCblHeader
    const headerMinusSignature = Buffer.concat([
      creator.id.asRawGuidBuffer,
      this.layerHeaderData.subarray(
        ConstituentBlockListBlock.HeaderOffsets.DateCreated,
        ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      ),
    ]);

    // Get the address list (same as in makeCblHeader)
    const addressList = this.addressData;

    // Create the same data to verify as was signed
    const dataToVerify = Buffer.concat([headerMinusSignature, addressList]);
    const checksum = StaticHelpersChecksum.calculateChecksum(dataToVerify);

    // Ensure 0x04 prefix for verification
    const publicKeyForVerification =
      creator.publicKey[0] === 0x04
        ? creator.publicKey
        : Buffer.concat([Buffer.from([0x04]), creator.publicKey]);

    const result = StaticHelpersECIES.verifyMessage(
      publicKeyForVerification,
      checksum,
      this.creatorSignature,
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
    // Skip the header to get just the address data
    return this.data.subarray(ConstituentBlockListBlock.CblHeaderSize);
  }

  /**
   * Get the CBL addresses
   */
  public get addresses(): Array<ChecksumBuffer> {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const addressData = this.addressData;
    const addresses: Array<ChecksumBuffer> = [];
    let offset = 0;
    for (let i = 0; i < this.cblAddressCount; i++) {
      const address = addressData.subarray(
        offset,
        offset + StaticHelpersChecksum.Sha3ChecksumBufferLength,
      ) as ChecksumBuffer;
      addresses.push(address);
      offset += StaticHelpersChecksum.Sha3ChecksumBufferLength;
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
    return this.layerHeaderData.readUInt32BE(
      ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
    );
  }

  /**
   * The length of the original data
   */
  public get originalDataLength(): bigint {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this.layerHeaderData.readBigInt64BE(
      ConstituentBlockListBlock.HeaderOffsets.OriginalDataLength,
    );
  }

  /**
   * The size of the tuples
   */
  public get tupleSize(): number {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this.layerHeaderData.readUInt8(
      ConstituentBlockListBlock.HeaderOffsets.TupleSize,
    );
  }

  /**
   * The creator signature
   * Located at the end of the header, just before the address data
   */
  public get creatorSignature(): SignatureBuffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this.layerHeaderData.subarray(
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature,
      ConstituentBlockListBlock.HeaderOffsets.CreatorSignature +
        StaticHelpersECIES.signatureLength,
    ) as SignatureBuffer;
  }

  /**
   * The creator ID
   */
  public override get creatorId(): GuidV4 {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const superCreatorId = super.creatorId;
    const ourCreatorId = new GuidV4(
      this.layerHeaderData.subarray(
        ConstituentBlockListBlock.HeaderOffsets.CreatorId,
        ConstituentBlockListBlock.HeaderOffsets.CreatorId +
          ConstituentBlockListBlock.CreatorLength,
      ) as RawGuidBuffer,
    );

    if (superCreatorId && !superCreatorId.equals(ourCreatorId)) {
      throw new Error('Creator ID mismatch between layers');
    }

    return ourCreatorId;
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
}
