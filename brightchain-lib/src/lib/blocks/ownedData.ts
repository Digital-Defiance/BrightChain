import { BlockService } from '../blockService';
import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
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
  constructor(
    creator: BrightChainMember | GuidV4,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
  ) {
    // Validate creator
    if (!creator) {
      throw new Error('Creator is required');
    }

    // Validate data
    if (!data || data.length === 0) {
      throw new Error('Data is required');
    }

    if (data.length > blockSize) {
      throw new Error(
        `Data length (${data.length}) exceeds block size (${blockSize})`,
      );
    }

    // Validate actual data length
    if (actualDataLength !== undefined) {
      if (actualDataLength <= 0) {
        throw new Error('Actual data length must be positive');
      }

      if (actualDataLength > data.length) {
        throw new Error('Actual data length cannot exceed data length');
      }
    }

    // Check if block has enough space for encryption
    const encryptionOverhead = StaticHelpersECIES.eciesOverheadLength;
    if (data.length + encryptionOverhead > blockSize) {
      throw new Error(
        `Data length (${data.length}) plus encryption overhead (${encryptionOverhead}) exceeds block size (${blockSize})`,
      );
    }

    super(
      BlockType.OwnedDataBlock,
      BlockDataType.EphemeralStructuredData,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
      false, // Not encrypted yet
    );
  }

  /**
   * Encrypt this block using the creator's public key
   * @param creator The member who will own the encrypted block
   * @returns A new EncryptedOwnedDataBlock
   */
  public encrypt(creator: BrightChainMember): EncryptedOwnedDataBlock {
    // Validate creator
    if (!creator) {
      throw new Error('Creator is required for encryption');
    }

    // Check if block can be encrypted
    if (!this.canEncrypt) {
      throw new Error(
        'Block cannot be encrypted, not enough space left in block',
      );
    }

    // Encrypt using BlockService
    return BlockService.encrypt(creator, this) as EncryptedOwnedDataBlock;
  }

  /**
   * Whether the block can be encrypted
   * Returns true if there is enough space for encryption overhead
   */
  public override get canEncrypt(): boolean {
    return (
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
