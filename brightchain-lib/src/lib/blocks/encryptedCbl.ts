import { BrightChainMember } from '../brightChainMember';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';

/**
 * EncryptedConstituentBlockListBlock represents an encrypted version of a ConstituentBlockListBlock.
 * It contains a list of block IDs that make up a larger file or data structure.
 *
 * Block Structure:
 * [Base Headers][Encryption Header][Encrypted CBL Data][Padding]
 *
 * Where:
 * - Base Headers: Headers from parent classes
 * - Encryption Header: [Ephemeral Public Key][IV][Auth Tag]
 * - Encrypted CBL Data: Encrypted form of:
 *   - CBL Header: [Creator ID][Date Created][Address Count][Original Length][Tuple Size][Creator Signature]
 *   - CBL Addresses: Array of block checksums
 * - Padding: Random data to fill block size
 */
export class EncryptedConstituentBlockListBlock extends EncryptedOwnedDataBlock {
  /**
   * Creates an instance of EncryptedConstituentBlockListBlock.
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param creator - The creator of the block
   * @param lengthBeforeEncryption - The length of the data before encryption
   * @param dateCreated - The date the block was created
   */
  constructor(
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    lengthBeforeEncryption?: number,
    dateCreated?: Date,
  ) {
    // Store parameters for validation
    const finalData = data;
    const finalChecksum = checksum;
    const finalCreator = creator;
    const finalLength = lengthBeforeEncryption;

    // Validate date first, before any other validation
    const now = new Date();
    const finalDate = dateCreated ?? now;
    if (isNaN(finalDate.getTime())) {
      throw new Error('Invalid date created');
    }
    if (finalDate > now) {
      throw new Error('Date created cannot be in the future');
    }

    // For encrypted CBL blocks, we need to validate:
    // 1. The minimum data size includes both CBL header and encryption overhead
    // 2. The actual data length fits within the block's capacity
    // 3. The length before encryption matches the CBL header size requirements

    // Calculate available capacity for addresses
    const capacity = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      blockSize,
      true, // allow encryption
    );

    // Calculate minimum and maximum data sizes
    const minDataSize =
      ConstituentBlockListBlock.CblHeaderSize +
      StaticHelpersECIES.eciesOverheadLength;
    const maxDataSize = blockSize as number;

    // Validate data size constraints
    if (finalData.length < minDataSize) {
      throw new Error('Data too short for encrypted CBL');
    }
    if (finalData.length > maxDataSize) {
      throw new Error('Data length exceeds block capacity');
    }

    // Validate length before encryption
    if (finalLength !== undefined) {
      // Must be at least the CBL header size
      if (finalLength < ConstituentBlockListBlock.CblHeaderSize) {
        throw new Error(
          `Length before encryption (${finalLength}) too small for CBL header (${ConstituentBlockListBlock.CblHeaderSize})`,
        );
      }

      // Calculate maximum unencrypted length
      const maxUnencryptedLength =
        capacity * StaticHelpersChecksum.Sha3ChecksumBufferLength +
        ConstituentBlockListBlock.CblHeaderSize;

      // Must fit within available capacity
      if (finalLength > maxUnencryptedLength) {
        throw new Error('Data length exceeds block capacity');
      }
    }

    // For encrypted CBL blocks, we want them to be both readable and persistable
    super(
      blockSize,
      finalData,
      finalChecksum,
      finalCreator,
      finalLength,
      dateCreated,
      true, // Always readable
      true, // Always persistable
      BlockType.EncryptedConstituentBlockListBlock,
    );
  }

  /**
   * Create an encrypted CBL block from a plaintext CBL block
   */
  public static fromCbl(
    cbl: ConstituentBlockListBlock,
    encryptor: BrightChainMember,
  ): EncryptedConstituentBlockListBlock {
    if (!cbl.canEncrypt) {
      throw new Error('CBL block cannot be encrypted');
    }

    if (!encryptor) {
      throw new Error('Encryptor is required');
    }

    // Encrypt the CBL data
    const encryptedData = StaticHelpersECIES.encrypt(
      encryptor.publicKey,
      cbl.data,
    );

    // The creator of the encrypted block should be the same as the original block
    // This maintains the ownership chain and allows for signature validation
    if (!cbl.creator && !cbl.creatorId) {
      throw new Error('Original block must have a creator');
    }

    // Use the original block's date
    const blockDate = cbl.dateCreated;

    return new EncryptedConstituentBlockListBlock(
      cbl.blockSize,
      encryptedData,
      undefined, // Let constructor calculate checksum
      encryptor, // Use encryptor as creator since they're encrypting the data
      cbl.data.length,
      blockDate,
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
   * Returns true since encrypted blocks can always be decrypted
   * with the appropriate private key
   */
  public override get canDecrypt(): boolean {
    return true;
  }

  /**
   * Whether the block can be signed
   * Returns true if the block has a creator
   */
  public override get canSign(): boolean {
    return this.creator !== undefined;
  }
}
