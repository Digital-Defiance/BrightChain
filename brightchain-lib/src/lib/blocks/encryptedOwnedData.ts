import { BrightChainMember } from '../brightChainMember';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/encryptedBlock';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

/**
 * Encrypted blocks are always in-memory and ephemeral and should never be committed to disk
 */
export class EncryptedOwnedDataBlock
  extends EncryptedBlock
  implements IEncryptedBlock
{
  /**
   * Creates an instance of EncryptedOwnedDataBlock.
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param creator - The creator of the block
   * @param lengthBeforeEncryption - The length of the data before encryption, if known
   * @param checksum - The checksum of the data
   * @param dateCreated - The date the block was created
   */
  constructor(
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    lengthBeforeEncryption?: number,
    dateCreated?: Date,
    canRead = true,
    blockType: BlockType = BlockType.EncryptedOwnedDataBlock,
  ) {
    super(
      blockType,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      lengthBeforeEncryption,
      canRead,
    );
  }
}
