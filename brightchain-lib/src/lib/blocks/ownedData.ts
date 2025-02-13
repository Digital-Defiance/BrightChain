import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ECIES } from '../constants';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { OwnedDataErrorType } from '../enumerations/ownedDataErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockAccessError } from '../errors/block';
import { OwnedDataError } from '../errors/ownedDataError';
import { GuidV4 } from '../guid';
import { ChecksumBuffer } from '../types';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';
import { BlockEncryption } from './encryption';
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
    lengthBeforeEncryption?: number,
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
    if (lengthBeforeEncryption !== undefined) {
      if (lengthBeforeEncryption <= 0) {
        throw new OwnedDataError(OwnedDataErrorType.ActualDataLengthNegative);
      }

      if (lengthBeforeEncryption > data.length) {
        throw new OwnedDataError(
          OwnedDataErrorType.ActualDataLengthExceedsDataLength,
        );
      }
    }

    const metadata: EphemeralBlockMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      dataType,
      lengthBeforeEncryption ?? data.length,
      encrypted,
      creator,
      dateCreated ?? new Date(),
    );

    // Create buffer with crypto-secure random padding
    const paddedData = Buffer.from(randomBytes(blockSize));
    // Copy actual data into the padded buffer
    data.copy(paddedData, 0, 0, metadata.lengthWithoutPadding);

    const block = new OwnedDataBlock(
      type,
      dataType,
      paddedData,
      checksum,
      metadata,
      canRead,
      canPersist,
    );

    return block;
  }

  /**
   * Creates an instance of OwnedDataBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param data - The data
   * @param checksum - The checksum of the data
   * @param metadata - The block metadata
   * @param paddedData - The padded data for XOR operations
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
    const encryptedBlock = await BlockEncryption.encrypt(creator, this);

    // Ensure we got the expected block type
    if (!(encryptedBlock instanceof EncryptedOwnedDataBlock)) {
      throw new OwnedDataError(OwnedDataErrorType.UnexpectedEncryptedBlockType);
    }

    return encryptedBlock;
  }

  /**
   * Get the full padded data buffer for XOR operations
   * @internal
   */
  protected override get paddedData(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._data;
  }

  /**
   * Whether the block can be encrypted
   * Returns true if there is enough space for encryption overhead
   */
  public override get canEncrypt(): boolean {
    return (
      (this.blockType === BlockType.OwnedDataBlock ||
        this.blockType === BlockType.ConstituentBlockList) &&
      this.metadata.lengthWithoutPadding + ECIES.OVERHEAD_SIZE <= this.blockSize
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
