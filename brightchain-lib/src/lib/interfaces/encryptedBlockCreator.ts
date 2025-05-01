import { BrightChainMember } from '../brightChainMember';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import { ChecksumBuffer } from '../types';
import { IEncryptedBlock } from './blocks/encrypted';

/**
 * Interface for encrypted block creation to avoid circular dependencies
 */
export interface IEncryptedBlockCreator {
  from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
  ): Promise<IEncryptedBlock>;
}
