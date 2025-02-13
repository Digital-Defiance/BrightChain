import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ChecksumBuffer } from '../types';
import { EncryptedConstituentBlockListBlock } from './encryptedCbl';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';

/**
 * Interface for block creation functions
 */
export type BlockCreatorFunction = (
  type: BlockType,
  dataType: BlockDataType,
  blockSize: BlockSize,
  data: Buffer,
  checksum: ChecksumBuffer,
  creator?: BrightChainMember,
  dateCreated?: Date,
  lengthBeforeEncryption?: number,
) => Promise<EncryptedOwnedDataBlock | EncryptedConstituentBlockListBlock>;

/**
 * Block creator registry to avoid circular dependencies
 */
export class BlockCreator {
  private static creators = new Map<BlockType, BlockCreatorFunction>();

  public static register(type: BlockType, creator: BlockCreatorFunction): void {
    this.creators.set(type, creator);
  }

  public static async create(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<EncryptedOwnedDataBlock | EncryptedConstituentBlockListBlock> {
    const blockCreator = this.creators.get(type);
    if (!blockCreator) {
      throw new Error(`No creator registered for block type ${type}`);
    }
    return blockCreator(
      type,
      dataType,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      lengthBeforeEncryption,
    );
  }
}
