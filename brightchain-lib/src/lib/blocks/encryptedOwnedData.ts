import { BrightChainMember } from '../brightChainMember';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

/**
 * EncryptedOwnedDataBlock represents an encrypted block owned by a specific member.
 * These blocks are always in-memory and ephemeral and should never be committed to disk.
 *
 * Block Structure:
 * [Base Headers][Encryption Header][Encrypted Payload][Padding]
 *
 * Where:
 * - Base Headers: Headers from parent classes
 * - Encryption Header: [Ephemeral Public Key][IV][Auth Tag]
 * - Encrypted Payload: Original data encrypted with ECIES
 * - Padding: Random data to fill block size
 */
export class EncryptedOwnedDataBlock extends EncryptedBlock {
  /**
   * Creates an instance of EncryptedOwnedDataBlock.
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param creator - The creator/owner of the block
   * @param lengthBeforeEncryption - The length of the data before encryption
   * @param dateCreated - The date the block was created
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   * @param blockType - The type of the block (defaults to EncryptedOwnedDataBlock)
   */
  constructor(
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    lengthBeforeEncryption?: number,
    dateCreated?: Date,
    canRead = true,
    canPersist = true,
    blockType: BlockType = BlockType.EncryptedOwnedDataBlock,
  ) {
    // Validate data exists
    if (!data || data.length === 0) {
      throw new Error('Data is required');
    }

    // Validate length before encryption
    if (lengthBeforeEncryption !== undefined) {
      if (lengthBeforeEncryption <= 0) {
        throw new Error('Length before encryption must be positive');
      }

      const minLength =
        lengthBeforeEncryption + StaticHelpersECIES.eciesOverheadLength;
      if (data.length < minLength) {
        throw new Error(
          `Data length (${data.length}) too small for encrypted data of length ${lengthBeforeEncryption}`,
        );
      }

      // Let parent class handle max size validation
    }

    super(
      blockType,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      lengthBeforeEncryption,
      canRead,
      canPersist,
    );
  }

  /**
   * Whether the block can be encrypted
   * Always returns false since this block is already encrypted
   */
  public override get canEncrypt(): boolean {
    return false;
  }

  /**
   * Whether the block can be decrypted
   * Returns true if the block has a BrightChainMember creator
   * (GuidV4 creators cannot decrypt since they don't have private keys)
   */
  public override get canDecrypt(): boolean {
    return this.creator instanceof BrightChainMember;
  }

  /**
   * Whether the block can be signed
   * Returns true if the block has any creator
   * Both BrightChainMember and GuidV4 creators can sign
   */
  public override get canSign(): boolean {
    return this.creator !== undefined;
  }
}
