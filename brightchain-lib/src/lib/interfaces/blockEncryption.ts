import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockType } from '../enumerations/blockType';
import { ChecksumBuffer } from '../types';

/**
 * Interface for encrypted block creation to avoid circular dependencies
 */
export interface IEncryptedBlockCreator {
  from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: number,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<any>;
}
