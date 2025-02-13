import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

/**
 * Interface for block creation functions
 */
export type BlockCreatorFunction = (
  type: BlockType,
  dataType: BlockDataType,
  blockSize: BlockSize,
  data: Buffer,
  checksum: ChecksumBuffer,
  creator: BrightChainMember,
  dateCreated?: Date,
  lengthBeforeEncryption?: number,
) => Promise<EncryptedBlock>;

/**
 * Block creator registry to avoid circular dependencies
 */
export class EncryptedBlockCreator {
  private static creators = new Map<BlockType, BlockCreatorFunction>();

  public static register(type: BlockType, creator: BlockCreatorFunction): void {
    EncryptedBlockCreator.creators.set(type, creator);
  }

  public static async create(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<EncryptedBlock> {
    const blockCreator = EncryptedBlockCreator.creators.get(type);
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
