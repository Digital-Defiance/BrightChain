import { BrightChainMember } from '../brightChainMember';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/encryptedBlock';
import { ChecksumBuffer } from '../types';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';

export class EncryptedConstituentBlockListBlock
  extends EncryptedOwnedDataBlock
  implements IEncryptedBlock
{
  /**
   * Creates an instance of EncryptedConstituentBlockListBlock.
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param creator - The creator of the block
   * @param dateCreated - The date the block was created
   * @param lengthBeforeEncryption - The length of the data before encryption, if known
   */
  constructor(
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    lengthBeforeEncryption?: number,
    dateCreated?: Date,
    canRead = true,
  ) {
    super(
      blockSize,
      data,
      checksum,
      creator,
      lengthBeforeEncryption,
      dateCreated,
      canRead,
      BlockType.EncryptedConstituentBlockListBlock,
    );
  }
}
