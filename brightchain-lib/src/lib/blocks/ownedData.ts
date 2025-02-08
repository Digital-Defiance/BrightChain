import { BlockService } from '../blockService';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { OwnedDataErrorType } from '../enumerations/ownedDataErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { OwnedDataError } from '../errors/ownedDataError';
import { GuidV4 } from '../guid';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';
import { EphemeralBlock } from './ephemeral';

/**
 * OwnedDataBlock represents a block that is owned by a specific member.
 * In the Owner Free Filesystem (OFF), ownership is established through:
 * 1. The creator field identifying the owner
 * 2. The block being encrypted with the owner's public key
 * 3. The block being XORed with random data for privacy
 *
 * This class represents the unencrypted form of owned data.
 * Use encrypt() to convert to an EncryptedOwnedDataBlock.
 */
export class OwnedDataBlock extends EphemeralBlock {
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    encrypted = false,
    canPersist = true,
  ): Promise<OwnedDataBlock> {
    // Validate creator
    if (!creator) {
      throw new OwnedDataError(OwnedDataErrorType.CreatorRequired);
    }

    // Validate data
    if (!data || data.length === 0) {
      throw new OwnedDataError(OwnedDataErrorType.DataRequired);
    }

    if (data.length > blockSize) {
      throw new OwnedDataError(OwnedDataErrorType.DataLengthExceedsCapacity);
    }

    // Validate actual data length
    if (actualDataLength !== undefined) {
      if (actualDataLength <= 0) {
        throw new OwnedDataError(OwnedDataErrorType.ActualDataLengthNegative);
      }

      if (actualDataLength > data.length) {
        throw new OwnedDataError(
          OwnedDataErrorType.ActualDataLengthExceedsDataLength,
        );
      }
    }

    // Check if block has enough space for encryption
    const encryptionOverhead = StaticHelpersECIES.eciesOverheadLength;
    if (data.length + encryptionOverhead > blockSize) {
      throw new OwnedDataError(OwnedDataErrorType.DataLengthExceedsCapacity);
    }

    const metadata: EphemeralBlockMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EphemeralStructuredData,
      actualDataLength ?? data.length,
      encrypted,
      creator,
      dateCreated ?? new Date(),
    );

    return new OwnedDataBlock(
      type,
      dataType,
      data,
      checksum,
      metadata,
      canRead,
      canPersist,
    );
  }

  /**
   * Creates an instance of OwnedDataBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param data - The data
   * @param checksum - The checksum of the data
   * @param dateCreated - The date the block was created
   * @param metadata - The block metadata
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   */
  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EphemeralBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    super(type, dataType, data, checksum, metadata, canRead, canPersist);
  }

  /**
   * Encrypt this block using the creator's public key
   * @param creator The member who will own the encrypted block
   * @returns A new EncryptedOwnedDataBlock
   */
  public async encrypt(
    creator: BrightChainMember,
  ): Promise<EncryptedOwnedDataBlock> {
    // Validate creator
    if (!creator) {
      throw new OwnedDataError(OwnedDataErrorType.CreatorRequiredForEncryption);
    }

    // Check if block can be encrypted
    if (!this.canEncrypt) {
      throw new OwnedDataError(OwnedDataErrorType.DataLengthExceedsCapacity);
    }

    // Encrypt using BlockService
    const encryptedBlock = await BlockService.encrypt(creator, this);

    // Ensure we got the expected block type
    if (!(encryptedBlock instanceof EncryptedOwnedDataBlock)) {
      throw new OwnedDataError(OwnedDataErrorType.UnexpectedEncryptedBlockType);
    }

    return encryptedBlock;
  }

  /**
   * Whether the block can be encrypted
   * Returns true if there is enough space for encryption overhead
   */
  public override get canEncrypt(): boolean {
    return (
      (this.blockType === BlockType.OwnedDataBlock ||
        this.blockType === BlockType.ConstituentBlockList) &&
      this.data.length + StaticHelpersECIES.eciesOverheadLength <=
        this.blockSize
    );
  }

  /**
   * Whether the block can be decrypted
   * Always returns false since this block is not encrypted
   */
  public override get canDecrypt(): boolean {
    return false;
  }

  /**
   * Whether the block can be signed
   * Returns true if the creator is a BrightChainMember
   */
  public override get canSign(): boolean {
    return this.creator instanceof BrightChainMember;
  }
}
